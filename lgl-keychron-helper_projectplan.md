# LGL Keychron Helper: Project Plan

## Goal

Build a Linux desktop application that loads the live Keychron Launcher and lets users configure supported Keychron products without installing or opening a separate Chromium-based browser.

The first working prototype will target Fedora, run from source, and be validated with a Keychron M7 8K connected over USB. RPM packaging will follow; AppImage packaging may be considered later.

## Agreed requirements

- Platform: Linux, with Fedora as the initial target.
- Development environment: Fedora 44 Distrobox.
- Test desktop: KineticWE (custom KWin/Noctalia environment)
- Initial device: Keychron M7 8K.
- Connection: wired USB for the prototype. **Amendment (2026-07-16):** wireless connection via the Keychron-supplied dongle was also confirmed working through Launcher. Launcher itself displays a notice when the device is shown via the receiver: *"Please use a wired connection to upgrade your keyboard/mouse. This page is currently showing the receiver."* Use a wired connection for firmware updates.
- Web application: <https://launcher.keychron.com/>.
- UI strategy: preserve the official Keychron Launcher experience as closely as possible.
- Network: an internet connection is required.
- Browser engine: a bundled Chromium engine is acceptable; users must not need a separate Chromium browser.
- Supported products: devices officially supported by Keychron Launcher.
- Initial feature scope: device detection and connection through Launcher (confirmed working, Phase 4). All device configuration and firmware updates (button remapping, macros, lighting, DPI/sensitivity, polling rate, lift-off distance) are achieved through the Keychron webapp itself, not this app.
- Site storage: persist Launcher cookies, local storage, and settings between launches.
- Linux permissions: detect missing HID permissions and offer guided installation through `pkexec`.

## Recommended architecture

**Amendment (2026-07-15):** this section originally called for React and Vite; both were dropped from the architecture entirely. React's only real justification was a full multi-device chooser UI, but Launcher already has its own UI for switching between multiple connected Keychron devices, so that chooser was never needed. With that gone, nothing in the app requires a UI framework, a preload script, or a context bridge: the local trusted screens (About, device-connect confirmation, permission setup) are small, static, mostly one-shot popups loaded directly via `BrowserWindow.loadFile()`, and each communicates back to the main process through simple in-page hash-navigation links (e.g. `href="#connect"`, intercepted with a `did-navigate-in-page` listener); no IPC, no `contextBridge`, no bundler, and one fewer dependency surface to keep patched and audited. The actual architecture is Electron + TypeScript only.

Electron is the preferred starting point because its Chromium renderer matches the browser engine Keychron officially expects, and Electron exposes application-level WebHID selection and permission APIs. This allows the app to load Launcher directly and respond when the site calls `navigator.hid.requestDevice()` without recreating Keychron's UI or reverse-engineering its HID protocol.

Local trusted screens do not replace, recreate, or inject themselves into the Keychron Launcher interface. The live Launcher remains isolated remote content loaded directly by Electron in its own window and session.

The application:

- Loads `https://launcher.keychron.com/` directly in a `BrowserWindow`.
- Uses a persistent Electron session (`persist:launcher`) for Launcher data.
- Handles Electron's `select-hid-device` event with a native confirmation popup.
- Permits HID access filtered to Keychron's USB vendor ID and requesting origin.
- Keeps Node.js integration disabled for all content, remote and local alike.
- Enables context isolation and renderer sandboxing everywhere.
- Exposes no preload script or context bridge to any window, remote or local.
- Restricts unexpected navigation and opens ordinary external links safely via `shell.openExternal`.

## Security boundaries

Loading a remote website inside a desktop shell creates an important trust boundary. The website must receive HID access but must never inherit general desktop or Node.js privileges.

