import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Adds a small favicon widget before every link in the editor.
// The favicon is sourced from Google's favicon CDN by hostname — no async call needed.
export const LinkFaviconExtension = Extension.create({
  name: 'linkFavicon',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('linkFavicon'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (!node.isText) return
              const linkMark = node.marks.find((m) => m.type.name === 'link')
              if (!linkMark?.attrs.href) return

              try {
                const hostname = new URL(linkMark.attrs.href as string).hostname
                const img = document.createElement('img')
                img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
                img.className = 'link-favicon'
                img.alt = ''
                img.onerror = () => { img.style.display = 'none' }
                // side: -1 places the widget just before the mark opens in the DOM
                decorations.push(Decoration.widget(pos, img, { side: -1 }))
              } catch {
                // skip invalid URLs
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
