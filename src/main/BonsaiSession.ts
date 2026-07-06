// BonsaiSession owns the persistent Bonsai CLI process running inside a PTY.
//
// Bonsai is a full-screen Ink TUI (React-for-terminals): it renders ANSI and
// reads raw-mode keystrokes, so it MUST be driven through a pseudo-terminal
// (node-pty) rather than child_process.spawn + line writes. The startup
// "Continue?" confirmation is a horizontal Yes/No selector answered with an
// arrow key + Enter, which we send automatically.
//
// Lifecycle: idle -> checking -> [installing] -> starting
//            -> [loggingIn -> starting]  (only if `bonsai start` reports it's
//               not authenticated; login runs lazily, then start is relaunched)
//            -> awaitingConfirm -> ready -> (offline on exit)

import { spawn as ptySpawn, type IPty } from '@lydell/node-pty'
import { execFile } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { basename } from 'node:path'
import { shell } from 'electron'
import { stripAnsi } from './ansi'
import type { ConnectionLight, SessionPhase, SessionState } from '../shared/types'

const IS_WIN = process.platform === 'win32'
const SHELL = IS_WIN ? process.env.ComSpec || 'cmd.exe' : '/bin/sh'
/** Keep the last ~512 KB of raw PTY output for replay on renderer reload. */
const RING_MAX = 512 * 1024
/** Consider Bonsai "streaming" while data keeps arriving within this window. */
const STREAM_IDLE_MS = 600
/** Abandon a `bonsai login` that never completes (device codes expire ~5 min). */
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

function phaseToLight(phase: SessionPhase): ConnectionLight {
  switch (phase) {
    case 'ready':
      return 'green'
    case 'offline':
    case 'error':
      return 'red'
    default:
      return 'yellow'
  }
}

function phaseToLabel(phase: SessionPhase): string {
  switch (phase) {
    case 'idle':
      return 'Idle'
    case 'checking':
      return 'Checking Bonsai…'
    case 'installing':
      return 'Installing Bonsai…'
    case 'loggingIn':
      return 'Waiting for Bonsai login…'
    case 'starting':
      return 'Starting Bonsai…'
    case 'awaitingConfirm':
      return 'Confirming session…'
    case 'ready':
      return 'Bonsai Running'
    case 'offline':
      return 'Bonsai Offline'
    case 'error':
      return 'Error'
  }
}

export declare interface BonsaiSession {
  on(event: 'data', cb: (data: string) => void): this
  on(event: 'state', cb: (state: SessionState) => void): this
  emit(event: 'data', data: string): boolean
  emit(event: 'state', state: SessionState): boolean
}

export class BonsaiSession extends EventEmitter {
  private pty: IPty | null = null
  private phase: SessionPhase = 'idle'
  private cwd = process.cwd()
  private ring = ''
  private cols = 120
  private rows = 30
  private confirmed = false
  /** Guards the one-shot "start said we're not authed -> log in" fallback. */
  private authFallbackTriggered = false
  private authCode?: string
  private errorMsg?: string
  private streamTimer: NodeJS.Timeout | null = null
  private disposed = false
  /** When Bonsai isn't installed globally, use `npx -y bonsai` instead. */
  private useNpx = false
  /** Transient PTYs (login / install) tracked so dispose() can kill them too. */
  private transient = new Set<IPty>()

  // ---- public accessors -------------------------------------------------

  get state(): SessionState {
    return {
      phase: this.phase,
      light: phaseToLight(this.phase),
      label: this.phase === 'error' && this.errorMsg ? this.errorMsg : phaseToLabel(this.phase),
      cwd: this.cwd,
      projectName: basename(this.cwd) || this.cwd,
      promptCount: 0, // filled in by the caller (from persistence)
      authCode: this.authCode,
      error: this.errorMsg
    }
  }

  get buffer(): string {
    return this.ring
  }

  // ---- lifecycle --------------------------------------------------------

  /**
   * Full boot sequence: ensure installed -> start.
   *
   * Login is NOT run up front: `bonsai login` never short-circuits when the
   * user is already authenticated — it always opens a fresh device-auth flow
   * and only exits once a *new* browser login completes, so pre-running it
   * strands an already-logged-in user at "Waiting for authentication" forever.
   * Instead `bonsai start` is the auth gate: it runs straight into the TUI when
   * authenticated, and prints "Not authenticated. Run `bonsai login` first."
   * otherwise. startSession() watches for that and logs in lazily, once.
   */
  async boot(cwd: string): Promise<void> {
    this.cwd = cwd
    this.confirmed = false
    this.errorMsg = undefined

    this.setPhase('checking')
    const installed = await this.isInstalled()
    if (this.disposed) return
    this.useNpx = !installed
    if (!installed) {
      this.setPhase('installing')
      const ok = await this.runToCompletion(this.wrap('npx -y bonsai --version'))
      if (this.disposed) return
      if (!ok) return this.fail('Bonsai CLI unavailable; install failed')
    }

    await this.startSession()
  }

