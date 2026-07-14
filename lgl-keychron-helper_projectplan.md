# LGL Keychron Helper — Project Plan

## Goal

Build a Linux desktop application that loads the live Keychron Launcher and lets users configure supported Keychron products without installing or opening a separate Chromium-based browser.

The first working prototype will target Fedora, run from source, and be validated with a Keychron M7 8K connected over USB. RPM packaging will follow; AppImage packaging may be considered later.

## Agreed requirements

- Platform: Linux, with Fedora as the initial target.
- Development environment: Fedora 44 Distrobox.
- Test desktop: custom KWin/Noctalia environment.
- Initial device: Keychron M7 8K.
- Connection: wired USB only for the prototype.
- Web application: <https://launcher.keychron.com/>.
- UI strategy: preserve the official Keychron Launcher experience as closely as possible.
- Network: an internet connection is required.
- Browser engine: a bundled Chromium engine is acceptable; users must not need a separate Chromium browser.
- Supported products: devices officially supported by Keychron Launcher.
- Initial feature scope:
  - Device detection and connection.
  - Button remapping and assignment.
  - Macro creation and assignment.
  - Lighting configuration.
  - DPI/sensitivity stage configuration.
  - Polling rate (up to 8K), lift-off distance, and other non-firmware controls exposed by Launcher.
- Deferred scope: firmware updates and flashing.
- Site storage: persist Launcher cookies, local storage, and settings between launches.
- Linux permissions: detect missing HID permissions and offer guided installation through `pkexec`.
- Diagnostics: provide a user-accessible Advanced section without changing the normal Launcher experience.

## Recommended architecture

Use Electron with TypeScript and React.

Electron is the preferred starting point because its Chromium renderer matches the browser engine Keychron officially expects, and Electron exposes application-level WebHID selection and permission APIs. This allows the app to load Launcher directly and respond when the site calls `navigator.hid.requestDevice()` without recreating Keychron's UI or reverse-engineering its HID protocol.

React will provide the application's native-facing screens and components. It will not replace, recreate, or inject itself into the Keychron Launcher interface. The live Launcher will remain isolated remote content loaded directly by Electron.

React should be used for:

- The native HID device chooser.
- The Advanced diagnostics section.
- USB permission guidance and installation status.
- Offline, loading, and site-failure screens.
- Application settings and confirmation dialogs.

Keeping these responsibilities separate preserves Keychron's intended experience while giving the helper's own UI a maintainable component model.

The application should:

- Load `https://launcher.keychron.com/` directly in a `BrowserWindow`.
- Use a persistent Electron session for Launcher data.
- Handle Electron's `select-hid-device` event with a native device chooser.
- Permit HID access only for approved Keychron Launcher origins and suitable Keychron devices.
- Keep Node.js integration disabled for all remote content.
- Enable context isolation and renderer sandboxing.
- Expose no privileged preload API to the Keychron website unless a later requirement makes one unavoidable.
- Expose only narrowly defined, validated IPC operations to trusted local React pages.
- Restrict unexpected navigation and open ordinary external links safely.
- Keep native diagnostics separate from the Launcher page.

## Security boundaries

Loading a remote website inside a desktop shell creates an important trust boundary. The website must receive HID access but must never inherit general desktop or Node.js privileges.

Required controls:

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Renderer sandbox enabled.
- HTTPS-only Launcher URL.
- Explicit origin allowlist for HID requests.
- Device filtering by verified vendor and product information.
- Separate security policies for trusted local React content and untrusted remote Launcher content.
- A narrow context bridge for local React screens, with no generic command execution or unrestricted filesystem access.
- Deny unrelated Electron permission requests by default.
- Prevent the remote page from navigating the main window to an untrusted origin.
- Do not enable Chromium's HID blocklist override unless testing proves that a required M7 8K interface is blocked and the exception can be narrowly justified.
- Do not log HID report contents, macro contents, key assignments, or device serial numbers by default.

## Project phases

### Phase 1 — Technical proof of concept

Estimated effort: 1–2 working days.

Create the smallest Electron application capable of loading Launcher and validate:

