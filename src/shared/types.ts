// Shared types used across the Electron main, preload, and renderer processes.

/** High-level lifecycle state of the Bonsai session, surfaced to the UI. */
export type SessionPhase =
  | 'idle'
  | 'checking'
  | 'installing'
  | 'loggingIn'
  | 'awaitingConfirm'
  | 'starting'
  | 'ready'
  | 'offline'
  | 'error'

/** Coarse connection light shown in the top status bar. */
export type ConnectionLight = 'green' | 'yellow' | 'red'

export interface SessionState {
  phase: SessionPhase
  light: ConnectionLight
  /** Human readable status label, e.g. "Bonsai Running", "Logging in…". */
  label: string
  /** Absolute path of the working directory Bonsai operates on. */
  cwd: string
  /** Basename of cwd, shown as the project name. */
  projectName: string
  /** Number of prompts sent this session. */
  promptCount: number
  /** Optional device auth code when phase === 'loggingIn'. */
  authCode?: string
  /** Optional error detail when phase === 'error'. */
  error?: string
}

export interface ChangedFile {
  /** Path relative to the project root. */
  path: string
  /** 'add' | 'change' | 'unlink' */
  kind: 'add' | 'change' | 'unlink'
  /** Epoch ms of last change. */
  at: number
}

export interface HistoryEntry {
  role: 'user' | 'bonsai' | 'system'
  text: string
  at: number
}

/** Payload streamed for every chunk of PTY output. */
export interface DataChunk {
  data: string
}

/** One entry in the mini-editor file tree. `path` is relative to the project root. */
export interface DirEntry {
  name: string
  path: string
  isDir: boolean
}

/** Contents of a file opened in the mini-editor. */
export interface FileContent {
  path: string
  content: string
  /** True when the file can't be edited (binary or over the size cap). */
  readonly: boolean
  /** True when the file exceeded the read size cap and was not loaded. */
  tooLarge?: boolean
}

/** Snapshot replayed to a freshly (re)loaded renderer so it can restore scrollback. */
export interface AttachSnapshot {
  state: SessionState
  /** Serialized terminal buffer (ANSI) captured from the live PTY. */
  buffer: string
  changedFiles: ChangedFile[]
  history: HistoryEntry[]
}

/** Channel names for main -> renderer events. */
export const EVT = {
  data: 'session:data',
  state: 'session:state',
  files: 'files:changed',
  history: 'history:updated',
  termData: 'term:data'
} as const

/** Channel names for renderer -> main invocations. */
export const CMD = {
  attach: 'session:attach',
  start: 'session:start',
  write: 'session:write',
  sendPrompt: 'session:sendPrompt',
  stop: 'session:stop',
  restart: 'session:restart',
  resize: 'session:resize',
  clearChat: 'session:clearChat',
  newSession: 'session:newSession',
  openVSCode: 'action:openVSCode',
  chooseFolder: 'action:chooseFolder',
  copyConversation: 'action:copyConversation',
  exportMarkdown: 'action:exportMarkdown',
  fileDiff: 'action:fileDiff',
  // Mini-editor: filesystem access.
  listDir: 'fs:listDir',
  readFile: 'fs:readFile',
  writeFile: 'fs:writeFile',
  // Mini-editor: embedded shell terminal.
  termStart: 'term:start',
  termWrite: 'term:write',
  termResize: 'term:resize'
} as const

/** The typed API exposed on window.bonsai via the preload contextBridge. */
export interface BonsaiApi {
  attach(): Promise<AttachSnapshot>
  start(cwd?: string): Promise<void>
  write(data: string): void
  sendPrompt(text: string): void
  stop(): void
  restart(): Promise<void>
  resize(cols: number, rows: number): void
  clearChat(): Promise<void>
  newSession(): Promise<AttachSnapshot | null>
  openVSCode(): void
  chooseFolder(): Promise<string | null>
  copyConversation(): Promise<string>
  exportMarkdown(): Promise<string | null>
  fileDiff(path: string): Promise<string>
  // Mini-editor: filesystem.
  listDir(path: string): Promise<DirEntry[]>
  readFile(path: string): Promise<FileContent>
  writeFile(path: string, content: string): Promise<boolean>
  // Mini-editor: embedded shell terminal.
  termStart(): Promise<void>
  termWrite(data: string): void
  termResize(cols: number, rows: number): void
  onData(cb: (chunk: DataChunk) => void): () => void
  onState(cb: (state: SessionState) => void): () => void
  onFiles(cb: (files: ChangedFile[]) => void): () => void
  onHistory(cb: (history: HistoryEntry[]) => void): () => void
  onTermData(cb: (chunk: DataChunk) => void): () => void
}
