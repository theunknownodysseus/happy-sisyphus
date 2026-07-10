import {
  Copy,
  Download,
  FileCode2,
  MessageSquare,
  Moon,
  RefreshCw,
  SquarePlus,
  Sun,
  Trash2,
  Code2,
  Zap
} from 'lucide-react'
import { useState } from 'react'
import type { SessionHook } from '../hooks/useSession'
import type { Theme } from '../hooks/useTheme'

export type AppView = 'chat' | 'editor'

interface Props {
  session: SessionHook
  view: AppView
  onViewChange: (view: AppView) => void
  theme: Theme
  onToggleTheme: () => void
  streaming: boolean
}

function IconBtn({
  onClick,
  title,
  danger,
  children
}: {
  onClick: () => void
  title: string
  danger?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid place-items-center h-8 w-8 rounded-lg transition
        ${danger ? 'text-fg3 hover:bg-danger/10 hover:text-danger' : 'text-fg3 hover:bg-surface2 hover:text-fg1'}`}
    >
      {children}
    </button>
  )
}

function Tab({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition ${
        active ? 'bg-surface3 text-fg1' : 'text-fg3 hover:text-fg2'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default function Toolbar({
  session,
  view,
  onViewChange,
  theme,
  onToggleTheme,
  streaming
}: Props): JSX.Element {
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string): void {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  async function copy(): Promise<void> {
    const md = await session.actions.copyConversation()
    await navigator.clipboard.writeText(md)
    flash('Conversation copied')
  }

  async function exportMd(): Promise<void> {
    const path = await session.actions.exportMarkdown()
    if (path) flash('Exported to ' + path)
  }

  async function clearChat(): Promise<void> {
    await session.actions.clearChat()
    flash('Chat cleared')
  }

  return (
    <div className="relative flex items-center justify-between h-14 px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="inline-flex gap-1">
          <Tab
            active={view === 'chat'}
            onClick={() => onViewChange('chat')}
            icon={<MessageSquare size={13} strokeWidth={1.75} />}
            label="Chat"
          />
          <Tab
            active={view === 'editor'}
            onClick={() => onViewChange('editor')}
            icon={<FileCode2 size={13} strokeWidth={1.75} />}
            label="Editor"
          />
        </div>
        {streaming && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
            <Zap size={11} strokeWidth={2} className="animate-pulseGlow" />
            streaming
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <IconBtn onClick={() => session.actions.restart()} title="Restart Bonsai session">
          <RefreshCw size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={() => session.actions.newSession()} title="New session in another folder">
          <SquarePlus size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={() => session.actions.openVSCode()} title="Open in VS Code">
          <Code2 size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={copy} title="Copy conversation as Markdown">
          <Copy size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={exportMd} title="Export conversation to a .md file">
          <Download size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={clearChat} title="Clear conversation history" danger>
          <Trash2 size={14} strokeWidth={1.75} />
        </IconBtn>
        <span className="mx-1 h-5 w-px bg-line" />
        <IconBtn
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
        </IconBtn>
      </div>

      {toast && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-accent-bg px-3 py-1 text-xs font-medium text-accent">
          {toast}
        </div>
      )}
    </div>
  )
}
