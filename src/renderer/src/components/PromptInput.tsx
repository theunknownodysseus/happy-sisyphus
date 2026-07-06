import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
    <div className="px-4 pb-4 pt-2">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        animate={{ borderColor: dragOver ? '#4ade80' : '#272c3d' }}
        className="rounded-xl border bg-base-800 shadow-lg"
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            ready
              ? 'Message Bonsai…  (Ctrl/⌘+Enter to send · Esc to stop · Ctrl/⌘+L to clear)'
              : 'Waiting for Bonsai to be ready…'
          }
          className="text-selectable w-full resize-none bg-transparent px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            {dragOver ? (
              <span className="text-accent">Drop files to attach their paths</span>
            ) : (
              <span>Drag files here to reference them</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => session.actions.stop()}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-base-600 hover:bg-base-750 hover:text-gray-200 transition"
              title="Stop generation (Esc)"
            >
              ◼ Stop
            </button>
            <button
              onClick={send}
              disabled={!ready || !value.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-base-900 hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Send (Ctrl/⌘+Enter)"
            >
              Send ▶
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
