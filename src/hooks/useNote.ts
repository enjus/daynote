import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { encrypt, decrypt, hashContent } from '../lib/crypto'
import { updateCacheEntry } from '../lib/search'
import { useCrypto } from './useCrypto'

const POLL_INTERVAL = 30_000 // 30 seconds

export type ConflictState = {
  localContent: string
  serverContent: string
}

export function useNote(dateKey: string) {
  const { masterKey } = useCrypto()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const lastSavedHash = useRef<string>('')
  const localHash = useRef<string>('')       // hash of current editor content
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Load note
  useEffect(() => {
    if (!masterKey) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setConflict(null)
      try {
        const note = await api.getNote(dateKey)
        if (cancelled) return
        if (note) {
          const plaintext = await decrypt(note.encrypted_content, note.iv, masterKey!)
          setContent(plaintext)
          lastSavedHash.current = note.content_hash
          localHash.current = note.content_hash
        } else {
          setContent('')
          lastSavedHash.current = ''
          localHash.current = ''
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dateKey, masterKey])

  // Poll for remote changes
  useEffect(() => {
    if (!masterKey || loading) return

    const interval = setInterval(async () => {
      // Skip poll if there's already a conflict waiting to be resolved
      if (conflict) return

      try {
        const note = await api.getNote(dateKey)
        if (!note) return

        // No remote change
        if (note.content_hash === lastSavedHash.current) return

        const serverContent = await decrypt(note.encrypted_content, note.iv, masterKey)
        const hasLocalEdits = localHash.current !== lastSavedHash.current

        if (!hasLocalEdits) {
          // Safe to silently update — local content is unchanged
          setContent(serverContent)
          lastSavedHash.current = note.content_hash
          localHash.current = note.content_hash
        } else {
          // Both sides changed — surface a conflict
          if (saveTimeout.current) {
            clearTimeout(saveTimeout.current)
            saveTimeout.current = undefined
          }
          setConflict({ localContent: content, serverContent })
        }
      } catch {
        // Network hiccup — ignore, try again next interval
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [masterKey, loading, dateKey, conflict, content])

  // Save note
  const save = useCallback(
    async (text: string) => {
      if (!masterKey || conflict) return
      const hash = await hashContent(text)
      if (hash === lastSavedHash.current) return

      setSaving(true)
      try {
        const { ciphertext, iv } = await encrypt(text, masterKey)
        await api.upsertNote({
          date_key: dateKey,
          encrypted_content: ciphertext,
          iv,
          content_hash: hash,
        })
        lastSavedHash.current = hash
        updateCacheEntry(dateKey, text)
      } catch (e) {
        setError(String(e))
      } finally {
        setSaving(false)
      }
    },
    [dateKey, masterKey, conflict]
  )

  // Debounced autosave
  const updateContent = useCallback(
    async (text: string) => {
      setContent(text)
      localHash.current = await hashContent(text)
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => save(text), 2000)
    },
    [save]
  )

  // Resolve conflict by choosing a version
  const resolveConflict = useCallback(
    async (chosen: 'local' | 'server') => {
      if (!conflict || !masterKey) return
      const resolved = chosen === 'local' ? conflict.localContent : conflict.serverContent
      setConflict(null)
      setContent(resolved)
      localHash.current = await hashContent(resolved)
      // Save the chosen version immediately
      const hash = await hashContent(resolved)
      const { ciphertext, iv } = await encrypt(resolved, masterKey)
      await api.upsertNote({
        date_key: dateKey,
        encrypted_content: ciphertext,
        iv,
        content_hash: hash,
      })
      lastSavedHash.current = hash
    },
    [conflict, masterKey, dateKey]
  )

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [])

  const flushSave = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = undefined as ReturnType<typeof setTimeout> | undefined
    }
    return save(content)
  }, [save, content])

  return { content, updateContent, loading, saving, error, conflict, resolveConflict, flushSave }
}
