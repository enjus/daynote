import { api } from './api'
import { decrypt } from './crypto'

interface CachedNote {
  dateKey: string
  plaintext: string
  stripped: string // HTML/markdown stripped, for search and snippets
}

let cache: CachedNote[] | null = null
let buildPromise: Promise<CachedNote[]> | null = null

function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')                    // HTML tags (spoiler spans, etc.)
    .replace(/^#{1,6}\s+/gm, '')                 // headings
    .replace(/[*_`~]/g, '')                      // bold/italic/code/strikethrough markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // links → display text only
    .replace(/\n+/g, ' ')                        // newlines → spaces
    .replace(/\s{2,}/g, ' ')                     // collapse whitespace
    .trim()
}

async function buildCache(key: CryptoKey): Promise<CachedNote[]> {
  const notes = await api.getAllNotes()
  const built: CachedNote[] = []
  for (const note of notes) {
    try {
      const plaintext = await decrypt(note.encrypted_content, note.iv, key)
      built.push({ dateKey: note.date_key, plaintext, stripped: stripMarkdown(plaintext) })
    } catch {
      // skip notes that fail to decrypt
    }
  }
  cache = built
  return built
}

export async function getCache(key: CryptoKey): Promise<CachedNote[]> {
  if (cache) return cache
  if (!buildPromise) {
    buildPromise = buildCache(key).finally(() => { buildPromise = null })
  }
  return buildPromise
}

/** Pre-warm the cache after unlock so the first search is instant. */
export function warmUpCache(key: CryptoKey) {
  if (!cache && !buildPromise) getCache(key).catch(() => {})
}

/** Keep the cache fresh after a note save. */
export function updateCacheEntry(dateKey: string, plaintext: string) {
  if (!cache) return
  const entry = { dateKey, plaintext, stripped: stripMarkdown(plaintext) }
  const idx = cache.findIndex(n => n.dateKey === dateKey)
  if (idx >= 0) cache[idx] = entry
  else cache.push(entry)
}

/** Clear on lock. */
export function clearCache() {
  cache = null
  buildPromise = null
}

export interface SearchResult {
  dateKey: string
  snippet: string
}

export async function searchNotes(
  query: string,
  key: CryptoKey,
  startDate?: string,
  endDate?: string,
): Promise<SearchResult[]> {
  if (!query.trim()) return []
  const notes = await getCache(key)
  const lowerQuery = query.toLowerCase()
  const results: SearchResult[] = []

  for (const note of notes) {
    if (startDate && note.dateKey < startDate) continue
    if (endDate && note.dateKey > endDate) continue

    const lower = note.stripped.toLowerCase()
    const idx = lower.indexOf(lowerQuery)
    if (idx === -1) continue

    const start = Math.max(0, idx - 60)
    const end = Math.min(note.stripped.length, idx + query.length + 60)
    let snippet = note.stripped.slice(start, end).trim()
    if (start > 0) snippet = '\u2026' + snippet
    if (end < note.stripped.length) snippet = snippet + '\u2026'

    results.push({ dateKey: note.dateKey, snippet })
  }

  // Most recent first
  results.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  return results
}
