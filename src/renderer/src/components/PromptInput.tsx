import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, Square } from 'lucide-react'
import type { SessionHook } from '../hooks/useSession'

interface Props {
  session: SessionHook
}

// The chat-style prompt box. Ctrl/Cmd+Enter sends, Esc stops generation,
// Ctrl/Cmd+L clears the input. Dropped files append their paths to the prompt
// (Bonsai reads file paths as plain text in the prompt).
export default function PromptInput({ session }: Props): JSX.Element {
  const [value, setValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const ready = session.state.phase === 'ready'

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (e.key === 'Escape') {
        session.actions.stop()
      } else if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setValue('')
        taRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session.actions])

  // Auto-grow textarea.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [value])

  function send(): void {
    const text = value.trim()
    if (!text || !ready) return
    session.actions.sendPrompt(text)
    setValue('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  function onDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDragOver(false)
    const paths: string[] = []
    for (const f of Array.from(e.dataTransfer.files)) {
      // Electron exposes the absolute path on File objects.
      const p = (f as File & { path?: string }).path
      if (p) paths.push(p)
    }
    if (paths.length) {
      setValue((v) => (v ? v + ' ' : '') + paths.join(' '))
      taRef.current?.focus()
    }
  }

  return (
    <div className="px-6 pb-6 pt-2">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        animate={{
          boxShadow: dragOver ? '0 0 0 1.5px var(--c-accent)' : '0 0 0 0 transparent'
        }}
        className="mx-auto w-full max-w-[600px] flex items-center gap-2 rounded-[26px] bg-surface1 py-2 pl-[18px] pr-2 transition"
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            dragOver
              ? 'Drop files to attach their paths'
              : ready
                ? 'Ask Bonsai to build something…'
                : 'Waiting for Bonsai to be ready…'
          }
          className="text-selectable w-full resize-none bg-transparent text-sm text-fg1 placeholder:text-fg3 focus:outline-none"
        />
        {session.streaming ? (
          <button
            onClick={() => session.actions.stop()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-soft"
            title="Stop generation (Esc)"
          >
            <Square size={12} strokeWidth={2} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!ready || !value.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-surface3 disabled:text-fg3"
            title="Send (Ctrl/⌘+Enter)"
          >
            <ArrowUp size={16} strokeWidth={2.25} />
          </button>
        )}
      </motion.div>
    </div>
  )
}
