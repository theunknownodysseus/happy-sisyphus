import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  /** localStorage key the width is persisted under. */
  key: string
  defaultWidth: number
  min: number
  max: number
  /** Which edge of the panel the handle sits on — determines drag direction. */
  edge: 'left' | 'right'
}

function readStored(key: string, fallback: number): number {
  const n = Number(window.localStorage.getItem(key))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function useResizablePanel({
  key,
  defaultWidth,
  min,
  max,
  edge
}: Options): { width: number; onHandlePointerDown: (e: React.PointerEvent) => void } {
  const [width, setWidth] = useState(() => readStored(key, defaultWidth))
  const dragStart = useRef<{ x: number; width: number } | null>(null)

  useEffect(() => {
    window.localStorage.setItem(key, String(width))
  }, [key, width])

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      dragStart.current = { x: e.clientX, width }

      const onMove = (ev: PointerEvent): void => {
        if (!dragStart.current) return
        const delta = ev.clientX - dragStart.current.x
        const signed = edge === 'right' ? delta : -delta
        setWidth(Math.min(max, Math.max(min, dragStart.current.width + signed)))
      }
      const onUp = (): void => {
        dragStart.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [width, min, max, edge]
  )

  return { width, onHandlePointerDown }
}
