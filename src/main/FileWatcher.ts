// Watches the Bonsai working directory and reports changed files to the UI.
// Debounced so a burst of edits (as Bonsai writes several files) collapses into
// a single update.

import chokidar, { type FSWatcher } from 'chokidar'
import { relative, sep } from 'node:path'
import type { ChangedFile } from '../shared/types'

const IGNORED = [
  /(^|[/\\])\../, // dotfiles/dirs (.git, .bonsai, ...)
  /node_modules/,
  /[/\\](dist|build|out|coverage|\.next|\.turbo)([/\\]|$)/
]

export class FileWatcher {
  private watcher: FSWatcher | null = null
  private changed = new Map<string, ChangedFile>()
  private timer: NodeJS.Timeout | null = null
  private root = ''

  constructor(private onChange: (files: ChangedFile[]) => void) {}

  start(root: string): void {
    this.stop()
    this.root = root
    this.changed.clear()
    this.watcher = chokidar.watch(root, {
      ignored: IGNORED,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      depth: 12
    })
    this.watcher
      .on('add', (p) => this.record(p, 'add'))
      .on('change', (p) => this.record(p, 'change'))
      .on('unlink', (p) => this.record(p, 'unlink'))
      .on('error', (err) => console.error('[watcher] error:', err))
  }

  private record(absPath: string, kind: ChangedFile['kind']): void {
    const rel = relative(this.root, absPath).split(sep).join('/')
    if (!rel || rel.startsWith('..')) return
    this.changed.set(rel, { path: rel, kind, at: Date.now() })
    this.flushLater()
  }

  private flushLater(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.onChange(this.snapshot())
    }, 250)
  }

  snapshot(): ChangedFile[] {
    return [...this.changed.values()].sort((a, b) => b.at - a.at)
  }

  clear(): void {
    this.changed.clear()
    this.onChange([])
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    void this.watcher?.close()
    this.watcher = null
  }
}
