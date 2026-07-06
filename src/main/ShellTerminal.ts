// ShellTerminal owns a single persistent, interactive shell running in a PTY.
//
// This is the "run stuff" terminal of the in-app mini editor — independent from
// the Bonsai session's PTY. It spawns the platform shell with NO command so the
// user gets a plain interactive prompt they can type into, rooted at the current
// project directory. Data flows out via the 'data' event; keystrokes come in via
// write(). It re-spawns automatically when the project directory changes.

import { spawn as ptySpawn, type IPty } from '@lydell/node-pty'
import { EventEmitter } from 'node:events'

const IS_WIN = process.platform === 'win32'
const SHELL = IS_WIN ? process.env.ComSpec || 'cmd.exe' : process.env.SHELL || '/bin/bash'

export declare interface ShellTerminal {
  on(event: 'data', cb: (data: string) => void): this
  emit(event: 'data', data: string): boolean
}

export class ShellTerminal extends EventEmitter {
  private pty: IPty | null = null
  private cwd = ''
  private cols = 80
  private rows = 24
  private disposed = false

  /** Ensure a shell is running in `cwd`; re-spawn if the directory changed. */
  start(cwd: string, cols?: number, rows?: number): void {
    if (this.disposed) return
    if (cols) this.cols = cols
    if (rows) this.rows = rows
    // Already running in the right place — nothing to do.
    if (this.pty && this.cwd === cwd) return

    this.kill()
    this.cwd = cwd

    const pty = ptySpawn(SHELL, [], {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: cwd || process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' }
    })
    this.pty = pty

    pty.onData((d) => {
      if (!this.disposed) this.emit('data', d)
    })
    pty.onExit(() => {
      // Only clear if this is still the current PTY (not one we replaced).
      if (this.pty === pty) this.pty = null
    })
  }

  write(data: string): void {
    this.pty?.write(data)
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    try {
      this.pty?.resize(cols, rows)
    } catch {
      /* pty may be gone */
    }
  }

  private kill(): void {
    const p = this.pty
    this.pty = null
    try {
      p?.kill()
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    this.disposed = true
    this.kill()
    this.removeAllListeners()
  }
}
