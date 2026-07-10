import { GitBranch, Sprout } from 'lucide-react'
import type { SessionState } from '../../../shared/types'
import { useGitStatus } from '../hooks/useGitStatus'

interface Props {
  state: SessionState
  filesChanged: number
  history: number
}

const STATUS_DOT: Record<SessionState['light'], string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger'
}

function Sep(): JSX.Element {
  return <span className="h-4 w-px bg-line shrink-0" />
}

export default function Footer({ state, filesChanged, history }: Props): JSX.Element {
  const git = useGitStatus(state.cwd)
  const gitChanges = Object.keys(git.files).length
  return (
    <div className="flex items-center gap-3 h-10 px-3.5 rounded-xl bg-surface1 shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="grid place-items-center h-5 w-5 rounded-[6px] bg-accent-bg">
          <Sprout size={11} strokeWidth={1.75} className="text-accent" />
        </div>
        <span className="text-[12px] font-bold text-fg1">Bonsai</span>
      </div>

      <Sep />

      <span className="text-xs text-fg3 shrink-0">
        {state.projectName && <span className="font-semibold text-fg1">{state.projectName}</span>}
      </span>

      {state.cwd ? (
        <button
          onClick={() => window.bonsai.openFolder()}
          title="Reveal in file manager"
          className="min-w-0 flex-1 truncate text-left font-mono text-[11px] text-fg3 transition hover:text-accent hover:underline"
        >
          {state.cwd}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg3">—</span>
      )}

      <div className="flex items-center gap-3 shrink-0">
        {git.branch && (
          <>
            <span
              className="flex items-center gap-1.5 text-xs text-fg2"
              title={gitChanges ? `${gitChanges} uncommitted change${gitChanges === 1 ? '' : 's'}` : 'Working tree clean'}
            >
              <GitBranch size={12} strokeWidth={1.75} className="text-fg3" />
              <span className="font-mono">{git.branch}</span>
              {gitChanges > 0 && (
                <span className="font-mono font-semibold text-warning">{gitChanges}</span>
              )}
            </span>
            <Sep />
          </>
        )}
        <span className="flex items-center gap-1.5 text-xs text-fg1">
          <span className={`h-[6px] w-[6px] rounded-full animate-pulse-dot ${STATUS_DOT[state.light]}`} />
          {state.label}
        </span>
        <Sep />
        <span className="text-xs text-fg3">
          <span className="font-mono font-semibold text-fg1">{filesChanged}</span> files
        </span>
        <span className="text-xs text-fg3">
          <span className="font-mono font-semibold text-fg1">{history}</span> prompts
        </span>
      </div>
    </div>
  )
}
