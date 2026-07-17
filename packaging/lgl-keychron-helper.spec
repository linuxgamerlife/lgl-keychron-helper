Name:           lgl-keychron-helper
Version:        1.0.0
Release:        1%{?dist}
Summary:        Linux desktop helper for configuring supported Keychron devices via Keychron Launcher

# The bundled Electron runtime and its shared libraries are prebuilt binaries, not
# compiled by Fedora's own toolchain, so RPM's automatic debuginfo/GDB-index
# generation (find-debuginfo.sh) fails against them (objcopy can't add a
# .gdb_index section). Disabling debuginfo package generation is the standard
# fix for RPMs that bundle prebuilt binaries like this (also done by VS Code,
# and unofficial Slack/Discord RPMs, for the same reason).
%global debug_package %{nil}

License:        MIT
URL:            https://github.com/linuxgamerlife/lgl-keychron-tool
# GitHub's archive endpoint names the top-level directory after the repo
# (lgl-keychron-tool), not the package (lgl-keychron-helper), and strips a
# leading "v" from numeric tags — so tag v%{version} unpacks to
# lgl-keychron-tool-%{version}. The trailing /%{name}-%{version}.tar.gz segment
# is just a friendly download filename; GitHub ignores it and serves the same
# archive regardless. Requires a `v%{version}` tag to exist on GitHub before a
# COPR (or any) build can fetch it.
Source0:        https://github.com/linuxgamerlife/lgl-keychron-tool/archive/refs/tags/v%{version}/%{name}-%{version}.tar.gz

# BuildArch is only valid as "noarch"; a real arch name there breaks
# rpmbuild's SRPM generation ("No compatible architectures found for build").
# This package bundles prebuilt x86_64-only Electron binaries, so restrict
# eligible build architectures with ExclusiveArch instead.
ExclusiveArch:  x86_64
BuildRequires:  nodejs >= 22
BuildRequires:  npm
BuildRequires:  desktop-file-utils
BuildRequires:  systemd-rpm-macros

Requires:       polkit
Requires:       systemd-udev

# @electron/packager downloads a prebuilt Electron binary during `npm ci`
# (electron's own postinstall step), so %build needs network access. This is
# separate from Source0 fetching above (COPR/mock always allows network access
# to fetch declared Sources, regardless of project settings) — %build's network
# need specifically requires COPR's "Enable networking during builds" project
# option, since Fedora's official koji/mock build environment disables network
# access during %build/%install by default otherwise. Vendoring node_modules
# would be needed to make this hermetic; that's a deliberate follow-up, not
# done here.

%description
LGL Keychron Helper is a Linux desktop wrapper for the official Keychron
Launcher web app. It bundles the Chromium/Electron runtime Launcher requires,
provides WebHID device access, and guides users through Linux USB permissions
via a narrow, audited udev rule installed through PolicyKit.

%prep
%setup -q -n lgl-keychron-tool-%{version}

%build
npm ci
npm run package

%install
rm -rf %{buildroot}

# Application payload: the bundled Electron runtime + compiled app, as produced
# by `npm run package` (scripts/package.mjs). A private application directory,
# not shared libraries for ld.so — %{_prefix}/lib, not the arch-suffixed
# %{_libdir} (/usr/lib64 on x86_64).
install -d %{buildroot}%{_prefix}/lib/%{name}
cp -a out/%{name}-linux-x64/. %{buildroot}%{_prefix}/lib/%{name}/
# @electron/packager creates its output directory (and only that top-level
# directory) with mode 0700 — fine for a local dev output folder, but cp -a
# preserves that into the buildroot, which would block every non-root user
# from even traversing into the installed app directory. Individual file
# permissions are already correct; only the directory traversal bit is wrong.
chmod -R a+rX %{buildroot}%{_prefix}/lib/%{name}

