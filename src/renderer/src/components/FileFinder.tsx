import { motion } from 'framer-motion'
import { File, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fuzzyFilter } from '../lib/fuzzy'

interface Props {
  onSelect: (path: string) => void
  onClose: () => void
}

function splitDirBase(path: string): { dir: string; base: string } {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? { dir: '', base: path } : { dir: path.slice(0, idx), base: path.slice(idx + 1) }
}

export default function FileFinder({ onSelect, onClose }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [allFiles, setAllFiles] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    window.bonsai.listAllFiles().then(setAllFiles)
  }, [])

  const results = fuzzyFilter(query, allFiles)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const path = results[activeIndex]
      if (path) onSelect(path)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-30 flex items-start justify-center bg-bg/60 pt-[12vh]"
    >
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-surface1 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
          <Search size={15} strokeWidth={1.75} className="shrink-0 text-fg3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Go to file…"
            className="w-full bg-transparent text-sm text-fg1 placeholder:text-fg3 focus:outline-none"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-fg3">
              {allFiles.length === 0 ? 'Loading files…' : 'No matching files'}
            </div>
          )}
          {results.map((path, i) => {
            const { dir, base } = splitDirBase(path)
            return (
              <button
                key={path}
                onClick={() => onSelect(path)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                  i === activeIndex ? 'bg-surface3' : ''
                }`}
              >
                <File size={13} strokeWidth={1.75} className="shrink-0 text-fg3" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-[13px] text-fg1">{base}</span>
                  {dir && <span className="ml-2 font-mono text-[11px] text-fg3">{dir}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
