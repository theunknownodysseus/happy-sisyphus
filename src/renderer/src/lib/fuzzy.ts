// Minimal subsequence-based fuzzy matcher: every character of the query must
// appear in order in the target. Score rewards contiguous runs and matches
// right after a path/word boundary ('/', '-', '_'), and lightly penalizes
// longer targets so shorter/more specific paths rank first.
export function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  let score = 0
  let prevMatched = -2
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue
    score += 1
    if (prevMatched === ti - 1) score += 2
    if (ti === 0 || t[ti - 1] === '/' || t[ti - 1] === '-' || t[ti - 1] === '_') score += 3
    prevMatched = ti
    qi++
  }
  if (qi < q.length) return null
  return score - target.length * 0.01
}

export function fuzzyFilter(query: string, items: string[], limit = 50): string[] {
  if (!query) return items.slice(0, limit)
  const scored: { item: string; score: number }[] = []
  for (const item of items) {
    const score = fuzzyScore(query, item)
    if (score !== null) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.item)
}
