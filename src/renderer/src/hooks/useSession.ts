import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangedFile, HistoryEntry, SessionState } from '../../../shared/types'

const INITIAL: SessionState = {
  phase: 'idle',
  light: 'yellow',
  label: 'Connecting…',
  cwd: '',
  projectName: '',
  promptCount: 0
}

export interface SessionHook {
  state: SessionState
  files: ChangedFile[]
  history: HistoryEntry[]
  streaming: boolean
  /** Subscribe a consumer (the terminal) to raw PTY data. */
  onData: (cb: (data: string) => void) => () => void
  /** Provide the initial buffer replayed on attach. */
  initialBuffer: string
  ready: boolean
  actions: {
    sendPrompt: (text: string) => void
    stop: () => void
    restart: () => Promise<void>
    clearChat: () => Promise<void>
    newSession: () => Promise<void>
    openVSCode: () => void
    copyConversation: () => Promise<string>
    exportMarkdown: () => Promise<string | null>
    write: (data: string) => void
    resize: (cols: number, rows: number) => void
  }
}

export function useSession(): SessionHook {
  const [state, setState] = useState<SessionState>(INITIAL)
  const [files, setFiles] = useState<ChangedFile[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [initialBuffer, setInitialBuffer] = useState('')
  const [ready, setReady] = useState(false)
  const [streaming, setStreaming] = useState(false)

  // Fan-out of raw data to any number of consumers (terminal + stream detector).
  const dataSubs = useRef(new Set<(data: string) => void>())
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onData = useCallback((cb: (data: string) => void) => {
    dataSubs.current.add(cb)
    return () => {
      dataSubs.current.delete(cb)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const unData = window.bonsai.onData(({ data }) => {
      dataSubs.current.forEach((cb) => cb(data))
      // Streaming indicator: true while data keeps arriving.
      setStreaming(true)
      if (streamTimer.current) clearTimeout(streamTimer.current)
      streamTimer.current = setTimeout(() => setStreaming(false), 700)
    })
    const unState = window.bonsai.onState((s) => setState(s))
    const unFiles = window.bonsai.onFiles((f) => setFiles(f))
    const unHistory = window.bonsai.onHistory((h) => setHistory(h))

    // Attach: pull the current snapshot (buffer + state) for reconnect.
    window.bonsai.attach().then((snap) => {
      if (!mounted) return
      setState(snap.state)
      setFiles(snap.changedFiles)
      setHistory(snap.history)
      setInitialBuffer(snap.buffer)
      setReady(true)
    })

    return () => {
      mounted = false
      unData()
      unState()
      unFiles()
      unHistory()
      if (streamTimer.current) clearTimeout(streamTimer.current)
    }
  }, [])

  const actions = {
    sendPrompt: useCallback((text: string) => window.bonsai.sendPrompt(text), []),
    stop: useCallback(() => window.bonsai.stop(), []),
    restart: useCallback(() => window.bonsai.restart(), []),
    clearChat: useCallback(async () => {
      await window.bonsai.clearChat()
    }, []),
    newSession: useCallback(async () => {
      const snap = await window.bonsai.newSession()
      if (snap) {
        setState(snap.state)
        setFiles(snap.changedFiles)
        setHistory(snap.history)
        setInitialBuffer(snap.buffer)
      }
    }, []),
    openVSCode: useCallback(() => window.bonsai.openVSCode(), []),
    copyConversation: useCallback(() => window.bonsai.copyConversation(), []),
    exportMarkdown: useCallback(() => window.bonsai.exportMarkdown(), []),
    write: useCallback((data: string) => window.bonsai.write(data), []),
    resize: useCallback((cols: number, rows: number) => window.bonsai.resize(cols, rows), [])
  }

  return { state, files, history, streaming, onData, initialBuffer, ready, actions }
}
