import { BrowserWindow, type Session } from 'electron';
import { confirmDeviceConnection } from './device-confirm-window.js';
import {
  findMatchingHidrawNodes,
  findVendorHidrawNodes,
  hasHidrawAccess,
} from './hid-device-access.js';
import { showPermissionSetupWindow } from './permission-setup-window.js';

// Keychron's USB vendor ID, confirmed via `lsusb` against a physical Keychron M7 8K
// (3434:d056). Deliberately vendor-only (not scoped to one product ID) so any
// Keychron HID device works, not just the M7 8K. Requires a udev rule granting HID
// device access — see resources/udev/71-keychron-hid.rules.
const KEYCHRON_VENDOR_ID = 0x3434;

export function registerHidPermissions(launcherSession: Session): void {
  launcherSession.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();

    const device = details.deviceList.find((candidate) => candidate.vendorId === KEYCHRON_VENDOR_ID);

    if (!device) {
      callback(undefined);
      return;
    }

    void handleDeviceSelection(device, callback);
  });

  launcherSession.setDevicePermissionHandler((details) => {
    return details.deviceType === 'hid' && details.device.vendorId === KEYCHRON_VENDOR_ID;
  });

  launcherSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'hid';
  });

  // HID access is granted separately through select-hid-device / setDevicePermissionHandler
  // above; this handler covers prompt-style permissions (camera, geolocation, notifications,
  // etc.), none of which Launcher needs, so deny everything requested through it.
  launcherSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

async function handleDeviceSelection(
  device: Electron.HIDDevice,
  callback: (deviceId?: string) => void,
): Promise<void> {
  const parent = BrowserWindow.getFocusedWindow();

  let nodes = findMatchingHidrawNodes(device.vendorId, device.productId);

  if (!hasHidrawAccess(nodes)) {
    const installed = await showPermissionSetupWindow(parent);
    if (!installed) {
      callback(undefined);
      return;
    }

    // The rule may not apply to the currently attached device until it's replugged.
    // Re-check rather than assume; if still inaccessible, stop here rather than let
    // Launcher hang on an open() call that will just fail again.
    nodes = findMatchingHidrawNodes(device.vendorId, device.productId);
    if (!hasHidrawAccess(nodes)) {
      callback(undefined);
      return;
    }
  }

  const confirmed = await confirmDeviceConnection(parent, device.name);
  callback(confirmed ? device.deviceId : undefined);
}

// Proactively checks any currently-connected Keychron device's hidraw access and
// offers to fix it if needed, independent of select-hid-device. That event only
// fires for a *fresh* permission request — once Launcher already holds a stored
// WebHID grant for a device (persisted in the persist:launcher session across
// restarts), it silently tries to reopen the device directly on future loads
// without ever asking again. If the underlying udev permission is missing at that
// point, select-hid-device never fires and the connect flow's permission check
// never runs. Call this once the Launcher page has loaded, before the user gets
// to interact with its device chooser at all.
export async function ensureKeychronDevicePermissions(parent: BrowserWindow | null): Promise<void> {
  const nodes = findVendorHidrawNodes(KEYCHRON_VENDOR_ID);
  if (nodes.length === 0) {
    // Nothing connected yet — nothing to check. select-hid-device's own check
    // still covers the case of a device plugged in after this point.
    return;
  }

  if (hasHidrawAccess(nodes)) {
    return;
  }

  await showPermissionSetupWindow(parent);
}
