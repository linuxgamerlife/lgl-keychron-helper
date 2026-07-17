import { app, BrowserWindow, session } from 'electron';
import { createLauncherWindow } from './launcher-window.js';
import { ensureKeychronDevicePermissions, registerHidPermissions } from './hid-permissions.js';
import { registerNavigationPolicy } from './navigation-policy.js';
import { registerDownloadPolicy } from './download-policy.js';
import { registerApplicationMenu } from './app-menu.js';

// Ask the Wayland compositor (KWin) to draw the window border/titlebar itself so it
// matches the host theme, instead of Chromium's default unthemed client-side decoration.
// Must be set before the app is ready.
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');

const LAUNCHER_PARTITION = 'persist:launcher';

function openLauncherWindow(): void {
  const launcherSession = session.fromPartition(LAUNCHER_PARTITION);
  registerHidPermissions(launcherSession);
  registerDownloadPolicy(launcherSession);

  const window = createLauncherWindow(launcherSession);
  registerNavigationPolicy(window);

  window.webContents.once('did-finish-load', () => {
    void ensureKeychronDevicePermissions(window);
  });
}

app.whenReady().then(() => {
  registerApplicationMenu();
  openLauncherWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openLauncherWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
