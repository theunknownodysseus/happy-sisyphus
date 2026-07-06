// Small JSON-file persistence layer stored under Electron's userData directory.
// Survives app restarts so conversation history and the last project are restored.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HistoryEntry } from '../shared/types'

interface Store {
  cwd: string | null
  promptCount: number
  history: HistoryEntry[]
}

const DEFAULT: Store = { cwd: null, promptCount: 0, history: [] }
const MAX_HISTORY = 2000

let cache: Store | null = null

function file(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'bonsai-desktop-store.json')
}

function load(): Store {
  if (cache) return cache
  try {
    const raw = readFileSync(file(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Store>
    cache = { ...DEFAULT, ...parsed, history: parsed.history ?? [] }
  } catch {
    cache = { ...DEFAULT }
  }
  return cache
}

function persist(): void {
  if (!cache) return
  try {
    writeFileSync(file(), JSON.stringify(cache, null, 2), 'utf-8')
  } catch (err) {
    console.error('[persistence] failed to write store:', err)
  }
}

export function getCwd(): string | null {
  return load().cwd
}

export function setCwd(cwd: string): void {
  const s = load()
  s.cwd = cwd
  persist()
}

export function getHistory(): HistoryEntry[] {
  return load().history
}

export function getPromptCount(): number {
  return load().promptCount
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const s = load()
  s.history.push(entry)
  if (entry.role === 'user') s.promptCount += 1
  if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY)
  persist()
  return s.history
}

export function clearHistory(): void {
  const s = load()
  s.history = []
  s.promptCount = 0
  persist()
}
