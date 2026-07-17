import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { showAboutWindow } from './about-window.js';
import { showRemovePermissionsWindow } from './remove-permissions-window.js';

export function registerApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Remove Device Permissions…',
          click: () => showRemovePermissionsWindow(BrowserWindow.getFocusedWindow()),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            const navigationHistory = BrowserWindow.getFocusedWindow()?.webContents.navigationHistory;
            if (navigationHistory?.canGoBack()) {
              navigationHistory.goBack();
            }
          },
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            const navigationHistory = BrowserWindow.getFocusedWindow()?.webContents.navigationHistory;
            if (navigationHistory?.canGoForward()) {
              navigationHistory.goForward();
            }
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LGL Keychron Helper',
          click: () => showAboutWindow(BrowserWindow.getFocusedWindow()),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
