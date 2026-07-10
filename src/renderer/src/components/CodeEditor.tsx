import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef } from 'react'
import type { Theme } from '../hooks/useTheme'

interface Props {
  path: string | null
  value: string
  readonly: boolean
  theme: Theme
  fontSize: number
  minimap: boolean
  onChange: (value: string) => void
  onSave: () => void
}

// Maps a filename to a Monaco language id. Monaco infers most from the model URI,
// but we set it explicitly so unusual extensions still highlight sensibly.
const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'cpp',
  sh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  sql: 'sql'
}

function langFor(path: string | null): string | undefined {
  if (!path) return undefined
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LANG[ext]
}

export default function CodeEditor({
  path,
  value,
  readonly,
  theme,
  fontSize,
  minimap,
  onChange,
  onSave
}: Props): JSX.Element {
  // Keep the latest onSave in a ref so the Monaco command (bound once per
  // mounted model) always calls the current handler without rebinding.
  const saveRef = useRef(onSave)
  saveRef.current = onSave

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current())
  }

  if (!path) {
    return (
      <div className="grid h-full place-items-center text-sm text-fg3">
        Select a file from the explorer to open it.
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0">
      <Editor
        height="100%"
        theme={theme === 'light' ? 'vs' : 'vs-dark'}
        path={path}
        language={langFor(path)}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          readOnly: readonly,
          fontSize,
          fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2
        }}
      />
    </div>
  )
}