Required controls:

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Renderer sandbox enabled.
- HTTPS-only Launcher URL.
- Explicit origin allowlist for HID requests: **done.** `src/main/hid-permissions.ts` checks `details.frame?.origin` / `details.origin` / `requestingOrigin` against `ALLOWED_LAUNCHER_ORIGIN` (`src/main/allowed-origin.ts`, shared with `navigation-policy.ts`) in `select-hid-device`, `setDevicePermissionHandler`, and `setPermissionCheckHandler` respectively, alongside the existing vendor-ID check.
- Device filtering by verified vendor and product information.
- Separate security policies for trusted local content and untrusted remote Launcher content.
- No preload script or context bridge anywhere: local screens communicate via plain hash-navigation links, not IPC, so there is no bridge surface to narrow or audit in the first place.
- Deny unrelated Electron permission requests by default.
- Prevent the remote page from navigating the main window to an untrusted origin.
- Do not enable Chromium's HID blocklist override unless testing proves that a required M7 8K interface is blocked and the exception can be narrowly justified.
- Do not log HID report contents, macro contents, key assignments, or device serial numbers by default.
- Intercept downloads (`session.on('will-download', ...)`): **done.** `src/main/download-policy.ts` routes every download through the native save dialog instead of letting it save silently, without blocking legitimate downloads outright.

## Project phases

### Phase 1: Technical proof of concept

Create the smallest Electron application capable of loading Launcher and validate:

- Launcher renders correctly.
- The Connect button causes Electron's WebHID selection event to fire.
- The connected M7 8K appears in the device list.
- Selecting it allows Launcher to recognize and read the keyboard.
- Launcher storage persists across reloads and application restarts.
- Required Keychron resources, redirects, and popups behave correctly.

This phase is the primary technical gate. Do not build a custom Keychron protocol implementation unless direct Launcher integration proves impossible.

Exit criterion: Launcher detects the wired M7 8K and reads its existing configuration.

### Phase 2: Secure application shell