  /** Just (re)start the persistent `bonsai start` PTY (logs in lazily if needed). */
  async startSession(): Promise<void> {
    this.disposePty()
    this.confirmed = false
    this.authFallbackTriggered = false
    // Drop any stale scrollback so old "Not authenticated"/"Continue?" text
    // from a prior attempt can't re-trigger detection against the fresh PTY.
    this.ring = ''
    this.setPhase('starting')

    const command = this.useNpx ? 'npx -y bonsai start' : 'bonsai start'
    const pty = ptySpawn(SHELL, this.shellArgs(command), {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: this.cwd,
      env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' }
    })
    this.pty = pty

    pty.onData((d) => this.onPtyData(d))
    pty.onExit(({ exitCode }) => {
      // Ignore the exit of a PTY we deliberately replaced (restart) or killed
      // to hand off to login — only the still-current PTY drives phase changes.
      if (this.pty !== pty) return
      this.pty = null
      if (this.phase !== 'error') {
        this.errorMsg = exitCode ? `Bonsai exited (code ${exitCode})` : undefined
        this.setPhase('offline')
      }
    })
  }

  /** Restart the session in place (used after a crash or by the toolbar). */
  async restart(): Promise<void> {
    await this.startSession()
  }

  /** Point at a new working directory and reboot the session. */
  async setCwdAndRestart(cwd: string): Promise<void> {
    this.cwd = cwd
    this.ring = ''
    await this.startSession()
  }

  // ---- input ------------------------------------------------------------

  /** Raw passthrough (used by xterm keystrokes if the terminal is focused). */
  write(data: string): void {
    this.pty?.write(data)
  }

  /** Send a user prompt: type the text then submit with Enter. */
  sendPrompt(text: string): void {
    if (!this.pty || this.phase !== 'ready') return
    this.pty.write(text)
    // Give Ink a beat to ingest the text before submitting.
    setTimeout(() => this.pty?.write('\r'), 40)
  }

