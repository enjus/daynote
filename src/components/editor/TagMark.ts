import { Mark, mergeAttributes, InputRule } from '@tiptap/core'

// Matches #word or #multi-word-phrase when followed by a space or end of line.
// Captures the word after the #.
const hashtagRule = (onTagCreate?: (name: string) => void) =>
  new InputRule({
    find: /(?:^|\s)#([\w-]+)\s$/,
    handler({ state, range, match }) {
      const tagName = match[1].toLowerCase()
      const { tr } = state
      const fullMatch = match[0]
      const hashStart = range.from + fullMatch.indexOf('#')
      const wordEnd = range.to - 1 // exclude the trailing space

      // Replace '#word' with 'word' and apply the tag mark
      tr.delete(hashStart, wordEnd)
        .insertText(tagName, hashStart)

      const markType = state.schema.marks.tag
      if (markType) {
        const markFrom = hashStart
        const markTo = hashStart + tagName.length
        tr.addMark(markFrom, markTo, markType.create({ tagName }))
      }

      onTagCreate?.(tagName)
    },
  })

export const createTagMark = (onTagCreate?: (name: string) => void) =>
  Mark.create({
    name: 'tag',
    inclusive: false, // prevent new text typed at mark boundary from inheriting the mark

    addAttributes() {
      return {
        tagName: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-tag'),
          renderHTML: (attributes: Record<string, string>) => ({
            'data-tag': attributes.tagName,
          }),
        },
      }
    },

    parseHTML() {
      return [{ tag: 'span[data-tag]' }]
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          class: 'daynote-tag',
        }),
        0,
      ]
    },

    addInputRules() {
      return [hashtagRule(onTagCreate)]
    },
  })

// Keep named export for backwards compat with static imports
export const TagMark = createTagMark()
