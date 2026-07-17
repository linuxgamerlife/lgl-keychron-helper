import { app, BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveUdevDir } from './udev-paths.js';

// Guides the user through installing resources/udev/71-keychron-hid.rules via a
// narrow, fixed-operation privileged helper invoked through pkexec. The helper
// script takes no arguments and performs no arbitrary operations — see
// resources/udev/install-keychron-udev-rule.sh.
//
// Resolves true if the install succeeded, false if the user cancelled or it failed.
export function showPermissionSetupWindow(parent: BrowserWindow | null): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(result);
      if (!setupWindow.isDestroyed()) {
        setupWindow.close();
      }
    };

    const setupWindow = new BrowserWindow({
      width: 440,
      height: 540,
      minWidth: 440,
      minHeight: 460,
      resizable: true,
      minimizable: false,
      maximizable: true,
      fullscreenable: false,
      autoHideMenuBar: true,
      title: 'Device Permission Required',
      icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
      parent: parent ?? undefined,
      modal: parent !== null,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    const udevDir = resolveUdevDir();
    const helperPath = path.join(udevDir, 'install-keychron-udev-rule.sh');
    const rulePath = path.join(udevDir, '71-keychron-hid.rules');

    // Read once up front so the "View Install Script" button can show it immediately,
    // without waiting for the user to click Install first. Passed via the loaded
    // file's query string, not IPC — this app exposes no preload/contextBridge to
    // any window, so a plain URL param is how the main process hands data to a
    // trusted local screen.
    let scriptContents: string;
    try {
      scriptContents = readFileSync(helperPath, 'utf-8');
    } catch (err) {
      scriptContents = `Could not read install script: ${(err as Error).message}`;
    }

    const htmlPath = path.join(
      app.getAppPath(),
      'resources',
      'permission-setup',
      'permission-setup.html',
    );
    void setupWindow.loadFile(htmlPath, { query: { script: scriptContents } });

    setupWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      const hash = new URL(url).hash;
      if (hash === '#install') {
        void runInstallHelper(setupWindow);
      } else if (hash === '#cancel') {
        settle(false);
      } else if (hash === '#close') {
        settle(true);
      }
    });

    setupWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        settle(false);
      }
    });

    setupWindow.on('closed', () => {
      settle(false);
    });

    async function runInstallHelper(target: BrowserWindow): Promise<void> {
      if (target.isDestroyed()) return;
      await target.webContents.executeJavaScript('showState("installing")');

      console.log('[permission-setup] requesting udev rule install via pkexec:', helperPath);

      execFile('pkexec', [helperPath], (error, stdout, stderr) => {
        if (target.isDestroyed()) return;

        if (error) {
          // Covers every failure case uniformly (missing polkit auth agent, user
          // cancelling authentication, the helper itself failing, etc.) rather than
          // trying to distinguish them — whatever the cause, the same manual fallback
          // commands unblock the user instead of leaving them at a dead end.
          console.error('[permission-setup] install failed:', error.message, stderr?.trim());
          const message = JSON.stringify(
            stderr?.toString().trim() || error.message || 'Unknown error',
          );
          void target.webContents.executeJavaScript(
            `showError(${message}, ${JSON.stringify(rulePath)})`,
          );
          return;
        }

        console.log('[permission-setup] install succeeded:', stdout?.trim());
        void target.webContents.executeJavaScript('showState("success")');
      });
    }
  });
}
