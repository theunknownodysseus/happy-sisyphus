import { useCallback, useState } from 'react'
import CodeEditor from './CodeEditor'
import EditorTerminal from './EditorTerminal'
import FileTree from './FileTree'
import type { SessionState } from '../../../shared/types'
import type { Theme } from '../hooks/useTheme'

interface Props {
  state: SessionState
  theme: Theme
}

// The in-app "mini VS Code": file tree on the left, Monaco editor top-right,
// and an interactive shell terminal bottom-right. Keyed on state.cwd by the
// parent so switching projects remounts it cleanly.
export default function EditorView({ state, theme }: Props): JSX.Element {
  const [path, setPath] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [savedValue, setSavedValue] = useState('')
  const [readonly, setReadonly] = useState(false)

  const dirty = value !== savedValue

  const openFile = useCallback(async (rel: string) => {
    const file = await window.bonsai.readFile(rel)
    const text = file.tooLarge ? '(file too large to open)' : file.content
    setPath(rel)
    setValue(text)
    setSavedValue(text)
    setReadonly(file.readonly)
  }, [])

  const save = useCallback(async () => {
    if (!path || readonly) return
    const ok = await window.bonsai.writeFile(path, value)
    if (ok) setSavedValue(value)
  }, [path, readonly, value])

  return (
    <div className="flex flex-1 min-h-0 gap-2.5 p-2.5">
      <FileTree root={state.cwd} activePath={path} onOpenFile={openFile} />
      <div className="flex flex-1 min-w-0 flex-col gap-2.5">
        <div className="flex-1 min-h-0 rounded-xl bg-surface2 overflow-hidden">
          <CodeEditor
            path={path}
            value={value}
            readonly={readonly}
            dirty={dirty}
            theme={theme}
            onChange={setValue}
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
