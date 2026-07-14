import { packager } from '@electron/packager';

// Produces a standalone, runnable Linux bundle in ./out — no npm/Node install
// required to run it afterward, same as the raw Electron binary already used for
// development. Excludes TypeScript sources, docs, and dev-only files that aren't
// needed at runtime; the compiled dist/main and resources/ are what actually ship.
//
// The packaged binary is named "lgl-keychron-helper" rather than "LGL Keychron
// Helper" — Electron Packager rejects any name ending in a space followed by
// "Helper" (a macOS-only naming collision with Electron's own internal helper
// processes) even when targeting Linux. A hyphen instead of a space avoids that
// restriction. This only affects the packaged executable's filename; the app's
// actual name shown in its window title, About popup, and menu is unaffected.
await packager({
  dir: '.',
  name: 'lgl-keychron-helper',
  platform: 'linux',
  arch: 'x64',
  out: 'out',
  overwrite: true,
  ignore: [
    /^\/node_modules/,
    /^\/src/,
    /^\/scripts/,
    /^\/\.git/,
    /^\/memory\.md$/,
    /^\/lgl-keychron-helper_projectplan\.md$/,
    /^\/README\.md$/,
    /^\/CHANGELOG\.md$/,
    /^\/tsconfig\.json$/,
    /^\/package-lock\.json$/,
    /^\/\.directory$/,
    /^\/out/,
  ],
});

console.log('Packaged app written to ./out');
