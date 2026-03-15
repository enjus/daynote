import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/core'

interface BubbleToolbarProps {
  editor: Editor | null
  onTagCreate: (text: string) => void
}

interface Position {
  top: number
  left: number
}

export function BubbleToolbar({ editor, onTagCreate }: BubbleToolbarProps) {
  const [pos, setPos] = useState<Position | null>(null)
  const [linkInput, setLinkInput] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editor) return

    function update() {
      const { from, to } = editor!.state.selection
      if (from === to) {
        setPos(null)
        return
      }

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setPos(null)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0) {
        setPos(null)
        return
      }

      // Use visualViewport when available (accounts for iOS keyboard)
      const vv = window.visualViewport
      const vvHeight = vv ? vv.height : window.innerHeight
      const vvWidth = vv ? vv.width : window.innerWidth
      // On iOS with keyboard open, offsetTop is non-zero — the visual viewport
      // has scrolled within the layout viewport. getBoundingClientRect() returns
      // layout-viewport coords, so we subtract offsetTop to get visual coords.
      const vvOffsetTop = vv ? vv.offsetTop : 0
      const vvOffsetLeft = vv ? vv.offsetLeft : 0

      const TOOLBAR_H = 44
      const toolbarWidth = ref.current?.offsetWidth ?? 200

      // Convert rect to visual viewport space
      const rectTopVV = rect.top - vvOffsetTop

      // Prefer above selection; fall back to below if too close to top
      let topVV = rectTopVV - TOOLBAR_H - 4
      if (topVV < 8) topVV = rectTopVV + rect.height + 4
      // Clamp within visible area (respects keyboard on iOS)
      topVV = Math.max(8, Math.min(topVV, vvHeight - TOOLBAR_H - 8))

      // Convert back to layout viewport space for CSS `fixed` positioning
      const top = topVV + vvOffsetTop

      const centerX = rect.left - vvOffsetLeft + rect.width / 2
      const left = Math.min(
        Math.max(centerX - toolbarWidth / 2, 8),
        vvWidth - toolbarWidth - 8
      ) + vvOffsetLeft

      setPos({ top, left })
    }

    const handleBlur = () => setPos(null)

    editor.on('selectionUpdate', update)
    editor.on('blur', handleBlur)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('blur', handleBlur)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [editor])

  const applyLink = useCallback((url: string) => {
    if (!editor) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().unsetLink().run()
    } else {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      editor.chain().focus().setLink({ href }).run()
    }
    setLinkInput(null)
    setPos(null)
  }, [editor])

  function applyTag() {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const text = editor.state.doc.textBetween(from, to).trim()
    if (!text) return
    onTagCreate(text)
    editor.chain().focus().setMark('tag', { tagName: text.toLowerCase() }).run()
    setPos(null)
  }

  useEffect(() => {
    if (linkInput !== null) linkInputRef.current?.focus()
  }, [linkInput])

  if (!pos) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 p-0.5"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
    >
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        className={`bubble-btn ${editor?.isActive('bold') ? 'active' : ''}`}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={`bubble-btn ${editor?.isActive('italic') ? 'active' : ''}`}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
        className={`bubble-btn ${editor?.isActive('spoiler') ? 'active' : ''}`}
        title="Hide text"
      >
        hide
      </button>
      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-600 mx-0.5" />
      {linkInput !== null ? (
        <input
          ref={linkInputRef}
          type="url"
          placeholder="https://..."
          defaultValue={editor?.getAttributes('link').href ?? ''}
          className="text-sm px-1.5 py-0.5 w-48 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyLink(e.currentTarget.value)
            if (e.key === 'Escape') setLinkInput(null)
          }}
          onBlur={(e) => applyLink(e.currentTarget.value)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setLinkInput('')}
          className={`bubble-btn ${editor?.isActive('link') ? 'active' : ''}`}
          title="Add link"
        >
          link
        </button>
      )}
      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-600 mx-0.5" />
      <button
        type="button"
        onClick={applyTag}
        className="bubble-btn"
        title="Create tag"
      >
        #
      </button>
    </div>
  )
}
