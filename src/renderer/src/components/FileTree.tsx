import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DirEntry } from '../../../shared/types'

interface Props {
  /** Absolute project root path; used only as a remount key by the parent. */
  root: string
  /** Currently open file (relative path), highlighted in the tree. */
  activePath: string | null
  onOpenFile: (path: string) => void
}

// A lazy, expandable file tree rooted at the project directory. Each directory
// fetches its children on first expand via window.bonsai.listDir.
export default function FileTree({ activePath, onOpenFile }: Props): JSX.Element {
  return (
    <div className="w-60 shrink-0 flex flex-col rounded-xl bg-surface1">
      <div className="flex items-center h-[46px] px-4">
        <span className="text-[12.5px] font-semibold text-fg1">Explorer</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
        <DirNode dir="" depth={0} activePath={activePath} onOpenFile={onOpenFile} defaultOpen />
      </div>
    </div>
  )
}

function DirNode({
  dir,
  depth,
  activePath,
  onOpenFile,
  defaultOpen = false
}: {
  dir: string
  depth: number
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
                activePath={activePath}
                onOpenFile={onOpenFile}
              />
            ) : (
              <Row
                key={e.path}
                depth={depth}
                icon={<File size={13} strokeWidth={1.75} />}
                label={e.name}
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
  activePath,
  onOpenFile
}: {
  entry: DirEntry
  depth: number
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
        caret={
          open ? <ChevronDown size={11} strokeWidth={2} /> : <ChevronRight size={11} strokeWidth={2} />
        }
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <DirNode
          dir={entry.path}
          depth={depth + 1}
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
  active,
  muted,
  onClick
}: {
  depth: number
  icon?: React.ReactNode
  label: string
  caret?: React.ReactNode
  active?: boolean
  muted?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-1.5 py-[5px] pr-2 rounded-md text-left text-xs font-mono truncate transition
        ${active ? 'bg-accent-bg text-accent' : muted ? 'text-fg3' : 'text-fg2 hover:bg-surface2'}`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="w-2.5 shrink-0 text-fg3">{caret ?? ''}</span>
      <span className="shrink-0 text-fg3">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
