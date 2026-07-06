import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

// An interactive shell terminal for the mini-editor. Mirrors TerminalPanel's
// xterm setup but is wired to the standalone shell PTY (window.bonsai.term*)
// rather than the Bonsai session, so the user can run arbitrary commands.
export default function EditorTerminal(): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true,
      theme: {
        background: '#0e1015',
        foreground: '#d6dae4',
        cursor: '#4ade80',
        selectionBackground: '#2f3550'
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(hostRef.current)

    const doFit = (): void => {
      try {
        fit.fit()
        window.bonsai.termResize(term.cols, term.rows)
      } catch {
        /* not visible yet */
      }
    }

    // Start (or reuse) the shell PTY, then size it to the current viewport.
    void window.bonsai.termStart().then(doFit)

    const raf = requestAnimationFrame(doFit)
    const unData = window.bonsai.onTermData(({ data }) => term.write(data))
    const keyDisp = term.onData((data) => window.bonsai.termWrite(data))

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
    }
  }, [])

  return (
    <div className="relative h-full border-t border-base-700 bg-base-850 overflow-hidden">
      <div ref={hostRef} className="terminal-host absolute inset-0" />
    </div>
  )
}
