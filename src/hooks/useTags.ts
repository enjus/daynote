import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { decrypt } from '../lib/crypto'

export interface Tag {
  id: string
  name: string
  count: number
}

export function useTags(masterKey: CryptoKey | null) {
  const [tags, setTags] = useState<Tag[]>([])

  // Count number of notes (not occurrences) in which each tag appears
  async function computeCounts(
    tagList: { id: string; name: string }[],
    key: CryptoKey
  ): Promise<Tag[]> {
    if (tagList.length === 0) return []
    const notes = await api.getAllNotes()
    const counts: Record<string, number> = {}

    for (const note of notes) {
      try {
        const plaintext = await decrypt(note.encrypted_content, note.iv, key)
        // Strip HTML tags before searching so that e.g. <span data-tag="word">word</span>
        // counts as one occurrence of "word", not two.
        const lower = plaintext.replace(/<[^>]+>/g, ' ').toLowerCase()
        for (const tag of tagList) {
          if (lower.includes(tag.name)) {
            counts[tag.id] = (counts[tag.id] ?? 0) + 1
          }
        }
      } catch {
        // skip notes that fail to decrypt
      }
    }

    return tagList
      .map((t) => ({ ...t, count: counts[t.id] ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }

  useEffect(() => {
    if (!masterKey) return
    const key = masterKey

    api.getTags().then(async (list) => {
      // Show tags immediately without counts, then update with counts
      setTags(list.map((t) => ({ ...t, count: 0 })))
      const withCounts = await computeCounts(list, key)
      setTags(withCounts)
    }).catch(console.error)
  }, [masterKey])

  const addTag = useCallback(async (name: string) => {
    const { id } = await api.createTag(name)
    setTags((prev) => {
      if (prev.some((t) => t.name === name.toLowerCase().trim())) return prev
      return [...prev, { id, name: name.toLowerCase().trim(), count: 0 }]
    })
    return id
  }, [])

  const removeTag = useCallback(async (id: string) => {
    await api.deleteTag(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Called when a tag mark disappears from the current editor document.
  // Decrypts all notes to check if the tag still exists anywhere; deletes if not.
  const cleanupIfUnused = useCallback(async (name: string, key: CryptoKey) => {
    setTags((prev) => {
      const tag = prev.find((t) => t.name === name)
      if (!tag) return prev
      return prev // hold state until async check completes
    })

    try {
      const notes = await api.getAllNotes()
      const lower = name.toLowerCase()
      let found = false

      for (const note of notes) {
        try {
          const plaintext = await decrypt(note.encrypted_content, note.iv, key)
          const stripped = plaintext.replace(/<[^>]+>/g, ' ').toLowerCase()
          if (stripped.includes(lower)) {
            found = true
            break
          }
        } catch {
          // skip
        }
      }

      if (!found) {
        setTags((prev) => {
          const tag = prev.find((t) => t.name === name)
          if (!tag) return prev
          api.deleteTag(tag.id).catch(console.error)
          return prev.filter((t) => t.id !== tag.id)
        })
      }
    } catch (e) {
      console.error('cleanupIfUnused failed:', e)
    }
  }, [])

  return { tags, addTag, removeTag, cleanupIfUnused }
}
