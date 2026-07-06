/// <reference types="vite/client" />

import type { BonsaiApi } from '../../shared/types'

declare global {
  interface Window {
    bonsai: BonsaiApi
  }
}

export {}
