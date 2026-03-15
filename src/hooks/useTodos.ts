import { useState, useCallback } from 'react'
import { api } from '../lib/api'
import { decrypt, encrypt, hashContent } from '../lib/crypto'

export interface TodoItem {
  text: string
  checked: boolean
  dateKey: string
  indexInNote: number // ordinal of this checkbox within its note
}

const CHECKBOX_RE = /^- \[([ x])\] (.+)$/gm

export function useTodos(masterKey: CryptoKey | null) {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!masterKey) return
    setLoading(true)
    try {
      const notes = await api.getAllNotes()
      const items: TodoItem[] = []

      for (const note of notes) {
        try {
          const plaintext = await decrypt(note.encrypted_content, note.iv, masterKey)
          CHECKBOX_RE.lastIndex = 0
          let match: RegExpExecArray | null
          let idx = 0
          while ((match = CHECKBOX_RE.exec(plaintext)) !== null) {
            items.push({
              text: match[2],
              checked: match[1] === 'x',
              dateKey: note.date_key,
              indexInNote: idx,
            })
            idx++
          }
        } catch {
          // skip undecryptable notes
        }
      }

      // Unchecked: oldest first. Checked: newest first.
      items.sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1
        if (a.checked) return b.dateKey.localeCompare(a.dateKey)
        return a.dateKey.localeCompare(b.dateKey)
      })

      setTodos(items)
    } finally {
      setLoading(false)
    }
  }, [masterKey])

  const toggleTodo = useCallback(
    async (dateKey: string, indexInNote: number, newChecked: boolean) => {
      if (!masterKey) return

      // Optimistic update
      setTodos((prev) =>
        prev.map((t) =>
          t.dateKey === dateKey && t.indexInNote === indexInNote
            ? { ...t, checked: newChecked }
            : t
        )
      )

      try {
        const note = await api.getNote(dateKey)
        if (!note) throw new Error('Note not found')
        const plaintext = await decrypt(note.encrypted_content, note.iv, masterKey)

        let count = -1
        const updated = plaintext.replace(
          /^(- \[)([ x])(\] .+)$/gm,
          (match, pre, _check, post) => {
            count++
            if (count === indexInNote) return `${pre}${newChecked ? 'x' : ' '}${post}`
            return match
          }
        )

        const hash = await hashContent(updated)
        const { ciphertext, iv } = await encrypt(updated, masterKey)
        await api.upsertNote({ date_key: dateKey, encrypted_content: ciphertext, iv, content_hash: hash })
      } catch (e) {
        console.error('toggleTodo failed:', e)
        // Revert optimistic update
        setTodos((prev) =>
          prev.map((t) =>
            t.dateKey === dateKey && t.indexInNote === indexInNote
              ? { ...t, checked: !newChecked }
              : t
          )
        )
      }
    },
    [masterKey]
  )

  return { todos, loading, load, toggleTodo }
}