# Thin launcher script on PATH.
install -d %{buildroot}%{_bindir}
cat > %{buildroot}%{_bindir}/%{name} <<EOF
#!/bin/sh
exec %{_prefix}/lib/%{name}/%{name} "\$@"
EOF
chmod 0755 %{buildroot}%{_bindir}/%{name}

# Privileged helper scripts + a mirror of the rule file, at a fixed path so
# PolicyKit can match the invoked script by exact path (see the .policy file)
# and show a tailored authentication prompt instead of a generic one.
install -d %{buildroot}%{_libexecdir}/%{name}
install -m 0755 resources/udev/install-keychron-udev-rule.sh %{buildroot}%{_libexecdir}/%{name}/
install -m 0755 resources/udev/remove-keychron-udev-rule.sh %{buildroot}%{_libexecdir}/%{name}/
install -m 0644 resources/udev/71-keychron-hid.rules %{buildroot}%{_libexecdir}/%{name}/

# The actual active udev rule, installed directly by the package so device
# permissions work immediately after install, without a first-run pkexec
# prompt from the app itself.
install -d %{buildroot}%{_udevrulesdir}
install -m 0644 resources/udev/71-keychron-hid.rules %{buildroot}%{_udevrulesdir}/71-keychron-hid.rules

# Desktop entry.
install -d %{buildroot}%{_datadir}/applications
install -m 0644 packaging/%{name}.desktop %{buildroot}%{_datadir}/applications/
desktop-file-validate %{buildroot}%{_datadir}/applications/%{name}.desktop

# PolicyKit policy.
install -d %{buildroot}%{_datadir}/polkit-1/actions
install -m 0644 packaging/com.linuxgamerlife.lgl-keychron-helper.policy \
  %{buildroot}%{_datadir}/polkit-1/actions/

# Icons. Only the files are owned here, not the hicolor directories themselves
# (those belong to the hicolor-icon-theme package).
for size in 16 22 24 32 48 64 128 256 512; do
  install -d %{buildroot}%{_datadir}/icons/hicolor/${size}x${size}/apps
  install -m 0644 packaging/icons/hicolor/${size}x${size}/apps/%{name}.png \
    %{buildroot}%{_datadir}/icons/hicolor/${size}x${size}/apps/%{name}.png
done

%files
%license LICENSE
%doc README.md CHANGELOG.md
%{_bindir}/%{name}
%{_prefix}/lib/%{name}/
%{_libexecdir}/%{name}/
%{_udevrulesdir}/71-keychron-hid.rules
%{_datadir}/applications/%{name}.desktop
%{_datadir}/polkit-1/actions/com.linuxgamerlife.lgl-keychron-helper.policy
%{_datadir}/icons/hicolor/16x16/apps/%{name}.png
%{_datadir}/icons/hicolor/22x22/apps/%{name}.png
%{_datadir}/icons/hicolor/24x24/apps/%{name}.png
%{_datadir}/icons/hicolor/32x32/apps/%{name}.png
%{_datadir}/icons/hicolor/48x48/apps/%{name}.png
%{_datadir}/icons/hicolor/64x64/apps/%{name}.png
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
%{_datadir}/icons/hicolor/256x256/apps/%{name}.png
%{_datadir}/icons/hicolor/512x512/apps/%{name}.png

# Modern udev auto-detects new/changed rule files without a reload, but
# already-connected devices still need to be re-triggered to pick up a rule
# that didn't exist when they were plugged in. Guarded with `|| :` so a
# transient failure here never fails the package transaction — matches what
# the app's own install-keychron-udev-rule.sh already does.
%post
udevadm control --reload-rules >/dev/null 2>&1 || :
udevadm trigger --subsystem-match=hidraw >/dev/null 2>&1 || :

%postun
udevadm control --reload-rules >/dev/null 2>&1 || :
udevadm trigger --subsystem-match=hidraw >/dev/null 2>&1 || :

%changelog
* Fri Jul 17 2026 LinuxGamerLife <noreply@linuxgamerlife.com> - 1.0.0-1
- Initial RPM release.
