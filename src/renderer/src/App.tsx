import { AnimatePresence, motion } from 'framer-motion'
import { Check, KeyRound, RefreshCw, Sprout, WifiOff } from 'lucide-react'
import { useState } from 'react'
import ChangedFiles from './components/ChangedFiles'
import EditorView from './components/EditorView'
import Footer from './components/Footer'
import PromptInput from './components/PromptInput'
import ResizeHandle from './components/ResizeHandle'
import TerminalPanel from './components/TerminalPanel'
import Toolbar, { type AppView } from './components/Toolbar'
import { useCollapsible } from './hooks/useCollapsible'
import { useResizablePanel } from './hooks/useResizablePanel'
import { useSession } from './hooks/useSession'
import { useTheme } from './hooks/useTheme'

// Phases during which we overlay a friendly "setting up" panel over the terminal.
const SETUP_PHASES = new Set(['checking', 'installing', 'loggingIn', 'starting', 'awaitingConfirm'])

function SetupOverlay({ phase, label }: { phase: string; label: string }): JSX.Element {
  const steps = [
    { key: 'installing', text: 'Ensuring Bonsai is installed' },
    { key: 'loggingIn', text: 'Waiting for Bonsai login' },
    { key: 'starting', text: 'Starting Bonsai session' },
    { key: 'awaitingConfirm', text: 'Confirming session' }
  ]
  const order = ['checking', 'installing', 'loggingIn', 'starting', 'awaitingConfirm', 'ready']
  const current = order.indexOf(phase)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 grid place-items-center bg-surface1/85 backdrop-blur-sm"
    >
      <div className="w-[380px] rounded-2xl bg-surface1 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="grid place-items-center h-9 w-9 rounded-[10px] bg-accent-bg text-accent shrink-0">
            <Sprout size={18} strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[14.5px] font-bold text-fg1 tracking-tight">Setting up Bonsai</div>
            <div className="text-xs text-fg3">{label}</div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {steps.map((s) => {
            const idx = order.indexOf(s.key)
            const done = current > idx
            const active = phase === s.key
            return (
              <div key={s.key} className="flex items-center gap-2.5 py-1.5">
                {active ? (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                ) : done ? (
                  <Check size={14} strokeWidth={2} className="shrink-0 text-success" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-fg3/40" />
                )}
                <span className={`text-[13px] ${active ? 'font-semibold text-fg1' : done ? 'text-fg3' : 'text-fg3'}`}>
                  {s.text}
                </span>
              </div>
            )
          })}
        </div>
        {phase === 'loggingIn' && (
          <p className="mt-4 text-xs text-fg3 leading-relaxed">
            A browser window has opened for authentication. Complete the login there and this will
            continue automatically.
          </p>
        )}
      </div>
    </motion.div>
  )
}

function LoginCodeOverlay({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 grid place-items-center bg-bg/95 px-4 py-6"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface1 p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent-bg text-accent">
          <KeyRound size={20} strokeWidth={1.75} />
        </div>
        <div className="text-base font-bold text-fg1 mb-1">Paste this code in the browser</div>
        <p className="text-[13px] text-fg3 mb-6 leading-relaxed">
          If the login page did not open automatically, open the browser URL and paste this code to continue.
        </p>
        <div className="mx-auto mb-6 rounded-2xl bg-bg px-8 py-6 text-4xl font-bold tracking-[0.25em] text-fg1 font-mono">
          {code}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          {copied ? 'Copied' : 'Copy code'}
        </button>
        <p className="mt-4 text-xs text-fg3">This code expires in a few minutes.</p>
      </div>
    </motion.div>
  )
}

function ErrorOverlay({ label, onRetry }: { label: string; onRetry: () => void }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 grid place-items-center bg-surface1/85 backdrop-blur-sm"
    >
      <div className="w-[380px] rounded-2xl bg-surface1 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-danger/10 text-danger">
          <WifiOff size={20} strokeWidth={1.75} />
        </div>
        <div className="text-[14.5px] font-bold text-fg1 mb-1">Bonsai isn&rsquo;t running</div>
        <div className="text-xs text-fg3 mb-5">{label}</div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white hover:bg-accent-soft transition"
        >
          <RefreshCw size={14} strokeWidth={2} />
          Restart Bonsai
        </button>
      </div>
    </motion.div>
  )
}

export default function App(): JSX.Element {
  const session = useSession()
  const { state } = session
  const { theme, toggleTheme } = useTheme()
  const [view, setView] = useState<AppView>('chat')
  const showSetup = view === 'chat' && SETUP_PHASES.has(state.phase)
  const showError = view === 'chat' && (state.phase === 'offline' || state.phase === 'error')

  const rightPanel = useResizablePanel({ key: 'bonsai:rightPanelWidth', defaultWidth: 240, min: 180, max: 420, edge: 'left' })
  const filesPanel = useCollapsible('bonsai:filesCollapsed')

  return (
    <div className="flex flex-col h-screen gap-2.5 bg-bg p-2.5">
      <div className="flex flex-1 min-h-0">
        <main className="flex flex-1 min-w-0 flex-col rounded-xl bg-surface1 overflow-hidden">
          <Toolbar
            session={session}
            view={view}
            onViewChange={setView}
            theme={theme}
            onToggleTheme={toggleTheme}
            streaming={session.streaming}
            filesCollapsed={filesPanel.collapsed}
            onToggleFiles={filesPanel.toggle}
          />
          {view === 'chat' ? (
            <>
              <div className="relative flex flex-1 min-h-0 flex-col px-4 pt-3">
                <AnimatePresence>
                  {showSetup && <SetupOverlay key="setup" phase={state.phase} label={state.label} />}
                  {state.phase === 'loggingIn' && state.authCode && (
                    <LoginCodeOverlay key="login-code" code={state.authCode} />
                  )}
                  {showError && (
                    <ErrorOverlay
                      key="err"
                      label={state.label}
                      onRetry={() => session.actions.restart()}
                    />
                  )}
                </AnimatePresence>
                <TerminalPanel session={session} theme={theme} />
              </div>
              <PromptInput session={session} />
            </>
          ) : (
            <EditorView key={state.cwd} state={state} theme={theme} />
          )}
        </main>

        {!filesPanel.collapsed && (
          <>
            <ResizeHandle onPointerDown={rightPanel.onHandlePointerDown} />
            <ChangedFiles width={rightPanel.width} files={session.files} />
          </>
        )}
      </div>

      <Footer state={state} filesChanged={session.files.length} history={session.state.promptCount} />
    </div>
  )
}
