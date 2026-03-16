import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useCallback } from 'react'
import { createTagMark } from './TagMark'
import { SpoilerMark } from './SpoilerMark'
import { BubbleToolbar } from './BubbleToolbar'
import { LinkFaviconExtension } from './LinkFaviconExtension'
import { api } from '../../lib/api'

const BARE_URL_RE = /^https?:\/\/\S+$/

interface DaynoteEditorProps {
  content: string // markdown
  onChange: (markdown: string) => void
  onTagCreate?: (text: string) => void
  onTagsChanged?: (tags: Set<string>) => void
}

function getTagsInDoc(editor: ReturnType<typeof useEditor>): Set<string> {
  const tags = new Set<string>()
  if (!editor) return tags
  editor.state.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === 'tag' && mark.attrs.tagName) {
        tags.add(mark.attrs.tagName as string)
      }
    })
  })
  return tags
}

export function DaynoteEditor({
  content,
  onChange,
  onTagCreate,
  onTagsChanged,
}: DaynoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      SpoilerMark,
      Markdown,
      createTagMark(onTagCreate),
      LinkFaviconExtension,
    ],
    content,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown()
      onChange(md)
      onTagsChanged?.(getTagsInDoc(editor))
    },
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain')?.trim()
        if (!text || !BARE_URL_RE.test(text) || text.includes('\n')) return false

        // Don't intercept paste inside code blocks
        const { $from } = view.state.selection
        if ($from.parent.type.name === 'codeBlock') return false

        event.preventDefault()

        api.unfurlUrl(text)
          .then(({ title }) => {
            const { state } = view
            const linkMark = state.schema.marks.link?.create({ href: text })
            if (!linkMark) return
            view.dispatch(state.tr.replaceSelectionWith(state.schema.text(title, [linkMark]), false))
          })
          .catch(() => {
            const { state } = view
            const linkMark = state.schema.marks.link?.create({ href: text })
            if (!linkMark) return
            view.dispatch(state.tr.replaceSelectionWith(state.schema.text(text, [linkMark]), false))
          })

        return true
      },
      handleKeyDown: (_view, event) => {
        // Tab to increase heading level
        if (event.key === 'Tab' && !event.shiftKey && editor) {
          const { $head } = editor.state.selection
          const node = $head.parent
          if (node.type.name === 'heading') {
            const currentLevel = node.attrs.level as number
            if (currentLevel < 6) {
              event.preventDefault()
              editor
                .chain()
                .focus()
                .setHeading({ level: (currentLevel + 1) as 1|2|3|4|5|6 })
                .run()
              return true
            }
          }
        }
        // Shift+Tab to decrease heading level
        if (event.key === 'Tab' && event.shiftKey && editor) {
          const { $head } = editor.state.selection
          const node = $head.parent
          if (node.type.name === 'heading') {
            const currentLevel = node.attrs.level as number
            if (currentLevel > 1) {
              event.preventDefault()
              editor
                .chain()
                .focus()
                .setHeading({ level: (currentLevel - 1) as 1|2|3|4|5|6 })
                .run()
              return true
            }
          }
        }
        return false
      },
    },
  })

  // Update editor content when prop changes (navigation)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (editor && content !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const handleIndent = useCallback(() => {
    if (!editor) return
    const { $head } = editor.state.selection
    const node = $head.parent
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number
      if (level < 6) {
        editor.chain().focus().setHeading({ level: (level + 1) as 1|2|3|4|5|6 }).run()
      }
    }
  }, [editor])

  const handleOutdent = useCallback(() => {
    if (!editor) return
    const { $head } = editor.state.selection
    const node = $head.parent
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number
      if (level > 1) {
        editor.chain().focus().setHeading({ level: (level - 1) as 1|2|3|4|5|6 }).run()
      }
    }
  }, [editor])

  function handleReveal(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.classList.contains('spoiler')) {
      target.toggleAttribute('data-revealed')
    }
  }

  return (
    <div className="daynote-editor" onClick={handleReveal}>
      <BubbleToolbar editor={editor} onTagCreate={(text) => { onTagCreate?.(text) }} />
      <EditorContent editor={editor} />

      {/* Mobile toolbar */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-1 p-2 border-t border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-700 md:hidden">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn ${editor?.isActive('heading') ? 'active' : ''}`}
        >
          H
        </button>
        <button type="button" onClick={handleIndent} className="toolbar-btn">
          &rarr;
        </button>
        <button type="button" onClick={handleOutdent} className="toolbar-btn">
          &larr;
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
        >
          &bull;
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          className={`toolbar-btn ${editor?.isActive('taskList') ? 'active' : ''}`}
        >
          &#9744;
        </button>
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            const existing = editor.getAttributes('link').href ?? ''
            const url = window.prompt('Link URL', existing)
            if (url === null) return // cancelled
            if (!url.trim()) {
              editor.chain().focus().unsetLink().run()
            } else {
              const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
              editor.chain().focus().setLink({ href }).run()
            }
          }}
          className={`toolbar-btn ${editor?.isActive('link') ? 'active' : ''}`}
        >
          link
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
          className={`toolbar-btn ${editor?.isActive('spoiler') ? 'active' : ''}`}
        >
          hide
        </button>
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            const { from, to } = editor.state.selection
            if (from === to) return
            const text = editor.state.doc.textBetween(from, to).trim()
            if (!text || !onTagCreate) return
            onTagCreate(text)
            editor.chain().focus().setMark('tag', { tagName: text.toLowerCase() }).run()
          }}
          className="toolbar-btn"
        >
          #
        </button>
      </div>
    </div>
  )
}
