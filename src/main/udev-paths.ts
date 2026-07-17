import { app } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';

// The RPM installs a mirror of resources/udev/ (both helper scripts and the rule
// file) to this fixed, package-owned path so PolicyKit can match the invoked
// script by exact path (see packaging/*.policy) and show a tailored
// authentication prompt instead of falling back to a generic one. Prefer it
// when present.
const INSTALLED_UDEV_DIR = '/usr/libexec/lgl-keychron-helper';

// pkexec spawns udev helper scripts as real OS processes, which can't read a path
// "inside" app.asar the way Electron's own patched fs/net APIs can — app.asar is a
// single opaque file to everything else. scripts/package.mjs unpacks resources/udev/
// to app.asar.unpacked/resources/udev/ for exactly this reason; this resolves to
// that unpacked copy when running packaged, or to the plain resources/udev/
// directory when running from source (no asar involved). Neither case has
// INSTALLED_UDEV_DIR, so they fall through to this app-relative resolution.
export function resolveUdevDir(): string {
  if (existsSync(INSTALLED_UDEV_DIR)) {
    return INSTALLED_UDEV_DIR;
  }

  const appPath = app.getAppPath();
  const root = appPath.endsWith('.asar')
    ? path.join(path.dirname(appPath), 'app.asar.unpacked')
    : appPath;
  return path.join(root, 'resources', 'udev');
}
