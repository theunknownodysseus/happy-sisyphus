// Minimal ANSI utilities. We avoid a runtime dependency by inlining the
// well-known ansi-regex pattern (written with explicit escapes so no literal
// control characters live in the source). Covers the CSI / OSC sequences Ink emits.

const ANSI_PATTERN = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|'),
  'g'
)

/** Strip ANSI escape sequences from a string so it can be pattern-matched. */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, '')
}
