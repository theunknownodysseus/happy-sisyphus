// Configures Monaco to run fully offline from the local bundle.
//
// @monaco-editor/react defaults to fetching Monaco from a CDN, which the app's
// strict CSP forbids (and which fails offline). Here we hand it the bundled
// `monaco-editor` and wire up the base editor web worker via Vite's `?worker`
// import so syntax highlighting/tokenization runs off the main thread. Only the
// base worker is loaded (not the per-language services) to keep the bundle lean.

import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = {
  getWorker: () => new editorWorker()
}

loader.config({ monaco })
