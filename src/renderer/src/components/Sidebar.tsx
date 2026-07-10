import { Sprout } from 'lucide-react'
import type { ChangedFile, SessionState } from '../../../shared/types'

interface Props {
  state: SessionState
  filesChanged: number
  history: number
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="px-3 py-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-fg3 mb-1">{label}</div>
      <div className={`text-[13px] text-fg1 leading-tight break-all ${mono ? 'font-mono text-[11px] text-fg2' : 'font-semibold'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="flex-1 rounded-xl bg-bg p-3">
      <div className="text-[10.5px] uppercase tracking-wide text-fg3 mb-1">{label}</div>
      <div className="font-mono text-[17px] font-semibold text-fg1">{value}</div>
    </div>
  )
}

const STATUS_DOT: Record<SessionState['light'], string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger'
}

export default function Sidebar({ state, filesChanged, history }: Props): JSX.Element {
  return (
    <aside className="w-60 shrink-0 flex flex-col rounded-xl bg-surface1 p-3.5">
      <div className="flex items-center gap-[9px] px-1.5 mb-6">
        <div className="grid place-items-center h-[26px] w-[26px] rounded-[7px] bg-accent-bg shrink-0">
          <Sprout size={14} strokeWidth={1.75} className="text-accent" />
        </div>
        <div className="text-[13.5px] font-bold text-fg1 tracking-[-0.01em]">Bonsai</div>
      </div>

      <Field label="Project" value={state.projectName} />
      <Field label="Root" value={state.cwd} mono />

      <div className="flex items-center gap-2 px-3 py-2.5 mt-1 mb-4">
        <span
          className={`h-[7px] w-[7px] rounded-full shrink-0 animate-pulse-dot ${STATUS_DOT[state.light]}`}
        />
        <span className="text-xs font-medium text-fg1">{state.label}</span>
      </div>

      <div className="flex gap-2 px-1 mb-auto">
        <Stat label="Files" value={filesChanged} />
        <Stat label="Prompts" value={history} />
      </div>

      <div className="text-[11px] leading-relaxed text-fg3 px-1.5 pt-3">
        VS Code stays your editor. This window is the conversational interface to Bonsai CLI.
      </div>
    </aside>
  )
}

export type { ChangedFile }
