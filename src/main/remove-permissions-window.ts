import { app, BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveUdevDir } from './udev-paths.js';

const RULE_PATH_ON_DISK = '/etc/udev/rules.d/71-keychron-hid.rules';

// Reachable from File > Remove Device Permissions. Mirrors permission-setup-window.ts's
// structure (same window shape, hash-navigation, and View Script pattern) but for
// removing resources/udev/71-keychron-hid.rules via the fixed-operation privileged
// helper at resources/udev/remove-keychron-udev-rule.sh, invoked through pkexec.
export function showRemovePermissionsWindow(parent: BrowserWindow | null): void {
  const removeWindow = new BrowserWindow({
    width: 440,
    height: 540,
    minWidth: 440,
    minHeight: 460,
    resizable: true,
    minimizable: false,
    maximizable: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: 'Remove Device Permissions',
    parent: parent ?? undefined,
    modal: parent !== null,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const udevDir = resolveUdevDir();
  const helperPath = path.join(udevDir, 'remove-keychron-udev-rule.sh');

  const fallback = [
    `sudo rm -f ${RULE_PATH_ON_DISK}`,
    'sudo udevadm control --reload',
    'sudo udevadm trigger',
  ].join('\n');

  // Read once up front so "View Removal Script" can show it immediately, same as
  // the install popup. Passed via the loaded file's query string, not IPC — this
  // app exposes no preload/contextBridge to any window.
  let scriptContents: string;
  try {
    scriptContents = readFileSync(helperPath, 'utf-8');
  } catch (err) {
    scriptContents = `Could not read removal script: ${(err as Error).message}`;
  }

  const htmlPath = path.join(
    app.getAppPath(),
    'resources',
    'remove-permissions',
    'remove-permissions.html',
  );
  void removeWindow.loadFile(htmlPath, { query: { script: scriptContents } });

  removeWindow.webContents.on('did-navigate-in-page', (_event, url) => {
    const hash = new URL(url).hash;
    if (hash === '#remove') {
      void runRemoveHelper(removeWindow);
    } else if ((hash === '#cancel' || hash === '#close') && !removeWindow.isDestroyed()) {
      removeWindow.close();
    }
  });

  removeWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && !removeWindow.isDestroyed()) {
      removeWindow.close();
    }
  });

  async function runRemoveHelper(target: BrowserWindow): Promise<void> {
    if (target.isDestroyed()) return;
    await target.webContents.executeJavaScript('showState("removing")');

    console.log('[remove-permissions] requesting udev rule removal via pkexec:', helperPath);

    execFile('pkexec', [helperPath], (error, stdout, stderr) => {
      if (target.isDestroyed()) return;

      if (error) {
        console.error('[remove-permissions] removal failed:', error.message, stderr?.trim());
        const message = JSON.stringify(
          stderr?.toString().trim() || error.message || 'Unknown error',
        );
        void target.webContents.executeJavaScript(
          `showError(${message}, ${JSON.stringify(fallback)})`,
        );
        return;
      }

      console.log('[remove-permissions] removal succeeded:', stdout?.trim());
      void target.webContents.executeJavaScript('showState("removed")');
    });
  }
}
