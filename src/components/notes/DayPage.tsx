import { useParams } from 'react-router-dom'
import { useRef, useCallback } from 'react'
import { useNote } from '../../hooks/useNote'
import { useTags } from '../../hooks/useTags'
import { useCrypto } from '../../hooks/useCrypto'
import { DaynoteEditor } from '../editor/DaynoteEditor'
import { DayNav } from '../nav/DayNav'

export function DayPage() {
  const { year, month, day } = useParams<{
    year: string
    month: string
    day: string
  }>()
  const dateKey = `${year}-${month}-${day}`
  const { content, updateContent, loading, saving, error, conflict, resolveConflict } = useNote(dateKey)
  const { addTag, cleanupIfUnused } = useTags(null)
  const { masterKey } = useCrypto()
  const prevTags = useRef<Set<string>>(new Set())

  const handleTagsChanged = useCallback((currentTags: Set<string>) => {
    if (!masterKey) return
    // Find tags that were present before but are gone now
    for (const name of prevTags.current) {
      if (!currentTags.has(name)) {
        cleanupIfUnused(name, masterKey)
      }
    }
    prevTags.current = currentTags
  }, [masterKey, cleanupIfUnused])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DayNav dateKey={dateKey} />
        <div className="mt-8 text-sm text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DayNav dateKey={dateKey} />
        <div className="mt-8 text-sm text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20 md:pb-8">
      <DayNav dateKey={dateKey} />

      {conflict && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            This note was edited on another device. Choose which version to keep.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-amber-200 dark:border-amber-700 p-2 bg-white dark:bg-neutral-900 max-h-32 overflow-y-auto whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
              <div className="font-medium text-neutral-500 mb-1">This device</div>
              {conflict.localContent}
            </div>
            <div className="rounded border border-amber-200 dark:border-amber-700 p-2 bg-white dark:bg-neutral-900 max-h-32 overflow-y-auto whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
              <div className="font-medium text-neutral-500 mb-1">Other device</div>
              {conflict.serverContent}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => resolveConflict('local')}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Keep this device
            </button>
            <button
              type="button"
              onClick={() => resolveConflict('server')}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Use other device
            </button>
          </div>
        </div>
      )}

      <div className="relative mt-6">
        {saving && (
          <div className="absolute top-0 right-0 text-xs text-neutral-400">
            Saving...
          </div>
        )}
        <DaynoteEditor
          content={content}
          onChange={updateContent}
          onTagCreate={async (text) => { await addTag(text) }}
          onTagsChanged={handleTagsChanged}
        />
      </div>
    </div>
  )
}
