import type { ChangedFile, SessionState } from '../../../shared/types'

interface Props {
  state: SessionState
  filesChanged: number
  history: number
}

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-sm text-gray-200 font-medium break-all">{value}</span>
    </div>
  )
}

const STATUS_DOT: Record<SessionState['light'], string> = {
  green: 'bg-accent',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400'
}

export default function Sidebar({ state, filesChanged, history }: Props): JSX.Element {
  return (
    <aside className="w-64 shrink-0 flex flex-col gap-5 p-4 border-r border-base-700 bg-base-850">
      <div className="flex items-center gap-2">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent">🌱</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-100">Bonsai</div>
          <div className="text-[11px] text-gray-500">Desktop Assistant</div>
        </div>
      </div>

      <div className="h-px bg-base-700" />

      <div className="flex flex-col gap-4">
        <Stat label="Current Project" value={state.projectName || '—'} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Root</span>
          <span className="text-xs text-gray-400 font-mono break-all">{state.cwd || '—'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[state.light]}`} />
          <span className="text-sm text-gray-300">{state.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Stat label="Files Changed" value={filesChanged} />
          <Stat label="Conversation" value={`${history} prompts`} />
        </div>
      </div>

      <div className="mt-auto text-[11px] text-gray-600 leading-relaxed">
        VS Code stays your editor. This window is the conversational interface to the running
        Bonsai CLI.
      </div>
    </aside>
  )
}

export type { ChangedFile }
