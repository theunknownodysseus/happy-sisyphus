// Electron main entry: creates the desktop window, owns the persistent Bonsai
// session + file watcher, and wires up all IPC between renderer and Node.

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

// Disable GPU features that can cause cache / disk errors on some Windows setups.
// These switches are appended early so Chromium uses software rendering in dev.
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
import os from 'node:os'
// Force Chromium to use a writable temp profile to avoid permission issues
// when creating cache folders on Windows.
const _tmpProfile = join(os.tmpdir(), 'bonsai-desktop-dev-profile')
app.commandLine.appendSwitch('user-data-dir', _tmpProfile)
import { execFile } from 'node:child_process'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { BonsaiSession } from './BonsaiSession'
import { FileWatcher } from './FileWatcher'
import { ShellTerminal } from './ShellTerminal'
import * as store from './persistence'
import {
  CMD,
  EVT,
  type AttachSnapshot,
  type ChangedFile,
  type DirEntry,
  type FileContent,
  type HistoryEntry,
  type SessionState
} from '../shared/types'

let win: BrowserWindow | null = null
const session = new BonsaiSession()
const shellTerm = new ShellTerminal()
let watcher: FileWatcher
let latestFiles: ChangedFile[] = []

/** Directory/file names hidden from the mini-editor file tree (mirrors FileWatcher). */
const FS_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.turbo'
])
/** Max file size the mini-editor will load into Monaco (bytes). */
const MAX_READ_BYTES = 1024 * 1024

/** Resolve a project-relative path to an absolute one, rejecting escapes above the root. */
function safeResolve(rel: string): string | null {
  const root = session.state.cwd
  if (!root) return null
  const abs = resolve(root, rel || '.')
  const relBack = relative(root, abs)
  if (relBack.startsWith('..') || relBack.split(sep).includes('..')) return null
  return abs
}

function send(channel: string, payload: unknown): void {
  // Guard against races where the window/frame is torn down while the Bonsai
  // FSM is still emitting (e.g. app quit mid-boot). The try/catch covers the
  // "render frame was disposed" window that isDestroyed() cannot observe.
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
  try {
    win.webContents.send(channel, payload)
  } catch {
    /* frame disposed mid-send during teardown */
  }
}

/** Merge live session state with persisted counters before sending to UI. */
function stateForUi(base?: SessionState): SessionState {
  const s = base ?? session.state
  return { ...s, promptCount: store.getPromptCount() }
}

function pushState(base?: SessionState): void {
  send(EVT.state, stateForUi(base))
}

