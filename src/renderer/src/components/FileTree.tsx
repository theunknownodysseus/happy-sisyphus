import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DirEntry, GitFileState, GitStatus } from '../../../shared/types'
import { useGitStatus } from '../hooks/useGitStatus'

interface Props {
  /** Absolute project root path; used only as a remount key by the parent. */
  root: string
  /** Currently open file (relative path), highlighted in the tree. */
  activePath: string | null
  onOpenFile: (path: string) => void
}

// VS Code-style explorer coloring: modified yellow M, untracked/staged green
// U/A, deleted red D. Directories inherit a badge-less tint when any file
// under them has a state.
const STATE_META: Record<GitFileState, { cls: string; badge: string }> = {
  modified: { cls: 'text-warning', badge: 'M' },
  staged: { cls: 'text-success', badge: 'A' },
  untracked: { cls: 'text-success', badge: 'U' },
  deleted: { cls: 'text-danger', badge: 'D' }
}

/** State for a directory: the most severe state of anything under it. */
function dirState(git: GitStatus, dir: string): GitFileState | undefined {
  const prefix = dir + '/'
  let found: GitFileState | undefined
  for (const [path, state] of Object.entries(git.files)) {
    if (!path.startsWith(prefix)) continue
    if (state === 'deleted' || state === 'modified') return state
    found = found ?? state
  }
  return found
}

// A lazy, expandable file tree rooted at the project directory. Each directory
// fetches its children on first expand via window.bonsai.listDir.
export default function FileTree({ root, activePath, onOpenFile }: Props): JSX.Element {
  const git = useGitStatus(root)
  return (
    <div className="w-60 shrink-0 flex flex-col rounded-xl bg-surface1">
      <div className="flex items-center h-[46px] px-4">
        <span className="text-[12.5px] font-semibold text-fg1">Explorer</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
        <DirNode dir="" depth={0} git={git} activePath={activePath} onOpenFile={onOpenFile} defaultOpen />
      </div>
    </div>
  )
}

function DirNode({
  dir,
  depth,
  git,
  activePath,
  onOpenFile,
  defaultOpen = false
}: {
  dir: string
  depth: number
  git: GitStatus
  activePath: string | null
  onOpenFile: (path: string) => void
  defaultOpen?: boolean
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const [entries, setEntries] = useState<DirEntry[] | null>(null)

  useEffect(() => {
    if (!open || entries) return
    let alive = true
    window.bonsai.listDir(dir).then((list) => {
      if (alive) setEntries(list)
    })
    return () => {
      alive = false
    }
  }, [open, entries, dir])

  return (
    <>
      {open &&
        (entries === null ? (
          <Row depth={depth} label="loading" muted />
        ) : entries.length === 0 ? (
          <Row depth={depth} label="empty" muted />
        ) : (
          entries.map((e) =>
            e.isDir ? (
              <ExpandableDir
                key={e.path}
                entry={e}
                depth={depth}
                git={git}
                activePath={activePath}
                onOpenFile={onOpenFile}
              />
            ) : (
              <Row
                key={e.path}
                depth={depth}
                icon={<File size={13} strokeWidth={1.75} />}
                label={e.name}
                state={git.files[e.path]}
                active={activePath === e.path}
                onClick={() => onOpenFile(e.path)}
              />
            )
          )
        ))}
    </>
  )
}

function ExpandableDir({
  entry,
  depth,
  git,
  activePath,
  onOpenFile
}: {
  entry: DirEntry
  depth: number
  git: GitStatus
  activePath: string | null
  onOpenFile: (path: string) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Row
        depth={depth}
        icon={
          open ? <FolderOpen size={13} strokeWidth={1.75} /> : <Folder size={13} strokeWidth={1.75} />
        }
        label={entry.name}
        state={dirState(git, entry.path)}
        hideBadge
        caret={
          open ? <ChevronDown size={11} strokeWidth={2} /> : <ChevronRight size={11} strokeWidth={2} />
        }
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <DirNode
          dir={entry.path}
          depth={depth + 1}
          git={git}
          activePath={activePath}
          onOpenFile={onOpenFile}
          defaultOpen
        />
      )}
    </>
  )
}

function Row({
  depth,
  icon,
  label,
  caret,
  state,
  hideBadge,
  active,
  muted,
  onClick
}: {
  depth: number
  icon?: React.ReactNode
  label: string
  caret?: React.ReactNode
  state?: GitFileState
  /** Directories tint their label but skip the letter badge. */
  hideBadge?: boolean
  active?: boolean
  muted?: boolean
  onClick?: () => void
}): JSX.Element {
  const meta = state ? STATE_META[state] : null
  const labelCls = active
    ? 'text-accent'
    : muted
      ? 'text-fg3'
      : meta
        ? meta.cls
        : 'text-fg2'
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-1.5 py-[5px] pr-2 rounded-md text-left text-xs font-mono transition
        ${active ? 'bg-accent-bg' : 'hover:bg-surface2'}`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="w-2.5 shrink-0 text-fg3">{caret ?? ''}</span>
      <span className="shrink-0 text-fg3">{icon}</span>
      <span className={`truncate ${labelCls} ${state === 'deleted' ? 'line-through' : ''}`}>
        {label}
      </span>
      {meta && !hideBadge && (
        <span className={`ml-auto shrink-0 pl-1 text-[10px] font-semibold ${meta.cls}`}>
          {meta.badge}
        </span>
      )}
    </button>
  )
}
