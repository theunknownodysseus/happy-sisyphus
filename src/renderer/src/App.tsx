import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import ChangedFiles from './components/ChangedFiles'
import EditorView from './components/EditorView'
import PromptInput from './components/PromptInput'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import TerminalPanel from './components/TerminalPanel'
import Toolbar, { type AppView } from './components/Toolbar'
import { useSession } from './hooks/useSession'

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
      className="absolute inset-0 z-10 grid place-items-center bg-base-850/85 backdrop-blur-sm"
    >
      <div className="w-[380px] rounded-2xl border border-base-700 bg-base-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 text-accent text-xl">
            🌱
          </div>
          <div>
            <div className="text-base font-semibold text-gray-100">Setting up Bonsai</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {steps.map((s) => {
            const idx = order.indexOf(s.key)
            const done = current > idx
            const active = phase === s.key
            return (
              <div key={s.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`grid place-items-center h-5 w-5 rounded-full text-[11px] ${
                    done
                      ? 'bg-accent text-base-900'
                      : active
                        ? 'bg-accent/20 text-accent animate-pulseGlow'
                        : 'bg-base-700 text-gray-500'
                  }`}
                >
                  {done ? '✓' : active ? '•' : ''}
                </span>
                <span className={done ? 'text-gray-400' : active ? 'text-gray-100' : 'text-gray-600'}>
                  {s.text}
                </span>
              </div>
            )
          })}
        </div>
        {phase === 'loggingIn' && (
          <p className="mt-4 text-xs text-gray-500 leading-relaxed">
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
      className="absolute inset-0 z-20 grid place-items-center bg-base-950/95 px-4 py-6"
    >
      <div className="w-full max-w-3xl rounded-3xl border border-base-700 bg-base-800 p-8 shadow-2xl text-center">
        <div className="text-3xl mb-4">🔐 Paste this code in the browser</div>
        <p className="text-sm text-gray-400 mb-6">
          If the login page did not open automatically, open the browser URL and paste this code to continue.
        </p>
        <div className="mx-auto mb-6 rounded-3xl border border-accent/30 bg-base-900 px-8 py-6 text-4xl font-semibold tracking-[0.3em] text-white">
          {code}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-base-900 transition hover:bg-accent-soft"
        >
          {copied ? 'Copied!' : 'Copy code'}
        </button>
        <p className="mt-4 text-xs text-gray-500">
          This code expires in a few minutes.
        </p>
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
      className="absolute inset-0 z-10 grid place-items-center bg-base-850/85 backdrop-blur-sm"
    >
      <div className="w-[380px] rounded-2xl border border-red-500/30 bg-base-800 p-6 text-center shadow-2xl">
        <div className="text-3xl mb-2">🔴</div>
        <div className="text-base font-semibold text-gray-100 mb-1">Bonsai isn’t running</div>
        <div className="text-xs text-gray-500 mb-4">{label}</div>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-base-900 hover:bg-accent-soft transition"
        >
          ⟳ Restart Bonsai
        </button>
      </div>
    </motion.div>
  )
}

export default function App(): JSX.Element {
  const session = useSession()
  const { state } = session
  const [view, setView] = useState<AppView>('chat')
  const showSetup = view === 'chat' && SETUP_PHASES.has(state.phase)
  const showError = view === 'chat' && (state.phase === 'offline' || state.phase === 'error')

  return (
    <div className="flex flex-col h-screen">
      <StatusBar state={state} streaming={session.streaming} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          state={state}
          filesChanged={session.files.length}
          history={session.state.promptCount}
        />

        <main className="flex flex-1 min-w-0 flex-col">
          <Toolbar session={session} view={view} onViewChange={setView} />
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
                <TerminalPanel session={session} />
              </div>
              <PromptInput session={session} />
            </>
          ) : (
            <EditorView key={state.cwd} state={state} />
          )}
        </main>

        <ChangedFiles files={session.files} />
      </div>
    </div>
  )
}
