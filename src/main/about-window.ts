import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';

let aboutWindow: BrowserWindow | null = null;

export function showAboutWindow(parent: BrowserWindow | null): void {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 360,
    height: 490,
    minWidth: 360,
    minHeight: 440,
    resizable: true,
    minimizable: false,
    maximizable: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: 'About LGL Keychron Helper',
    icon: path.join(app.getAppPath(), 'resources', 'icon.png'),
    parent: parent ?? undefined,
    modal: parent !== null,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const aboutPath = path.join(app.getAppPath(), 'resources', 'about', 'about.html');
  void aboutWindow.loadFile(aboutPath, { query: { version: app.getVersion() } });

  // Both the GitHub and Ko-fi links are ordinary target="_blank" anchors, so they both
  // flow through this same handler — keeping their open-in-browser behavior consistent,
  // unlike the native About panel's built-in website button.
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  aboutWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  aboutWindow.webContents.on('did-navigate-in-page', (_event, url) => {
    if (new URL(url).hash === '#close') {
      aboutWindow?.close();
    }
  });

  aboutWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      aboutWindow?.close();
    }
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}
