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
    <div className="w-64 shrink-0 flex flex-col border-r border-base-700 bg-base-850">
      <div className="flex items-center h-11 px-4 border-b border-base-700">
        <span className="text-sm font-semibold text-gray-200">Explorer</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto py-1">
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
          <Row depth={depth} icon="…" label="loading" muted />
        ) : entries.length === 0 ? (
          <Row depth={depth} icon="" label="empty" muted />
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
                icon="📄"
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
        icon={open ? '📂' : '📁'}
        label={entry.name}
        caret={open ? '▾' : '▸'}
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
  icon: string
  label: string
  caret?: string
  active?: boolean
  muted?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-1 py-1 pr-2 text-left text-xs font-mono truncate transition
        ${active ? 'bg-accent/15 text-accent' : muted ? 'text-gray-600' : 'text-gray-300 hover:bg-base-750'}`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="w-3 text-gray-500">{caret ?? ''}</span>
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
