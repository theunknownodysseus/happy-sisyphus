import { AArrowDown, AArrowUp, Download, Map, X } from 'lucide-react'
import { MAX_FONT, MIN_FONT, type EditorSettings } from '../hooks/useEditorSettings'

interface Tab {
  path: string
  dirty: boolean
}

interface Props {
  tabs: Tab[]
  activePath: string | null
  canSave: boolean
  settings: EditorSettings
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onSave: () => void
}

function basename(path: string): string {
  return path.split('/').pop() ?? path
}

function SettingBtn({
  onClick,
  title,
  disabled,
  active,
  children
}: {
  onClick: () => void
  title: string
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`grid h-6 w-6 place-items-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? 'bg-surface4 text-fg1' : 'text-fg3 hover:bg-surface3 hover:text-fg1'
      }`}
    >
      {children}
    </button>
  )
}

export default function EditorTabs({
  tabs,
  activePath,
  canSave,
  settings,
  onSelect,
  onClose,
  onSave
}: Props): JSX.Element {
  return (
    <div className="flex items-center h-9 shrink-0 pl-1 pr-1.5">
      <div className="flex flex-1 min-w-0 items-stretch gap-0.5 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.path === activePath
          return (
            <div
              key={t.path}
              onClick={() => onSelect(t.path)}
              title={t.path}
              className={`group flex items-center gap-1.5 shrink-0 max-w-[180px] px-2.5 rounded-lg my-1 text-xs cursor-pointer transition ${
                active ? 'bg-surface3 text-fg1' : 'text-fg3 hover:text-fg2'
              }`}
            >
              <span className="truncate font-mono">{basename(t.path)}</span>
              <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
                {t.dirty && (
                  <span className="absolute h-1.5 w-1.5 rounded-full bg-accent transition group-hover:opacity-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(t.path)
                  }}
                  className="absolute inset-0 grid place-items-center rounded opacity-0 text-fg3 transition hover:bg-surface4 hover:text-fg1 group-hover:opacity-100"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </span>
            </div>
          )
        })}
      </div>

      {tabs.length > 0 && (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <SettingBtn
            onClick={() => settings.bumpFontSize(-1)}
            disabled={settings.fontSize <= MIN_FONT}
            title="Decrease font size"
          >
            <AArrowDown size={13} strokeWidth={1.75} />
          </SettingBtn>
          <span className="w-5 text-center font-mono text-[10px] text-fg3 tabular-nums">
            {settings.fontSize}
          </span>
          <SettingBtn
            onClick={() => settings.bumpFontSize(1)}
            disabled={settings.fontSize >= MAX_FONT}
            title="Increase font size"
          >
            <AArrowUp size={13} strokeWidth={1.75} />
          </SettingBtn>
          <SettingBtn
            onClick={settings.toggleMinimap}
            active={settings.minimap}
            title={settings.minimap ? 'Hide minimap' : 'Show minimap'}
          >
            <Map size={12} strokeWidth={1.75} />
          </SettingBtn>
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            onClick={onSave}
            disabled={!canSave}
            title="Save (Ctrl/⌘+S)"
            className="flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-accent text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-transparent disabled:text-fg3"
          >
            <Download size={11} strokeWidth={2} />
            Save
          </button>
        </div>
      )}
    </div>
  )
}
