import { useCallback, useState } from 'react'
import CodeEditor from './CodeEditor'
import EditorTabs from './EditorTabs'
import EditorTerminal from './EditorTerminal'
import FileTree from './FileTree'
import type { SessionState } from '../../../shared/types'
import type { Theme } from '../hooks/useTheme'

interface Props {
  state: SessionState
  theme: Theme
}

interface OpenFile {
  path: string
  value: string
  savedValue: string
  readonly: boolean
}

// The in-app "mini VS Code": file tree on the left, a tab strip + Monaco
// editor top-right, and an interactive shell terminal bottom-right. Keyed on
// state.cwd by the parent so switching projects remounts it (and drops tabs)
// cleanly.
export default function EditorView({ state, theme }: Props): JSX.Element {
  const [files, setFiles] = useState<OpenFile[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)

  const active = files.find((f) => f.path === activePath) ?? null
  const canSave = active ? !active.readonly && active.value !== active.savedValue : false

  const openFile = useCallback(
    async (rel: string) => {
      setActivePath(rel)
      if (files.some((f) => f.path === rel)) return
      const file = await window.bonsai.readFile(rel)
      const text = file.tooLarge ? '(file too large to open)' : file.content
      setFiles((prev) =>
        prev.some((f) => f.path === rel)
          ? prev
          : [...prev, { path: rel, value: text, savedValue: text, readonly: file.readonly }]
      )
    },
    [files]
  )

  const closeTab = useCallback(
    (rel: string) => {
      const target = files.find((f) => f.path === rel)
      if (target && target.value !== target.savedValue) {
        if (!window.confirm(`Discard unsaved changes to ${rel.split('/').pop()}?`)) return
      }
      const idx = files.findIndex((f) => f.path === rel)
      const next = files.filter((f) => f.path !== rel)
      setFiles(next)
      if (activePath === rel) {
        const fallback = next[idx] ?? next[idx - 1]
        setActivePath(fallback ? fallback.path : null)
      }
    },
    [files, activePath]
  )

  const setActiveValue = useCallback(
    (v: string) => {
      setFiles((prev) => prev.map((f) => (f.path === activePath ? { ...f, value: v } : f)))
    },
    [activePath]
  )

  const save = useCallback(async () => {
    if (!active || active.readonly) return
    const ok = await window.bonsai.writeFile(active.path, active.value)
    if (ok) {
      setFiles((prev) => prev.map((f) => (f.path === active.path ? { ...f, savedValue: f.value } : f)))
    }
  }, [active])

  return (
    <div className="flex flex-1 min-h-0 gap-2.5 p-2.5">
      <FileTree root={state.cwd} activePath={activePath} onOpenFile={openFile} />
      <div className="flex flex-1 min-w-0 flex-col gap-2.5">
        <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-surface2 overflow-hidden">
          <EditorTabs
            tabs={files.map((f) => ({ path: f.path, dirty: f.value !== f.savedValue }))}
            activePath={activePath}
            canSave={canSave}
            onSelect={setActivePath}
            onClose={closeTab}
            onSave={save}
          />
          <CodeEditor
            path={active?.path ?? null}
            value={active?.value ?? ''}
            readonly={active?.readonly ?? false}
            theme={theme}
            onChange={setActiveValue}
            onSave={save}
          />
        </div>
        <div className="h-64 shrink-0">
          <EditorTerminal theme={theme} />
        </div>
      </div>
    </div>
  )
}
