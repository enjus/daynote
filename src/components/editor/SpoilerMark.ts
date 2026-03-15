import { Mark, mergeAttributes } from '@tiptap/core'

export const SpoilerMark = Mark.create({
  name: 'spoiler',
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span.spoiler' }]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'spoiler' }), 0]
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '<span class="spoiler">',
          close: '</span>',
        },
      },
    }
  },
})
