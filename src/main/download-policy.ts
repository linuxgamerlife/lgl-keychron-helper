import type { Session } from 'electron';

// Electron's default behaviour with no will-download listener at all is to save
// downloads silently to the OS default Downloads folder — no prompt, no visible
// indication anything happened, unlike a normal browser's download tray. This
// restores that visibility rather than blocking downloads outright: if Launcher
// ever has a legitimate download (e.g. exporting a keymap/profile), it still
// works, just via a save dialog instead of landing unnoticed on disk.
export function registerDownloadPolicy(launcherSession: Session): void {
  launcherSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({
      defaultPath: item.getFilename(),
    });
  });
}
