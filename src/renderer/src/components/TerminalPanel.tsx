import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { SessionHook } from '../hooks/useSession'
import type { Theme } from '../hooks/useTheme'
import { xtermTheme } from '../xterm-theme'

interface Props {
  session: SessionHook
  theme: Theme
}

// The live Bonsai TUI, rendered faithfully via xterm.js. Raw keystrokes typed
// while the terminal is focused are forwarded to the PTY; PTY output is written
// straight back. On (re)mount we replay the buffer captured by the main process.
export default function TerminalPanel({ session, theme }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true,
      theme: xtermTheme(theme)
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(hostRef.current)
    termRef.current = term
    fitRef.current = fit

    // Replay captured scrollback so a reloaded UI restores Bonsai's screen.
    if (session.initialBuffer) term.write(session.initialBuffer)

    const doFit = (): void => {
      try {
        fit.fit()
        session.actions.resize(term.cols, term.rows)
      } catch {
        /* not visible yet */
      }
    }
    // Fit after layout settles.
    const raf = requestAnimationFrame(doFit)

    // PTY output -> terminal.
    const unData = session.onData((data) => term.write(data))

    // Terminal keystrokes -> PTY (lets the user interact with the raw TUI).
    const keyDisp = term.onData((data) => session.actions.write(data))

    const ro = new ResizeObserver(() => doFit())
    ro.observe(hostRef.current)
    window.addEventListener('resize', doFit)

    return () => {
      cancelAnimationFrame(raf)
      unData()
      keyDisp.dispose()
      ro.disconnect()
      window.removeEventListener('resize', doFit)
      term.dispose()
      termRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-theme the live terminal instance in place when the app theme flips.
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = xtermTheme(theme)
  }, [theme])

  return (
    <div className="relative flex-1 min-h-0 rounded-xl bg-surface2 overflow-hidden">
      <div ref={hostRef} className="terminal-host absolute inset-0" />
    </div>
  )
}
