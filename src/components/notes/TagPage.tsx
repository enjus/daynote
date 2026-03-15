import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { decrypt } from '../../lib/crypto'
import { useCrypto } from '../../hooks/useCrypto'
import { dateKeyToPath, formatDateTitle } from '../../lib/dates'
import type { TagOccurrence } from '../../types'

export function TagPage() {
  const { tagName } = useParams<{ tagName: string }>()
  const { masterKey } = useCrypto()
  const navigate = useNavigate()
  const [occurrences, setOccurrences] = useState<TagOccurrence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tagName || !masterKey) return

    async function find() {
      setLoading(true)
      try {
        const notes = await api.getAllNotes()
        const found: TagOccurrence[] = []
        const lowerTag = tagName!.toLowerCase()

        for (const note of notes) {
          try {
            const plaintext = await decrypt(
              note.encrypted_content,
              note.iv,
              masterKey!
            )
            const lowerText = plaintext.toLowerCase()
            let searchFrom = 0
            while (true) {
              const idx = lowerText.indexOf(lowerTag, searchFrom)
              if (idx === -1) break
              const contextStart = Math.max(0, idx - 80)
              const contextEnd = Math.min(
                plaintext.length,
                idx + tagName!.length + 80
              )
              let context = plaintext.slice(contextStart, contextEnd)
              if (contextStart > 0) context = '...' + context
              if (contextEnd < plaintext.length) context = context + '...'
              found.push({ date_key: note.date_key, context })
              searchFrom = idx + 1
            }
          } catch {
            // skip
          }
        }
        setOccurrences(found)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    find()
  }, [tagName, masterKey])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          #{tagName}
        </h1>
      </div>

      {loading && (
        <p className="text-sm text-neutral-500">Searching notes...</p>
      )}

      {!loading && occurrences.length === 0 && (
        <p className="text-sm text-neutral-500">No occurrences found.</p>
      )}

      <div className="space-y-3">
        {occurrences.map((occ, i) => (
          <Link
            key={i}
            to={`/${dateKeyToPath(occ.date_key)}`}
            className="block p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
          >
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {formatDateTitle(occ.date_key)}
            </div>
            <div className="text-xs text-neutral-500 mt-2 whitespace-pre-wrap">
              {occ.context}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
