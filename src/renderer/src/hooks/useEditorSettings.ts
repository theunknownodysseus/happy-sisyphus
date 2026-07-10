import { useEffect, useState } from 'react'

const FONT_KEY = 'bonsai:editorFontSize'
const MINIMAP_KEY = 'bonsai:editorMinimap'

export const MIN_FONT = 10
export const MAX_FONT = 22
const DEFAULT_FONT = 13

export interface EditorSettings {
  fontSize: number
  minimap: boolean
  bumpFontSize: (delta: number) => void
  toggleMinimap: () => void
}

// Editor preferences (font size, minimap) persisted across restarts.
export function useEditorSettings(): EditorSettings {
  const [fontSize, setFontSize] = useState(() => {
    const n = Number(window.localStorage.getItem(FONT_KEY))
    return Number.isFinite(n) && n >= MIN_FONT && n <= MAX_FONT ? n : DEFAULT_FONT
  })
  const [minimap, setMinimap] = useState(() => window.localStorage.getItem(MINIMAP_KEY) !== '0')

  useEffect(() => {
    window.localStorage.setItem(FONT_KEY, String(fontSize))
  }, [fontSize])

  useEffect(() => {
    window.localStorage.setItem(MINIMAP_KEY, minimap ? '1' : '0')
  }, [minimap])

  return {
    fontSize,
    minimap,
    bumpFontSize: (delta) => setFontSize((s) => Math.min(MAX_FONT, Math.max(MIN_FONT, s + delta))),
    toggleMinimap: () => setMinimap((m) => !m)
  }
}
