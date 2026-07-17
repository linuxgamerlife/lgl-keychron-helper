import { app, BrowserWindow } from 'electron';
import path from 'node:path';

// Asks the user to explicitly approve granting WebHID access to a specific device,
// rather than auto-connecting the first match. Resolves true if the user clicks
// Connect, false if they cancel, press Escape, or close the window.
export function confirmDeviceConnection(
  parent: BrowserWindow | null,
  deviceName: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(result);
      if (!confirmWindow.isDestroyed()) {
        confirmWindow.close();
      }
    };

    const confirmWindow = new BrowserWindow({
      width: 380,
      height: 300,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      title: 'Connect Device',
      icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
      parent: parent ?? undefined,
      modal: parent !== null,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    const confirmPath = path.join(app.getAppPath(), 'resources', 'device-confirm', 'confirm.html');
    void confirmWindow.loadFile(confirmPath, { query: { name: deviceName } });

    confirmWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      const hash = new URL(url).hash;
      if (hash === '#connect') {
        settle(true);
      } else if (hash === '#cancel') {
        settle(false);
      }
    });

    confirmWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        settle(false);
      }
    });

    confirmWindow.on('closed', () => {
      settle(false);
    });
  });
}
