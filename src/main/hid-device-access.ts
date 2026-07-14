import { accessSync, constants, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const HIDRAW_CLASS_DIR = '/sys/class/hidraw';

interface HidrawEntry {
  node: string;
  vendorId: number;
  productId: number;
}

// Reads every hidraw device's sysfs uevent file directly, rather than relying on
// Chromium's WebHID enumeration (which only reports what it can see, not what it
// can open, and doesn't fire at all when Launcher silently reconnects to a device
// it already holds a stored WebHID permission grant for).
function listHidrawEntries(): HidrawEntry[] {
  let entries: string[];
  try {
    entries = readdirSync(HIDRAW_CLASS_DIR);
  } catch {
    return [];
  }

  const result: HidrawEntry[] = [];
  for (const entry of entries) {
    const ueventPath = path.join(HIDRAW_CLASS_DIR, entry, 'device', 'uevent');
    let contents: string;
    try {
      contents = readFileSync(ueventPath, 'utf8');
    } catch {
      continue;
    }

    const idLine = contents.split('\n').find((line) => line.startsWith('HID_ID='));
    if (!idLine) continue;

    const parts = idLine.slice('HID_ID='.length).split(':');
    if (parts.length !== 3) continue;

    const vendorId = Number.parseInt(parts[1], 16);
    const productId = Number.parseInt(parts[2], 16);
    result.push({ node: path.join('/dev', entry), vendorId, productId });
  }

  return result;
}

// Finds the /dev/hidrawN nodes for one exact vendor/product ID.
export function findMatchingHidrawNodes(vendorId: number, productId: number): string[] {
  return listHidrawEntries()
    .filter((entry) => entry.vendorId === vendorId && entry.productId === productId)
    .map((entry) => entry.node);
}

// Finds the /dev/hidrawN nodes for any device matching a vendor ID, regardless of
// product ID — used to proactively check permissions for whatever Keychron device
// is currently connected, before any WebHID request has been made for it.
export function findVendorHidrawNodes(vendorId: number): string[] {
  return listHidrawEntries()
    .filter((entry) => entry.vendorId === vendorId)
    .map((entry) => entry.node);
}

// True only if every matching node exists and is readable/writable by this process.
// An empty node list (device not found at all) is treated as inaccessible.
export function hasHidrawAccess(nodes: string[]): boolean {
  if (nodes.length === 0) return false;
  return nodes.every((node) => {
    try {
      accessSync(node, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  });
}
