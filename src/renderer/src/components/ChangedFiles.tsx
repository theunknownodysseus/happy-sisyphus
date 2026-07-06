import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { ChangedFile } from '../../../shared/types'

interface Props {
  files: ChangedFile[]
}

const KIND_ICON: Record<ChangedFile['kind'], { icon: string; cls: string }> = {
  add: { icon: '＋', cls: 'text-accent' },
  change: { icon: '✓', cls: 'text-sky-400' },
  unlink: { icon: '−', cls: 'text-red-400' }
}

export default function ChangedFiles({ files }: Props): JSX.Element {
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
    <aside className="w-72 shrink-0 flex flex-col border-l border-base-700 bg-base-850">
      <div className="flex items-center justify-between px-4 h-11 border-b border-base-700">
        <span className="text-sm font-semibold text-gray-200">Changed Files</span>
        <span className="text-xs text-gray-500 tabular-nums">{files.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {files.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-gray-600">
            No changes yet. Files Bonsai edits in your project will appear here.
          </div>
        )}

        <AnimatePresence initial={false}>
          {files.map((f) => {
            const meta = KIND_ICON[f.kind]
            return (
              <motion.div
                key={f.path}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-1"
              >
                <button
                  onClick={() => toggle(f.path)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-base-750 transition"
                  title={f.path}
                >
                  <span className={`text-sm ${meta.cls}`}>{meta.icon}</span>
                  <span className="text-xs text-gray-300 font-mono truncate">{f.path}</span>
                </button>
                <AnimatePresence>
                  {open === f.path && (
                    <motion.pre
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-selectable mx-2 mt-1 max-h-64 overflow-auto rounded-md bg-base-900 p-2 text-[11px] leading-relaxed font-mono text-gray-400 whitespace-pre"
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
