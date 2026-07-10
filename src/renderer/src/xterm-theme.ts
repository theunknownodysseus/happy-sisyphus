import type { Theme } from './hooks/useTheme'
import type { ITheme } from '@xterm/xterm'

// Mirrors the CSS custom properties in index.css. xterm paints to canvas, so
// it needs resolved hex values rather than var(--...) references.
export function xtermTheme(theme: Theme): ITheme {
  if (theme === 'light') {
    return {
      background: '#F1F1F4',
      foreground: '#15171C',
      cursor: '#E85A1F',
      selectionBackground: '#DBDBE1',
      black: '#FFFFFF',
      brightBlack: '#8B909A',
      green: '#1E9E6F',
      brightGreen: '#29D398',
      cyan: '#0891B2',
      blue: '#2563EB',
      magenta: '#9333EA',
      yellow: '#B87206',
      red: '#D8324B',
      white: '#15171C'
    }
  }
  return {
    background: '#151720',
    foreground: '#ECEDF0',
    cursor: '#FF5A1F',
    selectionBackground: '#242833',
    black: '#0E0F13',
    brightBlack: '#5A606B',
    green: '#29D398',
    brightGreen: '#5EE8B5',
    cyan: '#38bdf8',
    blue: '#60a5fa',
    magenta: '#c084fc',
    yellow: '#FFB020',
    red: '#FF3D55',
    white: '#ECEDF0'
  }
}
