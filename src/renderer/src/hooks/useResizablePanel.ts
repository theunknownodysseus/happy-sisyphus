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
}: Options): { width: number; onHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void } {
  const [width, setWidth] = useState(() => readStored(key, defaultWidth))
  const dragStart = useRef<{ x: number; width: number } | null>(null)
  const rafId = useRef<number | null>(null)
  const pendingWidth = useRef<number | null>(null)

  useEffect(() => {
    window.localStorage.setItem(key, String(width))
  }, [key, width])

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const handle = e.currentTarget
      // Capture the pointer so drag events keep targeting the handle even
      // when the cursor passes over the terminal/editor underneath — without
      // this, xterm/Monaco can intercept the move and the drag stutters.
      handle.setPointerCapture(e.pointerId)
      dragStart.current = { x: e.clientX, width }
      document.body.style.cursor = 'col-resize'

      const flush = (): void => {
        rafId.current = null
        if (pendingWidth.current !== null) setWidth(pendingWidth.current)
      }

      const onMove = (ev: PointerEvent): void => {
        if (!dragStart.current) return
        const delta = ev.clientX - dragStart.current.x
        const signed = edge === 'right' ? delta : -delta
        pendingWidth.current = Math.min(max, Math.max(min, dragStart.current.width + signed))
        // Coalesce updates to one per frame regardless of pointermove rate.
        if (rafId.current === null) rafId.current = requestAnimationFrame(flush)
      }
      const onUp = (): void => {
        dragStart.current = null
        document.body.style.cursor = ''
        handle.releasePointerCapture(e.pointerId)
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current)
          rafId.current = null
        }
        if (pendingWidth.current !== null) {
          setWidth(pendingWidth.current)
          pendingWidth.current = null
        }
      }

      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
    },
    [width, min, max, edge]
  )

  return { width, onHandlePointerDown }
}
