# Bonsai Desktop — UI/UX TODO

Roadmap for evolving Bonsai Desktop from a chat+terminal wrapper into a full
agentic coding surface, taking cues from Claude Code, ChatGPT Codex, and
Google Antigravity. Grouped by theme; roughly ordered by impact within each
group. Check items off as they land.

## Quality of life

- [x] **Resizable panels** — drag handle between main island / Changed Files,
      instead of a fixed width. Persisted to `localStorage`. (Sidebar itself
      was later removed in favor of the Footer bar, so only the right panel
      needs this now.)
- [ ] **Collapsible panels** — one click to hide Changed Files
      to give the terminal/editor full width. Persist collapsed state.
- [ ] **Command palette (Ctrl/⌘+K)** — fuzzy-searchable list of every Toolbar
      action (restart, new session, open VS Code, copy, export, clear,
      theme toggle) plus quick file open. Mirrors Claude Code's and most
      editors' command palettes.
- [ ] **Shortcut cheat-sheet (`?`)** — popover listing all bound shortcuts
      (Ctrl/⌘+Enter, Esc, Ctrl/⌘+L, Ctrl/⌘+S, Ctrl/⌘+K).
- [ ] **aria-labels on icon-only buttons** — Toolbar/Sidebar/FileTree buttons
      currently only carry a `title` attr; add `aria-label` for screen readers.
- [ ] **Persist UI state across restarts** — last active tab (chat/editor),
      panel widths/collapse state, theme (already done).
- [ ] **Custom tooltip component** — small delay + arrow, replacing native
      browser title-attribute tooltips for a more polished feel.
- [ ] **Toast stack** — Toolbar's toast currently shows one message at a time
      and clobbers itself on rapid actions; queue multiple toasts.

## Editor view

- [x] **File tabs** — support multiple open files with a tab strip above
      CodeEditor, not just a single `path` in state.
- [ ] **Fuzzy file finder (Ctrl/⌘+P)** — jump to any file without walking
      the tree.
- [ ] **Git status coloring in FileTree** — modified/untracked/staged files
      colored like VS Code's explorer (uses `git status --porcelain`, already
      have `fileDiff` IPC as a model for a `gitStatus` IPC call).
- [ ] **Font size / minimap toggle** for CodeEditor.

## Changed Files / diff review

- [ ] **Syntax-colored diff view** — replace the plain gray `<pre>` diff dump
      with real +/- line coloring (green/red backgrounds), matching how
      Claude Code and Codex present diffs before you accept them.
- [ ] **Per-hunk accept/reject** — since Bonsai edits files directly, this
      would require a checkpoint/patch model (see Agent transparency below)
      rather than true interactive staging, but even a read-only hunk view
      with copy-to-clipboard is a big step up.
- [ ] **Filter/search box** in the Changed Files list once it gets long.

## Multi-session & task management (Codex / Antigravity inspired)

Codex and Antigravity both let you fire off multiple agent tasks in parallel
and track them from a dashboard, rather than being locked into one linear
terminal session.

- [ ] **Session tabs** — run more than one Bonsai session at once (e.g. one
      per project or per task), switchable via a tab strip, instead of
      "New Session" replacing the current one.
- [ ] **Task/session dashboard** — a list view showing all sessions with
      status (running / awaiting input / done / errored), last activity
      time, and project path — like Codex's task list or Antigravity's
      Agent Manager.
- [ ] **Background notifications** — OS-level toast/badge when a
      backgrounded session finishes or needs input while the window is
      unfocused or on another tab.
- [ ] **Prompt queueing** — let the user queue several prompts to run
      sequentially against a session instead of waiting for `ready` before
      typing the next one.

## Agent transparency (Claude Code inspired)

- [ ] **Live task list panel** — surface the agent's own internal
      plan/TODO list (mirrring Claude Code's task tracker) in the sidebar
      or a dedicated panel, so progress on multi-step work is visible
      without reading raw terminal scrollback.
- [ ] **Checkpoints / rewind** — snapshot git state (or a lightweight diff)
      before each prompt so the user can jump back to any prior point in
      the conversation, the way Claude Code's rewind and Antigravity's
      checkpoints work.
- [ ] **Plan-mode / approval step** — optional mode where the agent proposes
      a plan or a set of file changes and waits for explicit approval before
      writing to disk, for higher-risk sessions.
- [ ] **Memory/context viewer** — a panel to view (and edit) whatever
      persistent memory/context files the agent maintains for the project.
- [ ] **Usage meter** — lightweight indicator of session duration / prompt
      count already exists (Sidebar stats); extend with elapsed time or
      approximate token/cost usage if Bonsai exposes it.

## Browser & artifacts (Antigravity inspired)

- [ ] **Embedded browser preview tab** — a third view alongside Chat/Editor
      for previewing a local dev server (webview/iframe), so testing a web
      app doesn't require alt-tabbing out.
- [ ] **Artifact viewer** — inline display of images/screenshots the agent
      produces or references, rather than only file paths in Changed Files.

## Polish

- [ ] **Animated view transitions** — Chat ↔ Editor switch currently swaps
      instantly; `framer-motion` is already a dependency and only used in
      overlays — reuse it for a subtle cross-fade/slide.
- [ ] **Settings panel** — accent color, terminal font/size, and a
      light/dark/system theme option (currently just a manual dark/light
      toggle).
- [ ] **Empty/idle states** — a friendly placeholder in the chat view when
      `ready` but no conversation has started yet (currently just blank
      terminal).

## Notes

- Palette, spacing, and component structure are defined by the imported
  Claude Design project ("Clean minimal redesign brief" →
  `Bonsai Desktop.dc.html`); keep new components consistent with the
  `surface1/2/3`, `fg1/2/3`, `accent`, `success/warning/danger` token set in
  `tailwind.config.js` / `index.css` rather than introducing new one-off colors.