- Launcher renders correctly.
- The Connect button causes Electron's WebHID selection event to fire.
- The connected M7 8K appears in the device list.
- Selecting it allows Launcher to recognize and read the keyboard.
- Launcher storage persists across reloads and application restarts.
- Required Keychron resources, redirects, and popups behave correctly.

This phase is the primary technical gate. Do not build a custom Keychron protocol implementation unless direct Launcher integration proves impossible.

Exit criterion: Launcher detects the wired M7 8K and reads its existing configuration.

### Phase 2 — Secure application shell

Estimated effort: 2–3 working days.

**Amendment (2026-07-14):** the device chooser does not need to be a full multi-device selection UI. Keychron Launcher already has its own UI for switching between multiple connected Keychron devices (observed with the Ultra-Link 8K dongle's keyboard/mouse detection screen) — this app's job is only to gate individual WebHID grants one at a time, which the existing simple confirmation popup (`src/main/device-confirm-window.ts`) already does. Whether that popup and the other already-built local screens (About, permission setup) get retrofitted into React once a Vite workflow exists, versus staying as lightweight standalone HTML/JS, is an open decision — they already work well as-is.

Turn the proof of concept into a maintainable application:

- Establish a TypeScript and React build and development workflow.
- Create the main Launcher window and persistent profile. — **Done in Phase 1.**
- Implement the HID device chooser as a React-based local application surface. — **Simplified per the amendment above:** a plain confirmation popup already exists and covers this; no multi-device chooser is needed.
- Implement permission and navigation policies. — **Done in Phase 1.**
- Restrict HID permissions to approved origins and devices. — **Partially done:** device filtering exists; origin validation is still an open gap.
- Handle external URLs safely. — **Done in Phase 1.**
- Add React-based offline, loading, and site-failure states.
- Add structured, privacy-conscious application logging.
- Add application metadata, icons, and desktop-friendly window behavior. — **Partially done:** window sizing/theming/menu exist; no custom app icon or `.desktop` file yet.

Exit criterion: the app reliably reproduces the intended Keychron connection flow while maintaining the security boundaries above.

### Phase 3 — Fedora USB permission setup

Estimated effort: 2–4 working days.

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

Installing a `udev` rule inside the Fedora 44 Distrobox will not configure the host. Development mode must detect the container and arrange for the privileged helper to execute on the host, potentially through `distrobox-host-exec`. This behavior must be tested rather than assumed. An installed RPM will run directly on the host and will not need this development-specific path.

Exit criterion: a regular Fedora user can resolve a missing-device-permission failure through one guided `pkexec` prompt without manually editing system files or running the app as root.

### Phase 4 — M7 8K feature validation

Estimated effort: 3–5 working days.

Validate the following against the physical mouse:

- Initial detection and selection.
- Disconnect and reconnect behavior.
- Reading the existing configuration.
- Button remapping and assignment on every available profile.
- Creating, editing, naming, assigning, and removing macros.
- Lighting effect, colour, brightness, saturation, and speed controls.
- DPI/sensitivity stage configuration.
- Polling rate configuration, including 8K operation.
- Lift-off distance and other non-firmware controls exposed for the M7 8K.
- Configuration persistence on the mouse.
- Site reload and application restart.
- Graceful failure if USB is disconnected during an ordinary read or setting change.

Firmware functionality should be treated as unsupported during this milestone. If Launcher exposes firmware controls, the app should block them or display an explicit unsupported warning until a separate safety and recovery design has been completed.

Exit criterion: detection, button remapping, macros, lighting, and all non-firmware M7 8K configuration controls work reliably.

### Phase 5 — Advanced diagnostics

Estimated effort: 2–3 working days.

Add a React-based Advanced section reachable through the application menu or settings, leaving the normal Launcher page visually unchanged.

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

### Phase 6 — Testing and source prototype release

Estimated effort: 2–4 working days.

Add:

- Unit tests for origin, navigation, and HID permission decisions.
- Unit tests for `udev` rule generation and validation.
- Tests for Distrobox and host detection.
- Electron integration tests using a local mock WebHID page where practical.
- A physical-device M7 8K test checklist.
- Fedora source-build and run instructions.
- Troubleshooting and security documentation.
- Dependency locking and reproducible build commands.

USB hardware behavior cannot be fully covered in CI. A physical-device test remains a required release gate.

Exit criterion: another Fedora user can follow the documentation, run the prototype from source, install permissions through the app, and configure a supported keyboard.

### Phase 7 — RPM packaging

Begin after the source prototype is stable.

The RPM should provide:

- The packaged Electron application.
- Desktop entry, icons, and application metadata.
- The audited `udev` rule or rule set.
- The minimal privileged helper and required PolicyKit policy.
- Clean installation and removal behavior.
- Fedora dependency declarations.

Installation should place system permission files directly, avoiding a first-run `pkexec` prompt when the package installation has already completed the necessary setup.

Exit criterion: the application installs, launches, configures the M7 8K, upgrades, and uninstalls cleanly on supported Fedora versions.

### Deferred milestone — Firmware support

Firmware updates require separate research and safety work because an interrupted or incorrect flash can make a device unusable.

Before enabling firmware controls, determine:

- Which Linux interfaces and tools each supported device requires.
- Bootloader and DFU USB identifiers.
- Whether Keychron Launcher performs flashing directly or depends on a separate platform tool.
- Recovery procedures for every supported flashing path.
- Additional `udev` permissions required in bootloader mode.
- How to prevent flashing the wrong model or firmware image.
- How to handle power loss, disconnects, and partially completed updates.

Firmware support must not be inferred from ordinary configuration success.

## Proposed repository structure

```text
lgl-keychron-tool/
├── src/
│   ├── main/
│   │   ├── app.ts
│   │   ├── launcher-window.ts
│   │   ├── hid-permissions.ts
│   │   ├── navigation-policy.ts
│   │   └── diagnostics.ts
│   ├── preload/
│   │   └── local-app-bridge.ts
│   ├── renderer/
│   │   ├── app.tsx
│   │   ├── components/
│   │   ├── screens/
│   │   │   ├── AdvancedDiagnostics.tsx
│   │   │   ├── DeviceChooser.tsx
│   │   │   ├── PermissionSetup.tsx
│   │   │   └── SiteError.tsx
│   │   └── styles/
│   └── shared/
├── resources/
│   ├── udev/
│   ├── polkit/
│   └── icons/
├── scripts/
│   └── host-permission-helper
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── development.md
│   ├── testing-k4-he.md
│   └── security.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The proposed local UI build uses React, TypeScript, and Vite. The exact structure may change during the proof of concept, especially if the privileged helper is better implemented as a small compiled binary rather than a script.

## Prototype completion criteria

The prototype is complete when a non-root Fedora user can:

1. Build and run the application from source.
2. Open the live Keychron Launcher inside the application.
3. Resolve missing USB permissions through a guided `pkexec` prompt.
4. Select and connect a wired M7 8K through the intended Launcher flow.
5. Use button remapping, macros, lighting, and all non-firmware controls.
6. Restart the app without losing Launcher site settings.
7. Diagnose common connection and permission failures from the Advanced section.

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

Mitigation: test host execution explicitly, report container status in diagnostics, and include a host-native test before declaring a phase complete.

### Device-selection differences in Electron

Electron exposes WebHID selection through application events and may not show the same chooser as Chrome automatically.

Mitigation: implement a small native chooser that preserves the same user decision and device information while leaving the rest of the Keychron flow unchanged.

### Firmware controls remain visible

Launcher may expose firmware features even though the prototype does not support them safely.

Mitigation: verify the M7 8K behavior early and add a narrowly scoped block or warning without modifying unrelated Launcher functionality.

## References

- [Keychron Launcher](https://launcher.keychron.com/)
- Keychron M7 8K product information — TODO: add the correct product page URL (not guessed; please supply it)
- [Electron WebHID device access](https://www.electronjs.org/docs/latest/tutorial/devices)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [React documentation](https://react.dev/)
