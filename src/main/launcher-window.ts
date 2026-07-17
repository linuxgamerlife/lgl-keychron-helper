import { app, BrowserWindow, type Session } from 'electron';
import path from 'node:path';

export const LAUNCHER_URL = 'https://launcher.keychron.com/';

export function createLauncherWindow(launcherSession: Session): BrowserWindow {
  const window = new BrowserWindow({
    width: 1300,
    height: 946,
    minWidth: 1300,
    minHeight: 946,
    title: 'LGL Keychron Helper',
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
    webPreferences: {
      session: launcherSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
  });

  void window.loadURL(LAUNCHER_URL);

  return window;
}