**Amendment (2026-07-14):** the device chooser does not need to be a full multi-device selection UI. Keychron Launcher already has its own UI for switching between multiple connected Keychron devices (observed with the Ultra-Link 8K dongle's keyboard/mouse detection screen); this app's job is only to gate individual WebHID grants one at a time, which the existing simple confirmation popup (`src/main/device-confirm-window.ts`) already does. React and Vite were subsequently dropped from the architecture entirely (see the amendment under "Recommended architecture" above): the local screens (About, device-confirm, permission setup) stay as lightweight standalone HTML/JS, no framework, no build step.

Turn the proof of concept into a maintainable application:

- ~~Establish a TypeScript and React build and development workflow.~~ **Dropped**, no framework needed; see amendment above.
- Create the main Launcher window and persistent profile. **Done in Phase 1.**
- ~~Implement the HID device chooser as a React-based local application surface.~~ **Simplified per the amendment above:** a plain confirmation popup already exists and covers this; no multi-device chooser is needed.
- Implement permission and navigation policies. **Done in Phase 1.**
- Restrict HID permissions to approved origins and devices. **Done.**
- Handle external URLs safely. **Done in Phase 1.**
- Add offline, loading, and site-failure states (plain HTML/JS, not React).
- Add structured, privacy-conscious application logging.
- Add application metadata, icons, and desktop-friendly window behavior. **Done.** Window sizing/theming/menu exist; every `BrowserWindow` sets `icon: resources/icon.png`; `packaging/lgl-keychron-helper.desktop` and a full `packaging/icons/hicolor/` set are ready for RPM installation.

Exit criterion: the app reliably reproduces the intended Keychron connection flow while maintaining the security boundaries above.

### Phase 3: Fedora USB permission setup

Implement a guided Fedora permission flow using a narrow `udev` rule and `TAG+="uaccess"`. Avoid world-writable HID devices and avoid requiring the application itself to run as root.

First-run behavior:

1. Let users follow the normal Launcher connection flow.
2. Detect when a matching HID device exists but the current session cannot access it.
3. Explain the permission problem in plain language.
4. Offer an Install Device Permissions action.
5. Invoke a small, auditable installation helper through `pkexec`.
6. Install the rule on the host and reload the rules.
7. Ask the user to reconnect the keyboard when necessary.
8. Retry detection without restarting the app if possible.

**Amendment (2026-07-14):** the implemented `udev` rule scopes access to Keychron's USB vendor ID (`3434`) rather than an exact per-product identifier list. This was a deliberate decision to support any Keychron HID device (not only the M7 8K) without maintaining a product-ID allow-list here, while still remaining far narrower than granting access to every HID device on the system. This differs from the original plan below, which called for a per-product audited list; that approach remains an option later if a narrower scope is ever needed (e.g. if a specific Keychron product line should be excluded), but is not implemented now.

Original plan: initially target only verified M7 8K identifiers. Expansion to other products should use an audited device-ID list rather than granting access to every HID device.

#### Distrobox consideration

**Amendment (2026-07-15):** resolved in practice by workflow rather than code. The Electron app itself is never launched inside the Distrobox: it's only *built* there (`npm run build:main`); the resulting binary is always executed directly from a host terminal (`node_modules/electron/dist/electron .`, or the packaged `lgl-keychron-helper` bundle). Since `pkexec` and the privileged helper only ever run in that host-launched process, they've always executed natively on the host with no container awareness needed. `distrobox-host-exec` was never required and no container-detection code was written.

Original concern: installing a `udev` rule inside the Fedora 44 Distrobox will not configure the host. Development mode must detect the container and arrange for the privileged helper to execute on the host, potentially through `distrobox-host-exec`. This behavior must be tested rather than assumed. An installed RPM will run directly on the host and will not need this development-specific path.

Exit criterion: a regular Fedora user can resolve a missing-device-permission failure through one guided `pkexec` prompt without manually editing system files or running the app as root.

### Phase 4: M7 8K feature validation

**Amendment (2026-07-14):** confirmed working through Launcher's own interface: button mapping, macros, lighting, DPI/sensitivity, polling rate, and other controls all function correctly through the app's WebHID connection. Not every sub-item below was necessarily exercised exhaustively one by one, but general functionality is confirmed good.

**Amendment (2026-07-16):** wireless connection via the Keychron-supplied dongle confirmed working as well, not just wired. Launcher itself warns against firmware updates over the receiver (see the "Agreed requirements" amendment above); only configuration was validated over the dongle; treat wired as the required connection for any firmware update.

Validate the following against the physical mouse:

- Initial detection and selection.
- Disconnect and reconnect behavior.
- Reading the existing configuration.
- Button remapping and assignment on every available profile.
- Creating, editing, naming, assigning, and removing macros.
- Lighting effect, colour, brightness, saturation, and speed controls.
- DPI/sensitivity stage configuration.
- Polling rate configuration, including 8K operation.
- Lift-off distance and other controls exposed for the M7 8K.
- Configuration persistence on the mouse.
- Site reload and application restart.
- Graceful failure if USB is disconnected during an ordinary read or setting change.

Exit criterion: detection, button remapping, macros, lighting, and all M7 8K configuration controls work reliably.

### Phase 5: Advanced diagnostics

**Amendment (2026-07-14):** removed from scope. Decided not needed; the app's guided permission flow already surfaces the diagnostics that actually matter (missing `hidraw` access) at the point it's relevant, without a separate diagnostics screen. The rest of this section is kept for historical record only.

Add an Advanced section (plain HTML/JS local popup, not React, see the architecture amendment above) reachable through the application menu or settings, leaving the normal Launcher page visually unchanged.

Diagnostics should display:

- Application and Electron versions.
- Operating system and desktop information.
- Whether the app is running inside Distrobox.
- Keychron HID devices visible to the process.
- Product name, vendor ID, product ID, and permission state.
- Whether the expected host `udev` rule is installed.
- Current Launcher URL and WebHID availability.
- Recent sanitized application events.

Advanced actions may include:

- Install or repair device permissions.
- Reload Launcher.
- Reset Launcher site data after confirmation.
- Open Electron developer tools when an explicit development flag is enabled.
- Export a sanitized diagnostic report.

Exit criterion: common USB permission, website loading, and device-selection problems can be diagnosed without asking a user to start the app from a terminal.

### Phase 6: Source prototype release

**Amendment (2026-07-16):** automated tests (unit and integration) are out of scope. `vitest` was removed from `package.json` along with React/Vite (see the architecture amendment above), and the app has no non-trivial logic (permission decisions, navigation policy, and `udev` rule generation are thin, directly-observable wrappers around Electron/OS behavior) to justify the maintenance cost of a test suite. Manual verification against physical hardware remains the release gate.

Add:

- A physical-device M7 8K test checklist.
- Fedora source-build and run instructions.
- Troubleshooting and security documentation.
- Dependency locking and reproducible build commands.

USB hardware behavior cannot be fully covered in CI. A physical-device test remains a required release gate.

Exit criterion: another Fedora user can follow the documentation, run the prototype from source, install permissions through the app, and configure a supported keyboard.

### Phase 7: RPM packaging

Begin after the source prototype is stable.

**Amendment (2026-07-17):** Fedora has no official system Electron package (confirmed: no package in Fedora's repos, an open upstream request at [electron/electron#44886](https://github.com/electron/electron/issues/44886), and an unresolved Fedora Discussion thread on whether a packaging policy even exists yet). The RPM therefore bundles Electron itself, same as the existing `npm run package` convenience build, rather than declaring `Requires: electron`.

The RPM should provide:

- The packaged Electron application. **Done** — `packaging/lgl-keychron-helper.spec` installs the `npm run package` output to `/usr/lib/lgl-keychron-helper/`, with a thin `/usr/bin/lgl-keychron-helper` launcher.
- Desktop entry, icons, and application metadata. **Done** — `packaging/lgl-keychron-helper.desktop`, `packaging/icons/hicolor/` (9 sizes generated from `resources/lgl-keychron-helper.png`), and every `BrowserWindow` now sets a real `icon:`.
- The audited `udev` rule or rule set. **Done** — installed both as the active rule (`%{_udevrulesdir}/71-keychron-hid.rules`) and mirrored at a fixed path for PolicyKit matching (see below).
- The minimal privileged helper and required PolicyKit policy. **Done** — `packaging/com.linuxgamerlife.lgl-keychron-helper.policy` defines two actions (install/remove), matched via `org.freedesktop.policykit.exec.path` against `/usr/libexec/lgl-keychron-helper/`. `src/main/udev-paths.ts`'s `resolveUdevDir()` prefers that fixed path when present, falling back to the existing dev/bundled resolution otherwise.
- Clean installation and removal behavior. **Partially done** — `%post`/`%postun` reload udev rules and re-trigger `hidraw` devices (guarded with `|| :`, matching what the app's own install script already does). Full install/upgrade/uninstall cycle not yet tested against a real build.
- Fedora dependency declarations. **Done** — `Requires: polkit`, `Requires: systemd-udev`; no `Requires: electron` per the amendment above.

Installation places the udev rule directly (`%post` reload/trigger, no first-run `pkexec` prompt needed for a fresh package install), while the app's own in-app Install/Remove Device Permissions flow remains available as a fallback/manual-override.

**Known gap in the current `.spec` file:** `%build` runs `npm ci` + `npm run package`, which needs network access (`@electron/packager` downloads a prebuilt Electron binary via `electron`'s own postinstall step). Fedora's official koji/mock build environment disables network access by default, so this spec currently targets local `rpmbuild`/COPR-with-networking-enabled use, not an unmodified official Fedora build. Vendoring dependencies for a fully hermetic build is a deliberate follow-up, not done here — consistent with deprioritizing CI-based builds, signing, and checksums for now.

Exit criterion: the application installs, launches, configures the M7 8K, upgrades, and uninstalls cleanly on supported Fedora versions. **Not yet verified** — the `.spec` file is an untested first draft.

**Pending items for this phase:**

- [x] Add a close button to the About popup.
- [x] Bump `package.json` version to `1.0.0` for the RPM release.

## Proposed repository structure

This is the original proposed structure and predates the architecture amendment above (no React/Vite). The structure actually built so far:

```text
lgl-keychron-tool/
├── src/
│   └── main/
│       ├── app.ts
│       ├── app-menu.ts
│       ├── launcher-window.ts
│       ├── navigation-policy.ts
│       ├── hid-permissions.ts
│       ├── hid-device-access.ts
│       ├── about-window.ts
│       ├── device-confirm-window.ts
│       └── permission-setup-window.ts
├── resources/
│   ├── about/about.html
│   ├── device-confirm/confirm.html
│   ├── permission-setup/permission-setup.html
│   └── udev/
│       ├── 71-keychron-hid.rules
│       └── install-keychron-udev-rule.sh
├── scripts/
│   └── package.mjs
├── package.json
├── tsconfig.json
└── README.md
```

No `preload/`, `renderer/`, or `docs/` directories exist yet. Local screens are plain HTML/JS files under `resources/`, each paired with a small `*-window.ts` module in `src/main/` that creates its `BrowserWindow` and handles its no-IPC hash-navigation-based communication, not React components. A `docs/` directory will likely appear once Phase 6 work starts.

## Prototype completion criteria

The prototype is complete when a non-root Fedora user can:

1. Build and run the application from source.
2. Open the live Keychron Launcher inside the application.
3. Resolve missing USB permissions through a guided `pkexec` prompt.
4. Select and connect a wired M7 8K through the intended Launcher flow.
5. Use button remapping, macros, lighting, and all controls.
6. Restart the app without losing Launcher site settings.
7. ~~Diagnose common connection and permission failures from the Advanced section.~~ **Dropped**, Advanced diagnostics is out of scope (see Phase 5 amendment); the guided permission popup already surfaces the one diagnostic that matters in the moment it's relevant.

## Principal risks and mitigations

### Launcher changes without notice

Because the app loads a live third-party website, Keychron can change its origins, browser requirements, device filters, or connection flow.

Mitigation: minimize page injection, keep integration at Electron's browser-permission boundary, log compatibility failures clearly, and maintain a short physical-device smoke test.

### Remote-content security

A compromised remote site must not gain general access to the user's computer.

Mitigation: sandbox the renderer, disable Node integration, expose no privileged bridge, allowlist origins, and grant only narrowly filtered permissions.

### Overly broad HID permissions

A generic HID rule could expose keyboards or other sensitive input devices unnecessarily.

Mitigation: use verified Keychron identifiers, `uaccess` session permissions, auditable generated rules, and no `MODE="0666"` fallback.

### Distrobox/host mismatch

The development container may see devices or system configuration differently from the host.

Mitigation: **resolved by workflow**: the app is never launched inside the Distrobox, only built there; every run (dev or packaged) happens directly on the host, so this mismatch never actually arises in practice. ("Report container status in diagnostics" no longer applies; Advanced diagnostics is out of scope.) Host-native testing before declaring a phase complete remains good practice regardless.

### Device-selection differences in Electron

Electron exposes WebHID selection through application events and may not show the same chooser as Chrome automatically.

Mitigation: **done.** `src/main/device-confirm-window.ts` implements a small native confirmation popup that preserves the same user decision and device information while leaving the rest of the Keychron flow unchanged.

## References

- [Keychron Launcher](https://launcher.keychron.com/)
- Keychron M7 8K product information: TODO, add the correct product page URL (not guessed; please supply it)
- [Electron WebHID device access](https://www.electronjs.org/docs/latest/tutorial/devices)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
