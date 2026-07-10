# happy-sisyphus
![banner](./assets/happy.png)
> A modern desktop chat frontend for the **[Bonsai CLI](https://trybons.ai)** AI assistant — runnable with a single `npx` command.

[![npm version](https://img.shields.io/npm/v/happy-sisyphus.svg)](https://www.npmjs.com/package/happy-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/happy-sisyphus.svg)](https://www.npmjs.com/package/happy-sisyphus)
[![license](https://img.shields.io/npm/l/happy-sisyphus.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/happy-sisyphus.svg)](https://nodejs.org)

**📦 npm:** https://www.npmjs.com/package/happy-sisyphus

`happy-sisyphus` turns the Bonsai command-line AI assistant into a dark-themed **desktop chat application**. Your editor (VS Code, etc.) stays exactly where it is; this window becomes a friendly conversational interface to a **single, persistent** Bonsai session running quietly in the background.

---

## Quick start

You don't need to clone anything, install build tools, or compile a thing. Just run:

```bash
npx happy-sisyphus
```

The desktop window opens immediately. On first launch it walks you through Bonsai setup automatically (see [How it works](#how-it-works)).

Prefer to keep it around? Install it globally:

```bash
npm install -g happy-sisyphus
happy-sisyphus
```

> **Requirements:** Node.js **≥ 18** and npm. Works on **Windows 10+, macOS, and Linux**. A Bonsai account is required (the app runs `bonsai login` for you).

---

## Why use this?

The Bonsai CLI is a full-screen terminal (Ink TUI) app. That's powerful, but it means:

- You have to keep a terminal window open and manage raw-mode keystrokes yourself.
- Every `Continue?` snapshot prompt needs a manual arrow-key + Enter.
- There's no persistent, scrollable conversation view, no changed-files panel, and no one-click export.

`happy-sisyphus` fixes all of that while keeping the real Bonsai TUI as the source of truth:

| Pain with raw CLI | What happy-sisyphus gives you |
|---|---|
| Manual install / login / start each time | **Auto-boot**: installs Bonsai if missing, runs `login`, then `start` |
| Babysitting the `Continue?` prompt | **Auto-confirm**: moves to **Yes** and presses **Enter** for you |
| Session dies when you close the terminal | **One persistent session** — prompts stream into the *existing* process |
| No history / export | **Copy conversation**, **Export Markdown**, replay on reload |
| Hard to see what changed | **Changed-files panel** with optional `git diff` preview |
| No shortcuts | `Ctrl/⌘+Enter` send · `Esc` stop · `Ctrl/⌘+L` clear · drag files to reference paths |

In short: you get the ergonomics of a chat app with the fidelity of the real terminal.

---

## Who is this for?

- **Developers using the Bonsai CLI** who want a nicer, always-on interface than a bare terminal.
- **Anyone who wants zero-setup** — `npx happy-sisyphus` runs a *pre-built* app; there's no dev server, no native compilation, no `npm install` on your machine at runtime.
- **Windows / macOS / Linux users** — the embedded terminal uses `node-pty` (ConPTY on Windows) so the TUI renders faithfully everywhere.
- **People who keep their own editor** — this doesn't replace VS Code; it complements it and can open it for you.

---

## Features

- **Auto boot** — ensures Bonsai is installed (`npm i -g bonsai` if missing), runs `bonsai login` (opens your browser, shows *"Waiting for Bonsai login…"*), then `bonsai start`.
- **Auto-confirm** — answers Bonsai's `Continue?` snapshot prompt for you.
- **Persistent session** — prompts are written into the *existing* Bonsai process; it's never restarted per prompt.
- **Live streaming** — Bonsai's output is rendered faithfully in an embedded xterm.js terminal.
- **Changed-files panel** — watches your project directory (via chokidar), with optional `git diff` preview.
- **Sidebar** — project root, status, files-changed and prompt counts.
- **Toolbar** — Restart Bonsai · Clear Chat · New Session · Open VS Code · Copy Conversation · Export Markdown.
- **Reconnect** — reloading the window replays the terminal scrollback; the Bonsai process keeps running. If Bonsai crashes, **Restart Bonsai** brings it back without restarting the app.
- **Keyboard shortcuts** — `Ctrl/⌘+Enter` send · `Esc` stop generation · `Ctrl/⌘+L` clear input. Drag files onto the prompt to reference their paths.

---

## How it works

When you run `npx happy-sisyphus`, the CLI entry point (`bin/index.js`) locates the Electron runtime that ships as a dependency and launches the **pre-built** app in `out/` — no compile step happens on your machine, so it starts instantly.

From there, the app manages a real Bonsai session for you:

```
Desktop window (React + Tailwind + xterm.js)
        │  Electron IPC (contextBridge)
Electron main (Node)
        │  node-pty  (pseudo-terminal)
Persistent `bonsai start` process  ──►  your project directory  ──►  VS Code files
```

Because Bonsai is a full-screen **Ink TUI** (it renders ANSI and reads raw-mode keystrokes), it's driven through a real **PTY** via `node-pty`. Its `Yes/No` prompt is answered with arrow-key + Enter keystrokes — not line-based `stdin` writes — and the terminal panel shows the real TUI as ground truth.

### Startup flow

| Step | Where it's handled |
|------|--------------------|
| `npm i -g bonsai` (skipped if installed) | `BonsaiSession.isInstalled()` → `boot()` |
| `bonsai login` + "Waiting for login…" | `BonsaiSession.runLogin()` (exit 0 = success) |
| `bonsai start` + auto-answer **Yes** | `BonsaiSession.startSession()` + `maybeAutoConfirm()` |
| Persistent session, write prompts to stdin | `sendPrompt()` on the single live PTY |
| Stream stdout to the UI | `pty.onData` → IPC `session:data` → xterm |
| Monitor file changes | `FileWatcher` (chokidar) → IPC `files:changed` |
| Reconnect if UI refreshes | ring buffer replayed on `session:attach` |
| Restart on crash without restarting UI | `pty.onExit` → `offline` → **Restart Bonsai** |

---

## Building from source (contributors)

Most users never need this — `npx happy-sisyphus` runs the published, pre-built app. If you want to hack on it:

```bash
npm install     # also runs electron-rebuild for node-pty (native module)
npm run dev      # launch in development
```

Build a distributable:

```bash
npm run build      # bundles main/preload/renderer with electron-vite
npm run package    # packages the app with electron-builder
```

> **node-pty is a native module** and must be compiled against Electron's ABI. Building it needs platform build tools:
> - **Windows**: Visual Studio Build Tools (Desktop C++) — usually already present with Node.
> - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
> - **Linux**: `build-essential` + `python3`.

### Project layout

```
bin/
  index.js                 CLI entry — launches Electron against pre-built out/
src/
  shared/types.ts          Types + IPC channel names shared by all processes
  main/
    index.ts               Window + IPC wiring + app lifecycle
    BonsaiSession.ts       Persistent PTY, lifecycle FSM, auto-confirm, ring buffer
    FileWatcher.ts         chokidar watcher → changed files
    persistence.ts         History/session JSON under userData
    ansi.ts                ANSI-strip helper for prompt detection
    ShellTerminal.ts       Embedded shell terminal support
  preload/index.ts         contextBridge → window.bonsai
  renderer/
    index.html
    src/
      App.tsx              Shell layout + setup/error overlays
      hooks/useSession.ts  IPC subscription + state
      components/          StatusBar, Sidebar, Toolbar, TerminalPanel, PromptInput, ChangedFiles
```

---

## Notes & limitations

- Token usage is shown only if Bonsai surfaces it (otherwise omitted).
- Diff preview is best-effort via `git diff` and hidden for non-git projects.
- Image paste is deferred unless the CLI supports it; file **paths** are supported via drag-and-drop.

---

## Requirements

- **Node.js ≥ 18** and **npm**
- A **Bonsai account** (the app runs `bonsai login` for you)
- **Windows 10+ / macOS / Linux** — on Windows, `node-pty` uses the built-in **ConPTY**

---

## License

[MIT](./LICENSE) © theunknownodysseus

---

## Links

- **npm package:** https://www.npmjs.com/package/happy-sisyphus
- **Bonsai CLI:** https://trybons.ai
