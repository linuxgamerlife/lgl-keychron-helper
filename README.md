<div align="center">

# LGL Keychron Helper

**Configure supported Keychron devices on Linux — without installing or opening a separate Chromium browser.**

[![Version](https://img.shields.io/badge/version-0.1.0-informational)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Fedora](https://img.shields.io/badge/Fedora-44-blue?logo=fedora&logoColor=white)](https://fedoraproject.org)
[![Electron](https://img.shields.io/badge/Electron-43-47848f?logo=electron&logoColor=white)](https://www.electronjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev)
<p align="center">
  <a href="https://ko-fi.com/G2G3V70LW">
    <img src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" height="36" alt="Buy Me a Coffee at ko-fi.com" />
  </a>
</p>
</div>

---

## About

| | |
|---|---|
| **Application** | LGL Keychron Helper |
| **Version** | v0.1.0 |
| **Status** | Phase 1 complete; Phase 3 (guided device permissions) in progress — Launcher loads and connects to a physical M7 8K, with an in-app popup to install the required `udev` rule via `pkexec` |
| **License** | MIT |
| **Author** | [LinuxGamerLife](https://www.youtube.com/@linuxgamerlife) |

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

## Overview

LGL Keychron Helper is a Linux desktop wrapper for the official [Keychron Launcher](https://launcher.keychron.com/). It will bundle the browser engine Launcher requires, provide WebHID device access, and guide users through Linux USB permissions while preserving Keychron's intended interface and connection flow.

- Uses the live Keychron Launcher rather than recreating the configurator
- Supports devices officially recognised by Keychron Launcher
- Runs the graphical application as an ordinary user
- Keeps native diagnostics and permission guidance behind an Advanced section
- Targets a source-built prototype followed by a Fedora RPM

> [!IMPORTANT]
> This project is in the planning and initial scaffolding stage. It is not yet a working configurator.

---

## Initial Target

| Area | Target |
|---|---|
| **Operating System** | Fedora Linux |
| **Development Environment** | Fedora 44 Distrobox |
| **Runtime Environment** | Fedora host desktop |
| **Initial Device** | Keychron M7 8K |
| **Connection** | Wired USB |
| **Web Configurator** | Keychron Launcher |

---

## Planned Features

| Category | Initial Prototype Scope |
|---|---|
| **Device Connection** | Detect and connect officially supported Keychron devices through WebHID |
| **Button Mapping** | Remap mouse buttons and assign macros or actions |
| **Macros** | Create, edit, assign, and remove macros |
| **Lighting** | Configure effects, colour, brightness, saturation, and speed |
| **M7 8K Controls** | DPI/sensitivity stages, polling rate (up to 8K), lift-off distance, and other non-firmware settings |
| **Linux Permissions** | Detect missing HID access and offer guided PolicyKit setup |
| **Diagnostics** | Advanced device, permission, environment, and connection information |

Firmware updates are deliberately deferred until safe flashing, failure handling, and device recovery procedures have been designed and physically tested.

---

## Architecture

The application will use:

- **Electron** for the desktop runtime, Chromium engine, WebHID integration, and security boundaries
- **TypeScript** for application code
- **React** for trusted local screens such as device selection, diagnostics, permission guidance, and errors
- **Vite** for local renderer builds
- **Vitest** for automated testing

Keychron Launcher will remain isolated remote content. React will not replace or inject itself into the Launcher interface.

```text
Keychron Launcher
       |
       | navigator.hid.requestDevice()
       v
Electron WebHID permission boundary
       |
       v
User-selected, verified Keychron USB device
```

---

## Security Model

Remote Launcher content is treated as untrusted web content even though it is supplied by the supported vendor.

- Node.js integration is disabled for remote content
- Context isolation and renderer sandboxing are enabled
- Hardware access is restricted to approved origins and verified devices
- Unrelated browser permissions are denied by default
- Navigation, popups, downloads, and external URLs are controlled
- Trusted local React content is separated from the remote website
- Native operations use narrow, typed, validated interfaces
- The remote website receives no arbitrary shell or filesystem access

Linux device access will use a narrow `udev` rule and a minimal PolicyKit helper. The graphical application will never run as root.

---

## Development

The application is built inside Fedora 44 Distrobox and run on the host for graphical, WebHID, `udev`, PolicyKit, and physical-device testing.

Inside the development Distrobox, the host project may be available at:

```text
/run/host/development/projects/lgl-keychron-tool
```

Install the locked JavaScript dependencies with:

```bash
npm ci
```

The current prototype only builds the Electron main process (no renderer yet — that arrives in Phase 2). Build inside the Distrobox, then run on the host:

```bash
# Inside the Fedora 44 Distrobox
npm run build:main

# From a host terminal — executes the Electron binary directly, no
# npm/Node install required on the host itself
node_modules/electron/dist/electron .
```

> Do not commit `node_modules`, build output, test output, logs, or local environment files.

---

## Current Status

- [x] Requirements gathered
- [x] Architecture selected
- [x] Security boundaries defined
- [x] Project plan written
- [x] Direct dependencies pinned and audited
- [x] Electron main process scaffold
- [x] Application menu, About window, and navigation controls
- [x] Keychron Launcher WebHID proof of concept (confirmed connecting to a physical M7 8K)
- [x] Guided Fedora device permissions (detects missing `hidraw` access and installs the `udev` rule via an in-app `pkexec` prompt)
- [ ] React renderer and build workflow
- [ ] M7 8K feature validation
- [ ] Advanced diagnostics
- [ ] Fedora RPM

See [lgl-keychron-helper_projectplan.md](lgl-keychron-helper_projectplan.md) for the detailed implementation plan and acceptance criteria.

---

## Project Status and Affiliation

This is an independent, unofficial project. It is not affiliated with or endorsed by Keychron.

Keychron and Keychron Launcher are trademarks or services of their respective owner.

---

## License

MIT. A licence file will be added before the first software release.

---

<div align="center">
Made for <a href="https://fedoraproject.org">Fedora</a> · by <a href="https://www.youtube.com/@linuxgamerlife">LinuxGamerLife</a>
</div>
