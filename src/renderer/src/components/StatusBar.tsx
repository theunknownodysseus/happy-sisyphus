import { motion } from 'framer-motion'
import type { SessionState } from '../../../shared/types'

const LIGHT_COLOR: Record<SessionState['light'], string> = {
  green: '#4ade80',
  yellow: '#fbbf24',
  red: '#f87171'
}

interface Props {
  state: SessionState
  streaming: boolean
}

export default function StatusBar({ state, streaming }: Props): JSX.Element {
  const color = LIGHT_COLOR[state.light]
  return (
    <header className="flex items-center gap-3 h-11 px-4 border-b border-base-700 bg-base-900/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {state.light === 'green' && (
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ backgroundColor: color }}
              animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        </span>
        <span className="text-sm font-medium text-gray-200">
          {state.light === 'green' ? 'Connected' : state.light === 'yellow' ? 'Connecting' : 'Offline'}
        </span>
      </div>

      <span className="text-base-500">·</span>
      <span className="text-sm text-gray-400">{state.label}</span>

      {streaming && (
        <span className="flex items-center gap-1 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseGlow" />
          streaming
        </span>
      )}

      <div className="ml-auto flex items-center gap-2 text-sm">
        <span className="text-gray-500">Project</span>
        <span className="font-semibold text-gray-200">{state.projectName || '—'}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
        <span>🌱</span>
        <span>Bonsai Desktop</span>
      </div>
    </header>
  )
}