function pushHistory(history: HistoryEntry[]): void {
  send(EVT.history, history)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 940,
    minHeight: 620,
    show: false,
    backgroundColor: '#07080a',
    title: 'Bonsai Desktop',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- Bonsai session events -> renderer ------------------------------------

session.on('data', (data: string) => send(EVT.data, { data }))
session.on('state', (state: SessionState) => {
  pushState(state)
  // When Bonsai becomes ready, (re)start watching its working directory.
  if (state.phase === 'ready') watcher?.start(state.cwd)
})

// --- IPC: session control --------------------------------------------------

ipcMain.handle(CMD.attach, (): AttachSnapshot => {
  return {
    state: stateForUi(),
    buffer: session.buffer,
    changedFiles: latestFiles,
    history: store.getHistory()
  }
})

ipcMain.handle(CMD.start, async (_e, cwd?: string) => {
  const dir = cwd || store.getCwd() || process.cwd()
  store.setCwd(dir)
  await session.boot(dir)
})

ipcMain.on(CMD.write, (_e, data: string) => session.write(data))

ipcMain.on(CMD.sendPrompt, (_e, text: string) => {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return
  const history = store.appendHistory({ role: 'user', text: trimmed, at: Date.now() })
  session.sendPrompt(trimmed)
  pushHistory(history)
  pushState()
})

ipcMain.on(CMD.stop, () => session.stop())

ipcMain.handle(CMD.restart, async () => {
  await session.restart()
})

ipcMain.on(CMD.resize, (_e, cols: number, rows: number) => session.resize(cols, rows))

ipcMain.handle(CMD.clearChat, () => {
  store.clearHistory()
  session.clearRing()
  pushHistory([])
  pushState()
})

ipcMain.handle(CMD.newSession, async (): Promise<AttachSnapshot | null> => {
  const res = await dialog.showOpenDialog(win!, {
    title: 'Select project folder for a new Bonsai session',
    properties: ['openDirectory']
  })
  if (res.canceled || !res.filePaths[0]) return null
  const dir = res.filePaths[0]
  store.setCwd(dir)
  store.clearHistory()
  watcher.clear()
  latestFiles = []
  await session.setCwdAndRestart(dir)
  return {
    state: stateForUi(),
    buffer: session.buffer,
    changedFiles: [],
    history: []
  }
})

// --- IPC: toolbar actions --------------------------------------------------

ipcMain.on(CMD.openVSCode, () => {
  const dir = session.state.cwd
  // Try the `code` CLI; fall back to opening the folder in the OS file manager.
  execFile('code', [dir], { shell: true }, (err) => {
    if (err) shell.openPath(dir)
  })
})

ipcMain.handle(CMD.chooseFolder, async (): Promise<string | null> => {
  const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
  return res.canceled ? null : res.filePaths[0] ?? null
})

ipcMain.handle(CMD.copyConversation, (): string => {
  return renderMarkdown()
})

ipcMain.handle(CMD.exportMarkdown, async (): Promise<string | null> => {
  const res = await dialog.showSaveDialog(win!, {
    title: 'Export conversation',
    defaultPath: `bonsai-conversation-${Date.now()}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (res.canceled || !res.filePath) return null
  const { writeFileSync } = await import('node:fs')
  writeFileSync(res.filePath, renderMarkdown(), 'utf-8')
  return res.filePath
})

ipcMain.handle(CMD.fileDiff, (_e, path: string): Promise<string> => {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['diff', '--', path],
      { cwd: session.state.cwd, shell: true, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return resolve('')
        resolve(stdout || '')
      }
    )
  })
})

// --- IPC: mini-editor filesystem -------------------------------------------

ipcMain.handle(CMD.listDir, (_e, rel: string): DirEntry[] => {
  const abs = safeResolve(rel)
  if (!abs) return []
  const root = session.state.cwd
  try {
    const entries = readdirSync(abs, { withFileTypes: true })
    return entries
      .filter((d) => !(d.isDirectory() && FS_IGNORE.has(d.name)) && !d.name.startsWith('.'))
      .map((d) => ({
        name: d.name,
        path: relative(root, join(abs, d.name)).split(sep).join('/'),
        isDir: d.isDirectory()
      }))
      .sort((a, b) =>
        a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
      )
  } catch {
    return []
  }
})

ipcMain.handle(CMD.readFile, (_e, rel: string): FileContent => {
  const abs = safeResolve(rel)
  if (!abs) return { path: rel, content: '', readonly: true }
  try {
    const size = statSync(abs).size
    if (size > MAX_READ_BYTES) {
      return { path: rel, content: '', readonly: true, tooLarge: true }
    }
    const buf = readFileSync(abs)
    // Treat a NUL byte in the first 8 KB as "binary" -> view-only, no content.
    const sniff = buf.subarray(0, 8192)
    if (sniff.includes(0)) {
      return { path: rel, content: '(binary file — not shown)', readonly: true }
    }
    return { path: rel, content: buf.toString('utf-8'), readonly: false }
  } catch {
    return { path: rel, content: '', readonly: true }
  }
})

ipcMain.handle(CMD.writeFile, (_e, rel: string, content: string): boolean => {
  const abs = safeResolve(rel)
  if (!abs) return false
  try {
    writeFileSync(abs, content, 'utf-8')
    return true
  } catch (err) {
    console.error('[fs] write failed:', err)
    return false
  }
})

// --- IPC: mini-editor shell terminal ---------------------------------------

shellTerm.on('data', (data: string) => send(EVT.termData, { data }))

ipcMain.handle(CMD.termStart, () => {
  shellTerm.start(session.state.cwd || process.cwd())
})
ipcMain.on(CMD.termWrite, (_e, data: string) => shellTerm.write(data))
ipcMain.on(CMD.termResize, (_e, cols: number, rows: number) => shellTerm.resize(cols, rows))

function renderMarkdown(): string {
  const s = session.state
  const lines = [`# Bonsai conversation — ${s.projectName}`, '', `Root: \`${s.cwd}\``, '']
  for (const h of store.getHistory()) {
    const who = h.role === 'user' ? '🧑 User' : h.role === 'bonsai' ? '🌱 Bonsai' : 'ℹ️ System'
    lines.push(`### ${who}`, '', h.text, '')
  }
  return lines.join('\n')
}

// --- app lifecycle ---------------------------------------------------------

app.whenReady().then(() => {
  watcher = new FileWatcher((files) => {
    latestFiles = files
    send(EVT.files, files)
  })

  createWindow()

  // Auto-boot Bonsai shortly after the window is up so the UI can subscribe.
  win?.webContents.once('did-finish-load', () => {
    const dir = store.getCwd() || process.cwd()
    store.setCwd(dir)
    void session.boot(dir)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  session.dispose()
  shellTerm.dispose()
  watcher?.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  session.dispose()
  shellTerm.dispose()
  watcher?.stop()
})

// Go quiet immediately on a termination signal so no IPC is sent into a frame
// that is already being disposed (also covers a real Ctrl-C on the process).
function shutdown(): void {
  session.dispose()
  shellTerm.dispose()
  watcher?.stop()
  app.quit()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
