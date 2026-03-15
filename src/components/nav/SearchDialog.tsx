import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrypto } from '../../hooks/useCrypto'
import { searchNotes } from '../../lib/search'
import type { SearchResult } from '../../lib/search'
import { dateKeyToPath, formatDateTitle } from '../../lib/dates'

interface SearchDialogProps {
  onClose: () => void
}

function SnippetHighlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1 || !query) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SearchDialog({ onClose }: SearchDialogProps) {
  const navigate = useNavigate()
  const { masterKey } = useCrypto()
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const doSearch = useCallback(async (q: string, start: string, end: string) => {
    if (!masterKey) return
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const found = await searchNotes(q, masterKey, start || undefined, end || undefined)
      setResults(found)
      setSelectedIdx(0)
    } finally {
      setSearching(false)
    }
  }, [masterKey])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query, startDate, endDate), 200)
    return () => clearTimeout(debounceRef.current)
  }, [query, startDate, endDate, doSearch])

  function navigateTo(dateKey: string) {
    navigate(`/${dateKeyToPath(dateKey)}`)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      navigateTo(results[selectedIdx]?.dateKey ?? results[0].dateKey)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes..."
            className="input"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input flex-1"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input flex-1"
            />
          </div>
        </div>

        {results.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.dateKey}
                ref={i === selectedIdx ? selectedRef : null}
                type="button"
                onClick={() => navigateTo(r.dateKey)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors ${
                  i === selectedIdx
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDateTitle(r.dateKey)}
                </div>
                <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                  <SnippetHighlight text={r.snippet} query={query} />
                </div>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="p-4 text-center text-sm text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
            Searching…
          </div>
        )}

        {!searching && query.trim() && results.length === 0 && (
          <div className="p-4 text-center text-sm text-neutral-500 border-t border-neutral-200 dark:border-neutral-700">
            No results
          </div>
        )}
      </div>
    </div>
  )
}
