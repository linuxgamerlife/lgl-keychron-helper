# Changelog

All notable changes to LGL Keychron Helper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-17

### Added

- `npm run package` (`scripts/package.mjs`, using `@electron/packager`'s JS API) produces a standalone, runnable Linux bundle in `./out`: no npm/Node install needed to run it afterward. Excludes TypeScript sources, docs, and dev-only files; only compiled `dist/main` and `resources/` ship. The packaged binary is named `lgl-keychron-helper` rather than "LGL Keychron Helper": Electron Packager rejects names ending in a *space* followed by "Helper" (a macOS-only naming collision with Electron's own internal helper processes) even when targeting Linux; a hyphen avoids that restriction. This only affects the packaged executable's filename, not the app's displayed name anywhere else.
- Trademark/non-endorsement disclaimer added to the About popup (`resources/about/about.html`), matching the language already in `README.md`'s "Project Status and Affiliation" section: Keychron and Keychron Launcher are trademarks of Keychron Inc., and this project is independent and not affiliated with or endorsed by Keychron. Relevant now that the app is intended for public distribution via COPR.
- Origin validation on all three HID permission handlers (`src/main/hid-permissions.ts`): `select-hid-device`, `setDevicePermissionHandler`, and `setPermissionCheckHandler` now check the requesting origin against `ALLOWED_LAUNCHER_ORIGIN` (new `src/main/allowed-origin.ts`, shared with `navigation-policy.ts`) alongside the existing vendor-ID check. Closes the top-priority known security gap from the previous release.
- Download interception (`src/main/download-policy.ts`): every download is now routed through the native save dialog instead of saving silently to the default Downloads folder, closing the other previously-known gap. Chosen over blocking downloads outright, since Launcher's own download behavior (if any) wasn't verified and shouldn't be assumed safe to break.
- A **Remove Device Permissions** popup (`src/main/remove-permissions-window.ts`, `resources/remove-permissions/remove-permissions.html`, File menu), mirroring the install popup's structure exactly: same window shape, hash-navigation, and an embedded "View Removal Script" toggle showing `resources/udev/remove-keychron-udev-rule.sh` in place, before running it. New `resources/udev/remove-keychron-udev-rule.sh` performs the fixed removal operation via `pkexec`, matching the install script's no-arguments, single-fixed-operation pattern.
- A "View Install Script" toggle on the existing permission-setup popup, showing `install-keychron-udev-rule.sh`'s contents in a scrollable, selectable, monospace panel before the user authenticates.
- A real app icon: `resources/icon.png` (generated from `resources/lgl-keychron-helper.png`), wired into every `BrowserWindow` via `icon:`.
- A Close button on the About popup (previously only closable via Escape or the window manager's own controls).
- Full Fedora RPM packaging: `packaging/lgl-keychron-helper.spec`, `packaging/lgl-keychron-helper.desktop`, `packaging/com.linuxgamerlife.lgl-keychron-helper.policy` (two PolicyKit actions, one per helper script, matched by fixed install path so authentication prompts show a tailored description instead of a generic one), and a full `packaging/icons/hicolor/` set (9 sizes). Bundles Electron itself (Fedora has no official system Electron package). Built and verified with `rpmbuild`/`dnf install` inside a Fedora 44 Distrobox: correct file layout, `desktop-file-validate` clean, `rpm -V` clean after fixing two real bugs the first build surfaced — RPM's automatic debuginfo/GDB-index generation crashing on Electron's prebuilt binaries (fixed with `%global debug_package %{nil}`), and `@electron/packager`'s output directory carrying `0700` permissions that `cp -a` silently preserved into the buildroot, which would have blocked every non-root user from running the installed app (fixed with an explicit `chmod -R a+rX`).

### Removed

- `react`, `react-dom`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, and `vitest` removed from `package.json`. These were pre-staged during initial planning for a React-based device chooser and Advanced diagnostics UI that turned out not to be needed: Launcher already has its own device-switching UI, and the local screens that do exist (About, device-confirm, permission-setup) are small, static, and better served by plain HTML/JS with no build step than by a framework. Zero React code was ever written; this is dependency cleanup, not a behavior change. See the architecture amendment in `lgl-keychron-helper_projectplan.md`.
- `README.md`'s "Planned Features" table removed: it had gone stale (listing already-completed items like guided device permissions as merely "planned") and fully duplicated the "Current Status" checklist, which tracks done-vs-not-done accurately. The `[!IMPORTANT]` "not yet a working configurator" callout was also stale, replaced with an accurate description of what currently works versus what's still in progress.
- Advanced diagnostics dropped from scope entirely (`lgl-keychron-helper_projectplan.md` Phase 5, amended, kept for historical record). The guided permission popup already surfaces the one diagnostic that actually matters (missing `hidraw` access) at the moment it's relevant; a separate diagnostics screen isn't needed.
- `README.md`'s "Development" section (build/run instructions) removed to keep the README focused on end users rather than contributors.
- `lgl-keychron-helper_projectplan.md`'s "Agreed requirements" no longer lists button remapping/macros/lighting/DPI/polling rate/lift-off distance as separate scope items (redundant with the Phase 4 confirmation that Launcher already handles all of this), and no longer lists a "Diagnostics" requirement now that Advanced diagnostics is out of scope.

### Fixed

- `README.md`'s Security Model section overclaimed two properties that aren't actually implemented: "hardware access is restricted to approved origins" (only the device vendor ID is checked, not the requesting origin) and that downloads are "controlled" (no `will-download` handler exists anywhere). Corrected the wording to describe what's actually implemented, with both gaps called out explicitly rather than silently dropped from the list. Both were closed later in this same release (see Added, above); the Security Model section now accurately describes them as implemented.
- `lgl-keychron-helper_projectplan.md`'s "Recommended architecture" and "Security boundaries" sections rewritten: they still described a React/preload/context-bridge design that was never built. Now accurately state there's no preload script or context bridge anywhere (local screens use plain hash-navigation links, not IPC) and explicitly flag both open security gaps inline. Also amended: Phase 3's Distrobox consideration (resolved by workflow: the app is never launched inside the Distrobox, only built there), Phase 6 (`vitest` was removed, no test runner currently installed; Distrobox/host-detection tests don't apply to code that doesn't exist), and two risk-mitigation entries that referenced the now-dropped diagnostics feature or an already-completed device chooser.

### Confirmed

- M7 8K feature validation (Phase 4): button mapping, macros, lighting, DPI/sensitivity, and polling rate all confirmed working correctly through Launcher's own interface via this app's WebHID connection.

### Planned

- Publishing the RPM to Fedora COPR. `Source0` in the `.spec` now points at a GitHub release tarball URL for this, which requires a `v1.0.0` git tag to exist upstream before a COPR SCM build can fetch it — not yet tagged/pushed.
- A true version-to-version upgrade and a full `dnf remove` (uninstall) cycle haven't been tested against the RPM yet, only install/reinstall.
- `package-lock.json` still lists `react` and other long-removed dependencies in its dependency tree, out of sync with `package.json`; needs a real `npm install` to resync (not hand-edited, since that needs actual npm tooling to do safely).

## [0.1.0] - 2026-07-14

Initial Phase 1 scaffold: the smallest possible Electron application capable of loading the live Keychron Launcher and proving out the WebHID connection flow. Also includes Phase 3's guided device-permission flow, built ahead of Phase 2.

### Added

- Secure Electron main process (`src/main/app.ts`) that opens a sandboxed `BrowserWindow` loading `https://launcher.keychron.com/` directly, with `nodeIntegration` disabled and context isolation enabled.
- Persistent `persist:launcher` session partition so Launcher's cookies, local storage, and settings survive application restarts.
- WebHID device-selection handling (`src/main/hid-permissions.ts`) that filters the device list to Keychron's USB vendor ID and denies all other prompt-style permission requests (camera, geolocation, notifications, etc.) by default.
- Navigation and popup policy (`src/main/navigation-policy.ts`) restricting the window to Launcher's origin; other URLs open in the user's default browser instead of inside the app.
- TypeScript build configuration (`tsconfig.json`, `npm run build:main`) compiling `src/main` to `dist/main`.
- Confirmed development workflow: TypeScript build runs inside the Fedora 44 Distrobox, while the built Electron binary is executed directly on the host (`node_modules/electron/dist/electron .`), requiring no npm/Node install on the host itself.
- Custom About popup (`src/main/about-window.ts`, `resources/about/about.html`, Help → About LGL Keychron Helper) as a small sandboxed local `BrowserWindow` showing the app icon, name, and version, with GitHub and "Buy me a coffee" (Ko-fi) buttons. Both links route through the same `shell.openExternal` handler for consistent open-in-browser behavior, replacing Electron's native About panel, whose built-in website button used a separate, inconsistent OS-level mechanism.
- Full application menu (File, Edit, View, Window, Help): replacing Electron's default menu entirely means these have to be defined explicitly rather than inherited; includes a File → Quit item.
- Back/Forward navigation menu items (View menu, `Alt+Left`/`Alt+Right`) so users can return from a Launcher sub-page even without window-manager decorations providing a back control.
- Pressing `Escape` closes the About popup.
- Wayland server-side window decorations enabled (`enable-features=WaylandWindowDecorations`, `ozone-platform-hint=auto`) so the window border/titlebar follows the host compositor theme.
- Fixed initial window size (1300×946), floored as the minimum resizable size.
- `resources/udev/71-keychron-hid.rules`: a narrow `udev` rule (`TAG+="uaccess"`, scoped to Keychron's USB vendor ID `3434`) granting the active local user HID device access to any Keychron device, without a world-writable `MODE` and without touching other HID devices.
- Device connection confirmation popup (`src/main/device-confirm-window.ts`, `resources/device-confirm/confirm.html`): Launcher can no longer connect to the mouse without the user explicitly clicking "Connect"; the previous behavior silently auto-granted the first matching device with no user interaction at all.
- Guided device-permission setup (`src/main/permission-setup-window.ts`, `resources/permission-setup/permission-setup.html`, `resources/udev/install-keychron-udev-rule.sh`): before attempting to connect, the app now checks whether the matching `hidraw` device nodes are actually readable/writable (`src/main/hid-device-access.ts`, reading sysfs directly rather than trusting WebHID enumeration, which succeeds regardless of whether the node can actually be opened). If not, it shows a popup explaining why and offers to install the `udev` rule via a fixed-operation helper script invoked through `pkexec`, no arbitrary commands or paths, matching the shared privileged-operations standard. After a successful install it re-checks access (a currently-attached device may need to be replugged before the new rule applies) before proceeding to the connection-confirmation popup. If `pkexec` fails for any reason (most notably: no PolicyKit authentication agent running in the session, which is common on non-standard/tiling window manager setups), the popup falls back to showing the exact manual install commands with the real on-disk rule path, rather than leaving the user stuck on a raw error with no way forward.

### Changed

- Initial validation target switched from the Keychron K4 HE (keyboard) to the Keychron M7 8K (mouse). This changes the prototype feature scope from keymap/actuation/Rapid Trigger/Snap Click to button mapping/DPI-sensitivity/polling rate/lift-off distance; see `README.md` and `lgl-keychron-helper_projectplan.md`.
- `71-keychron-hid.rules` broadened from matching the M7 8K's exact product ID to matching Keychron's vendor ID only, so any Keychron HID device (not just this one) gets permission from a single rule. The WebHID filter and `hidraw` access check in `hid-permissions.ts`/`hid-device-access.ts` were already vendor-only; the rule was the one place still scoped to a single product, which meant any other Keychron device would enumerate fine but permanently fail the permission check.

### Fixed

- WebHID connection hung indefinitely (spinner, no error) when selecting the M7 8K in Launcher. Root cause: the kernel's `hidraw` device nodes for the mouse were `crw-------` root:root, so Chromium could enumerate the device (which only needs sysfs/USB descriptor info) but couldn't actually open it for read/write. Enumeration and the vendor-ID filter in `hid-permissions.ts` were both already correct. Fixed by the new `udev` rule above.
- The guided permission-setup flow only ran inside the `select-hid-device` handler, which only fires for a *fresh* WebHID permission request. Once Launcher already holds a stored grant for a device (persisted in the `persist:launcher` session across restarts, by design, for cookies/settings), it silently tries to reopen the device directly on later loads without asking again, so `select-hid-device` never fires and the permission check never ran, even with a missing/removed `udev` rule. Fixed by adding `ensureKeychronDevicePermissions()` (`src/main/hid-permissions.ts`), which proactively scans for any connected Keychron `hidraw` device and offers to fix access as soon as the Launcher page finishes loading, independent of whether Launcher has made or will make a WebHID request at all.

### Known limitations

- The device confirmation popup always targets the first Keychron-vendor-ID match. This is by design, not a gap to fill later: Launcher itself already has its own UI for switching between multiple connected Keychron devices (observed with the Ultra-Link 8K dongle's keyboard/mouse detection screen), so this app's job is just gating individual WebHID grants one at a time, not building a parallel device-management UI.
- Guided permission install needs a PolicyKit authentication agent running in the session to show the `pkexec` prompt at all; on non-standard desktop sessions (e.g. a bare KWin session without a full Plasma session running) one may not be auto-started. The app doesn't manage or start one itself, that's session-level configuration outside its scope, but if `pkexec` fails for this or any other reason, the popup now shows the equivalent manual commands as a fallback instead of leaving the user stuck.
- No origin validation on HID permission handlers, and no download interception (`will-download`), both tracked as known security gaps to close before public release.
