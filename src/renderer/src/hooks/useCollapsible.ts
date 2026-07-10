import { useEffect, useState } from 'react'

function readStored(key: string, fallback: boolean): boolean {
  const v = window.localStorage.getItem(key)
  return v === null ? fallback : v === '1'
}

export function useCollapsible(
  key: string,
  defaultCollapsed = false
): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState(() => readStored(key, defaultCollapsed))

  useEffect(() => {
    window.localStorage.setItem(key, collapsed ? '1' : '0')
  }, [key, collapsed])

  return { collapsed, toggle: () => setCollapsed((c) => !c) }
}
