import { AnimatePresence, motion } from 'framer-motion'
import { FilePlus, FileText, FileX } from 'lucide-react'
import { useState } from 'react'
import type { ChangedFile } from '../../../shared/types'

interface Props {
  width: number
  files: ChangedFile[]
}

const KIND_META: Record<ChangedFile['kind'], { icon: typeof FileText; cls: string }> = {
  add: { icon: FilePlus, cls: 'text-success' },
  change: { icon: FileText, cls: 'text-fg3' },
  unlink: { icon: FileX, cls: 'text-danger' }
}

export default function ChangedFiles({ width, files }: Props): JSX.Element {
  const [open, setOpen] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')

  async function toggle(path: string): Promise<void> {
    if (open === path) {
      setOpen(null)
      return
    }
    setOpen(path)
    setDiff('Loading diff…')
    const d = await window.bonsai.fileDiff(path)
    setDiff(d || 'No diff available (file may be untracked or not a git repo).')
  }

  return (
    <aside style={{ width }} className="shrink-0 flex flex-col rounded-xl bg-surface1 overflow-hidden">
      <div className="flex items-center justify-between px-4 h-[46px] shrink-0">
        <span className="text-[12.5px] font-semibold text-fg1">Changed Files</span>
        <span className="font-mono text-[11px] font-semibold text-fg3 bg-bg rounded-full px-2 py-0.5 tabular-nums">
          {files.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {files.length === 0 && (
          <div className="px-2 py-8 text-center text-xs leading-relaxed text-fg3">
            No changes yet. Files Bonsai edits in your project will appear here.
          </div>
        )}

        <AnimatePresence initial={false}>
          {files.map((f) => {
            const meta = KIND_META[f.kind]
            const Icon = meta.icon
            return (
              <motion.div
                key={f.path}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-0.5"
              >
                <button
                  onClick={() => toggle(f.path)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition hover:bg-bg"
                  title={f.path}
                >
                  <Icon size={13} strokeWidth={1.75} className={`shrink-0 ${meta.cls}`} />
                  <span className="text-xs text-fg2 font-mono truncate">{f.path}</span>
                </button>
                <AnimatePresence>
                  {open === f.path && (
                    <motion.pre
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-selectable mx-1 mt-1 max-h-64 overflow-auto rounded-lg bg-bg p-2.5 text-[11px] leading-relaxed font-mono text-fg2 whitespace-pre"
                    >
                      {diff}
                    </motion.pre>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </aside>
  )
}
