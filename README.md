<div align="center">

# LGL Keychron Helper

**Configure supported Keychron devices on Linux, without installing or opening a separate Chromium browser.**

[![Version](https://img.shields.io/badge/version-0.1.0-informational)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Fedora](https://img.shields.io/badge/Fedora-44-blue?logo=fedora&logoColor=white)](https://fedoraproject.org)
[![Electron](https://img.shields.io/badge/Electron-43-47848f?logo=electron&logoColor=white)](https://www.electronjs.org)
<p align="center">
  <a href="https://ko-fi.com/G2G3V70LW">
    <img src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" height="36" alt="Buy Me a Coffee at ko-fi.com" />
  </a>
</p>
</div>

---

## About

|  |  |
|----|----|
| **Application** | LGL Keychron Helper |
| **Version**    | v0.1.0 |
| **Status**    | Functional prototype: Launcher loads, connects to a physical M7 8K, and guides the user through installing the required `udev` permission via an in-app `pkexec` prompt when needed |
| **License**    | MIT |
| **Author**    | [LinuxGamerLife](https://www.youtube.com/@linuxgamerlife) |
| **AI Use**    | I use generative AI as a support tool when creating scripts, tools, and software. AI assists with tasks such as writing code, explaining technical concepts, and generating implementation ideas.[...more](https://github.com/linuxgamerlife#ai-transparency) |

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

## Overview

LGL Keychron Helper is a Linux desktop wrapper for the official [Keychron Launcher](https://launcher.keychron.com/). It bundles the browser engine Launcher requires, provides WebHID device access, and guides users through Linux USB permissions while preserving Keychron's intended interface and connection flow.

- Uses the live Keychron Launcher rather than recreating the configurator: button mapping, macros, lighting, DPI/sensitivity, polling rate, and other device-specific controls are all handled by Launcher's own interface, not reimplemented here
- Supports devices officially recognised by Keychron Launcher
- Runs the graphical application as an ordinary user
- Automatically detects and guides the user through fixing missing Linux HID permissions
- Targets a source-built prototype followed by distribution via Fedora COPR

> [!NOTE]
> This is a working prototype: it connects to a physical Keychron device and lets Launcher read and configure it. An application icon and Fedora RPM/COPR packaging are still in progress.

---

## Initial Target

| Area | Target |
|---|---|
| **Operating System** | Fedora Linux |
| **Development Environment** | Fedora 44 Distrobox |
| **Runtime Environment** | Fedora host desktop |
| **Initial Device** | Keychron M7 8K |
| **Connection** | Wired USB or wireless (Keychron dongle) |
| **Web Configurator** | Keychron Launcher |

> [!NOTE]
> Development and testing focus on Fedora, since that's what the author runs, but nothing in the app or its `udev`/`pkexec` setup is Fedora-specific. It should work on any systemd + `udev` + PolicyKit-based Linux distro.

> [!CAUTION]
> Wireless (dongle) connection works for ordinary configuration, but Launcher itself displays this notice when a device is connected via the dongle: *"Please use a wired connection to upgrade your keyboard/mouse. This page is currently showing the receiver."* Use a wired connection for firmware updates.

---

## Architecture

The application uses:

- **Electron** for the desktop runtime, Chromium engine, WebHID integration, and security boundaries
- **TypeScript** for the main process
- Small, sandboxed local HTML/JS popups (no framework) for trusted local screens such as the About window, device-connection confirmation, and permission setup

Keychron Launcher remains isolated remote content. Local screens do not replace or inject themselves into the Launcher interface.

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
- Hardware access is restricted to verified Keychron devices by USB vendor ID (origin validation is not yet implemented, tracked as a known gap)
- Unrelated browser permissions are denied by default
- Navigation, popups, and external URLs are controlled; downloads are intercepted and routed through a save dialog rather than saving silently
- Trusted local content is separated from the remote website
- Native operations use narrow, typed, validated interfaces
- The remote website receives no arbitrary shell or filesystem access

Linux device access uses a narrow `udev` rule installed through a `pkexec`-invoked helper. The graphical application never runs as root.

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
- [x] M7 8K feature validation (button mapping, macros, lighting, DPI, polling rate, and other controls confirmed working through Launcher)
- [ ] Fedora RPM

See [lgl-keychron-helper_projectplan.md](lgl-keychron-helper_projectplan.md) for the detailed implementation plan and acceptance criteria.

---

## Project Status and Affiliation

Keychron and Keychron Launcher are copyright and trademarks of ©Keychron Inc. LGL Keychron Helper is an independent, unofficial project and is not affiliated with or endorsed by Keychron.

---

## License

MIT. See [LICENSE](LICENSE), which also covers the Keychron trademark disclaimer.

---

<div align="center">
Made for <a href="https://fedoraproject.org">Fedora</a> · by <a href="https://www.youtube.com/@linuxgamerlife">LinuxGamerLife</a>
</div>
