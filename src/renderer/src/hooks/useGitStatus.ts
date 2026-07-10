import { useEffect, useState } from 'react'
import type { GitStatus } from '../../../shared/types'

const EMPTY: GitStatus = { branch: '', files: {} }

// Fetches git status once on mount and re-fetches whenever the file watcher
// reports changes (already debounced in the main process), so tree coloring
// and the footer branch label stay current while Bonsai edits files.
export function useGitStatus(cwd: string): GitStatus {
  const [status, setStatus] = useState<GitStatus>(EMPTY)

  useEffect(() => {
    let alive = true
    const refresh = (): void => {
      window.bonsai.gitStatus().then((s) => {
        if (alive) setStatus(s)
      })
    }
    refresh()
    const unFiles = window.bonsai.onFiles(refresh)
    return () => {
      alive = false
      unFiles()
    }
  }, [cwd])

  return status
}
