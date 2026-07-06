#!/usr/bin/env node
// happy-sisyphus CLI entry point.
//
// This is the executable that `npx happy-sisyphus` runs. Its only job is to
// locate the Electron runtime that ships as a dependency of this package and
// launch it against the pre-built app that lives in `out/` (produced at publish
// time by `electron-vite build`). No `npm install`, no dev server, no compile
// step happens on the user's machine — the app starts immediately.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
// Package root = one level up from bin/. Electron is launched here so it reads
// this package's package.json "main" (./out/main/index.js) as its entry.
const appRoot = join(here, '..')

// The `electron` npm package's main export is the absolute path to the platform
// Electron executable (downloaded by its own postinstall). Resolving it this way
// works identically on Windows, macOS, and Linux.
let electronExe
try {
  electronExe = require('electron')
} catch (err) {
  console.error(
    'happy-sisyphus: failed to locate the Electron runtime.\n' +
      'Try running the command again; if it persists, clear the npx cache and retry.\n' +
      String(err)
  )
  process.exit(1)
}

if (typeof electronExe !== 'string') {
  console.error('happy-sisyphus: unexpected Electron resolution result:', electronExe)
  process.exit(1)
}

// Forward any extra CLI args to the app after the app path.
const forwarded = process.argv.slice(2)

const child = spawn(electronExe, [appRoot, ...forwarded], {
  stdio: 'inherit',
  // On Windows, the resolved path is an .exe and needs no shell; inheriting
  // stdio keeps the app's console output (if any) attached to the terminal.
  windowsHide: false
})

child.on('close', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('happy-sisyphus: failed to start Electron:', err)
  process.exit(1)
})
