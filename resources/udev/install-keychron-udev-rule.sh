#!/usr/bin/env bash
set -euo pipefail

# Installs the LGL Keychron Helper udev rule and reloads udev so it takes effect.
#
# This script accepts no arguments and performs no arbitrary operations: the
# source and destination paths are both fixed. It is invoked via `pkexec`
# from LGL Keychron Helper's main process only, when the app detects that
# the rule is missing or the current user lacks HID device access.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_RULE="${SCRIPT_DIR}/71-keychron-hid.rules"
DEST_RULE="/etc/udev/rules.d/71-keychron-hid.rules"

if [[ ! -f "${SOURCE_RULE}" ]]; then
  echo "Source udev rule not found: ${SOURCE_RULE}" >&2
  exit 1
fi

install -m 0644 "${SOURCE_RULE}" "${DEST_RULE}"
udevadm control --reload
udevadm trigger --subsystem-match=hidraw

echo "Installed ${DEST_RULE} and reloaded udev rules."
