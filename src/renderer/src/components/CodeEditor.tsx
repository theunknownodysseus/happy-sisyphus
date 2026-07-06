import Editor, { type OnMount } from '@monaco-editor/react'
import { useRef } from 'react'

interface Props {
  path: string | null
  value: string
  readonly: boolean
  dirty: boolean
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
  dirty,
  onChange,
  onSave
}: Props): JSX.Element {
  // Keep the latest onSave in a ref so the Monaco command (bound once) always
  // calls the current handler without rebinding on every render.
  const saveRef = useRef(onSave)
  saveRef.current = onSave

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current())
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-base-850">
      <div className="flex items-center justify-between h-9 px-3 border-b border-base-700 bg-base-900/60">
        <span className="text-xs font-mono text-gray-400 truncate">
          {path ?? 'No file open'}
          {dirty && <span className="ml-2 text-accent">● unsaved</span>}
        </span>
        <button
          onClick={onSave}
          disabled={!path || readonly || !dirty}
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-accent text-base-900 hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Save (Ctrl/⌘+S)"
        >
          ⭳ Save
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {path ? (
          <Editor
            height="100%"
            theme="vs-dark"
            path={path}
            language={langFor(path)}
            value={value}
            onChange={(v) => onChange(v ?? '')}
            onMount={handleMount}
            options={{
              readOnly: readonly,
              fontSize: 13,
              fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-gray-600">
            Select a file from the explorer to open it.
          </div>
        )}
      </div>
    </div>
  )
}
