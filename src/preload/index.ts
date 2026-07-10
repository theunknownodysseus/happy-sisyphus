// Preload: exposes a typed, minimal API on window.bonsai via contextBridge.
// The renderer never touches ipcRenderer directly.

import { contextBridge, ipcRenderer } from 'electron'
import {
  CMD,
  EVT,
  type AttachSnapshot,
  type BonsaiApi,
  type ChangedFile,
  type DataChunk,
  type DirEntry,
  type FileContent,
  type GitStatus,
  type HistoryEntry,
  type SessionState
} from '../shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: BonsaiApi = {
  attach: () => ipcRenderer.invoke(CMD.attach) as Promise<AttachSnapshot>,
  start: (cwd) => ipcRenderer.invoke(CMD.start, cwd) as Promise<void>,
  write: (data) => ipcRenderer.send(CMD.write, data),
  sendPrompt: (text) => ipcRenderer.send(CMD.sendPrompt, text),
  stop: () => ipcRenderer.send(CMD.stop),
  restart: () => ipcRenderer.invoke(CMD.restart) as Promise<void>,
  resize: (cols, rows) => ipcRenderer.send(CMD.resize, cols, rows),
  clearChat: () => ipcRenderer.invoke(CMD.clearChat) as Promise<void>,
  newSession: () => ipcRenderer.invoke(CMD.newSession) as Promise<AttachSnapshot | null>,
  openVSCode: () => ipcRenderer.send(CMD.openVSCode),
  openFolder: () => ipcRenderer.send(CMD.openFolder),
  chooseFolder: () => ipcRenderer.invoke(CMD.chooseFolder) as Promise<string | null>,
  copyConversation: () => ipcRenderer.invoke(CMD.copyConversation) as Promise<string>,
  exportMarkdown: () => ipcRenderer.invoke(CMD.exportMarkdown) as Promise<string | null>,
  fileDiff: (path) => ipcRenderer.invoke(CMD.fileDiff, path) as Promise<string>,
  gitStatus: () => ipcRenderer.invoke(CMD.gitStatus) as Promise<GitStatus>,
  listDir: (path) => ipcRenderer.invoke(CMD.listDir, path) as Promise<DirEntry[]>,
  listAllFiles: () => ipcRenderer.invoke(CMD.listAllFiles) as Promise<string[]>,
  readFile: (path) => ipcRenderer.invoke(CMD.readFile, path) as Promise<FileContent>,
  writeFile: (path, content) => ipcRenderer.invoke(CMD.writeFile, path, content) as Promise<boolean>,
  termStart: () => ipcRenderer.invoke(CMD.termStart) as Promise<void>,
  termWrite: (data) => ipcRenderer.send(CMD.termWrite, data),
  termResize: (cols, rows) => ipcRenderer.send(CMD.termResize, cols, rows),
  onData: (cb) => subscribe<DataChunk>(EVT.data, cb),
  onState: (cb) => subscribe<SessionState>(EVT.state, cb),
  onFiles: (cb) => subscribe<ChangedFile[]>(EVT.files, cb),
  onHistory: (cb) => subscribe<HistoryEntry[]>(EVT.history, cb),
  onTermData: (cb) => subscribe<DataChunk>(EVT.termData, cb)
}

contextBridge.exposeInMainWorld('bonsai', api)
