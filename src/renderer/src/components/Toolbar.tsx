import { useState } from 'react'
import type { SessionHook } from '../hooks/useSession'

export type AppView = 'chat' | 'editor'

interface Props {
  session: SessionHook
  view: AppView
  onViewChange: (view: AppView) => void
}

function Btn({
  onClick,
  children,
  title,
  danger
}: {
  onClick: () => void
  children: React.ReactNode
  title: string
  danger?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition
        ${
          danger
            ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
            : 'border-base-600 text-gray-300 hover:bg-base-750 hover:text-white'
        }`}
    >
      {children}
    </button>
  )
}

function ViewToggle({ view, onViewChange }: { view: AppView; onViewChange: (v: AppView) => void }): JSX.Element {
  const tab = (id: AppView, label: string): JSX.Element => (
    <button
      onClick={() => onViewChange(id)}
      className={`px-3 py-1 rounded-md text-xs font-medium transition ${
        view === id ? 'bg-accent text-base-900' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-base-600 p-0.5">
      {tab('chat', '💬 Chat')}
      {tab('editor', '📝 Editor')}
    </div>
  )
}

export default function Toolbar({ session, view, onViewChange }: Props): JSX.Element {
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
    <div className="relative flex items-center gap-1.5 px-4 h-12 border-b border-base-700 bg-base-900/60">
      <ViewToggle view={view} onViewChange={onViewChange} />
      <span className="mx-1 h-5 w-px bg-base-600" />
      <Btn onClick={() => session.actions.restart()} title="Restart the Bonsai session">
        ⟳ Restart Bonsai
      </Btn>
      <Btn onClick={clearChat} title="Clear conversation history">
        🗑 Clear Chat
      </Btn>
      <Btn onClick={() => session.actions.newSession()} title="Start a new session in another folder">
        ✦ New Session
      </Btn>
      <Btn onClick={() => session.actions.openVSCode()} title="Open the project in VS Code">
        ⧉ Open VS Code
      </Btn>
      <Btn onClick={copy} title="Copy the conversation as Markdown">
        ⧉ Copy Conversation
      </Btn>
      <Btn onClick={exportMd} title="Export the conversation to a .md file">
        ⭳ Export Markdown
      </Btn>

      {toast && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md bg-accent/15 border border-accent/30 px-3 py-1 text-xs text-accent">
          {toast}
        </div>
      )}
    </div>
  )
}