  /** Stop generation — send Ctrl-C to the TUI. */
  stop(): void {
    this.pty?.write('\x03')
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

  clearRing(): void {
    this.ring = ''
  }

  dispose(): void {
    this.disposed = true
    if (this.streamTimer) clearTimeout(this.streamTimer)
    this.streamTimer = null
    for (const p of this.transient) {
      try {
        p.kill()
      } catch {
        /* ignore */
      }
    }
    this.transient.clear()
    this.disposePty()
    this.removeAllListeners()
  }

  // ---- internals --------------------------------------------------------

  private onPtyData(d: string): void {
    if (this.disposed) return
    this.ring = (this.ring + d).slice(-RING_MAX)
    this.emit('data', d)
    if (!this.maybeDetectAuth()) this.maybeAutoConfirm()
    this.markStreaming()
  }

  /**
   * Detect `bonsai start`'s "not authenticated" gate. When seen, kill the
   * start PTY, run `bonsai login` once, then relaunch start. Returns true if it
   * consumed this data chunk (so auto-confirm is skipped for it).
   */
  private maybeDetectAuth(): boolean {
    if (this.authFallbackTriggered || this.phase !== 'starting') return false
    const tail = stripAnsi(this.ring).slice(-4000)
    if (!/not authenticated/i.test(tail) && !/bonsai login/i.test(tail)) return false

    this.authFallbackTriggered = true
    this.disposePty() // stop the start PTY that's asking us to log in
    this.setPhase('loggingIn')
    void this.runLogin().then((ok) => {
      if (this.disposed) return
      if (!ok) return this.fail('Bonsai login did not complete')
      void this.startSession()
    })
    return true
  }

  /** Detect the "Continue?" Yes/No prompt and auto-answer Yes exactly once. */
  private maybeAutoConfirm(): void {
    // Already answered — nothing to do. We do NOT try to detect the prompt's
    // *disappearance* here: `this.ring` is append-only raw scrollback and Bonsai
    // (an Ink TUI) redraws by moving/clearing the cursor rather than erasing the
    // bytes it already emitted, so the literal "Continue?" stays in the buffer
    // forever. The transition to `ready` is driven by a timer in the answer path.
    if (this.confirmed) return

    const tail = stripAnsi(this.ring).slice(-4000)
    if (/Continue\?/.test(tail) && /\bYes\b/.test(tail) && /\bNo\b/.test(tail)) {
      this.confirmed = true
      this.setPhase('awaitingConfirm')
      // Default selection is "No"; Left arrow highlights "Yes", then Enter.
      setTimeout(() => {
        this.pty?.write('\x1b[D')
        setTimeout(() => {
          this.pty?.write('\r')
          // The prompt is answered; give the TUI a beat to swap to its main view.
          // We can't reliably observe the prompt vanishing from the scrollback
          // ring, so consider the session live once the keystrokes are sent.
          setTimeout(() => {
            if (this.phase === 'awaitingConfirm') this.setPhase('ready')
          }, 500)
        }, 140)
      }, 180)
    }
  }

  private markStreaming(): void {
    if (this.streamTimer) clearTimeout(this.streamTimer)
    this.streamTimer = setTimeout(() => {
      this.streamTimer = null
    }, STREAM_IDLE_MS)
  }

  get isStreaming(): boolean {
    return this.streamTimer != null
  }

  private setPhase(phase: SessionPhase): void {
    if (this.disposed || this.phase === phase) return
    this.phase = phase
    if (phase !== 'loggingIn') {
      this.authCode = undefined
    }
    this.emit('state', this.state)
  }

  private fail(msg: string): void {
    this.errorMsg = msg
    this.setPhase('error')
  }

  private disposePty(): void {
    const p = this.pty
    this.pty = null
    try {
      p?.kill()
    } catch {
      /* ignore */
    }
  }

  /**
   * `bonsai login` runs to completion in its own PTY; exit 0 == success.
   * Bounded by LOGIN_TIMEOUT_MS (device codes expire in ~5 min) so a login the
   * user never finishes ends in a retryable error instead of hanging forever.
   */
  private runLogin(): Promise<boolean> {
    const command = this.useNpx ? 'npx -y bonsai login' : 'bonsai login'
    return new Promise((resolve) => {
      if (this.disposed) return resolve(false)
      const pty = ptySpawn(SHELL, this.shellArgs(command), {
        name: 'xterm-256color',
        cols: this.cols,
        rows: this.rows,
        cwd: this.cwd,
        env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' }
      })
      this.transient.add(pty)
      let opened = false
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        this.transient.delete(pty)
        try {
          pty.kill()
        } catch {
          /* already gone */
        }
        resolve(false)
      }, LOGIN_TIMEOUT_MS)

      pty.onData((d) => {
        if (this.disposed) return
        this.ring = (this.ring + d).slice(-RING_MAX)
        this.emit('data', d)
        if (!opened) {
          const url = this.extractAuthUrl(d)
          if (url) {
            opened = true
            this.openAuthUrl(url)
          }
        }
        const authCode = this.extractAuthCode(d)
        if (authCode && authCode !== this.authCode) {
          this.authCode = authCode
          this.emit('state', this.state)
        }
      })

      pty.onExit(({ exitCode }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this.transient.delete(pty)
        resolve(exitCode === 0)
      })
    })
  }

  /** Run a command in a throwaway (tracked) PTY; resolve true on exit-0. */
  private runToCompletion(cmd: string): Promise<boolean> {
    return this.runTransient(cmd)
  }

  private runTransient(cmd: string, timeoutMs?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.disposed) return resolve(false)
      const pty = ptySpawn(SHELL, this.shellArgs(cmd), {
        name: 'xterm-256color',
        cols: this.cols,
        rows: this.rows,
        cwd: this.cwd,
        env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' }
      })
      this.transient.add(pty)
      let settled = false
      const timer =
        timeoutMs != null
          ? setTimeout(() => {
              if (settled) return
              settled = true
              this.transient.delete(pty)
              try {
                pty.kill()
              } catch {
                /* already gone */
              }
              resolve(false)
            }, timeoutMs)
          : null
      pty.onData((d) => {
        if (this.disposed) return
        this.ring = (this.ring + d).slice(-RING_MAX)
        this.emit('data', d)
      })
      pty.onExit(({ exitCode }) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        this.transient.delete(pty)
        resolve(exitCode === 0)
      })
    })
  }

  private isInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const finder = IS_WIN ? 'where' : 'which'
      execFile(finder, ['bonsai'], { shell: IS_WIN }, (err) => resolve(!err))
    })
  }

  private openAuthUrl(url: string): void {
    if (process.platform === 'win32') {
      execFile('cmd', ['/c', 'start', 'chrome', url], { shell: true }, (err) => {
        if (err) shell.openExternal(url)
      })
      return
    }

    if (process.platform === 'darwin') {
      execFile('open', ['-a', 'Google Chrome', url], (err) => {
        if (err) shell.openExternal(url)
      })
      return
    }

    execFile('google-chrome', [url], (err) => {
      if (!err) return
      execFile('google-chrome-stable', [url], (err2) => {
        if (err2) shell.openExternal(url)
      })
    })
  }

  private extractAuthUrl(text: string): string | null {
    const matches = text.match(/https?:\/\/[^\s)]+/g)
    if (!matches) return null
    for (const candidate of matches) {
      if (candidate.includes('device') || candidate.includes('auth.trybons.ai')) {
        return candidate.replace(/["']+$/g, '')
      }
    }
    return null
  }
  private extractAuthCode(text: string): string | null {
    const urlMatches = text.match(/https?:\/\/[^\s)]+/g) || []
    for (const candidate of urlMatches) {
      const found = candidate.match(/[?&]user_code=([A-Z0-9-]+)/i)
      if (found?.[1]) return found[1]
    }
    const textMatch = text.match(/user_code\s*[:=]?\s*([A-Z0-9-]{8,15})/i)
    if (textMatch?.[1]) return textMatch[1]
    const plainMatch = text.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/i)
    return plainMatch?.[1] ?? null
  }
  /** Build shell args to run a command line non-interactively-launched. */
  private shellArgs(cmd: string): string[] {
    return IS_WIN ? ['/d', '/s', '/c', cmd] : ['-lc', cmd]
  }

  /** For clarity at call sites that pass a raw command. */
  private wrap(cmd: string): string {
    return cmd
  }
}
