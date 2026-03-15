import { useState } from 'react'
import { api } from '../../lib/api'
import { decrypt } from '../../lib/crypto'
import { useCrypto } from '../../hooks/useCrypto'
import { formatDateTitle } from '../../lib/dates'
import { recordBackup } from '../../lib/backup'

interface ExportDialogProps {
  onClose: () => void
  currentDateKey?: string
}

export function ExportDialog({ onClose, currentDateKey }: ExportDialogProps) {
  const { masterKey } = useCrypto()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  async function exportSingle() {
    if (!masterKey || !currentDateKey) return
    setExporting(true)
    setError('')
    try {
      const note = await api.getNote(currentDateKey)
      if (!note) {
        setError('No note for this date')
        return
      }
      const plaintext = await decrypt(note.encrypted_content, note.iv, masterKey)
      const header = `# ${formatDateTitle(currentDateKey)}\n\n`
      downloadFile(`${currentDateKey}.md`, header + demoteHeadings(plaintext))
      recordBackup()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setExporting(false)
    }
  }

  async function exportAll() {
    if (!masterKey) return
    setExporting(true)
    setError('')
    try {
      const notes = await api.getAllNotes()
      const parts: string[] = []

      for (const note of notes) {
        try {
          const plaintext = await decrypt(note.encrypted_content, note.iv, masterKey)
          parts.push(`# ${formatDateTitle(note.date_key)}\n\n${demoteHeadings(plaintext)}`)
        } catch {
          parts.push(`# ${formatDateTitle(note.date_key)}\n\n[Failed to decrypt]`)
        }
      }

      downloadFile('daynote-export.md', parts.join('\n\n---\n\n'))
      recordBackup()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setExporting(false)
    }
  }

  function printCurrentNote() {
    if (!currentDateKey) return
    const editorEl = document.querySelector('.tiptap')
    if (!editorEl) return
    const title = formatDateTitle(currentDateKey)
    const html = editorEl.innerHTML
    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif;
      font-size: 12pt;
      line-height: 1.65;
      color: #111;
      max-width: 680px;
      margin: 0 auto;
      padding: 48pt 0;
    }
    h1.print-date { font-size: 20pt; margin: 0 0 24pt; padding-bottom: 8pt; border-bottom: 1px solid #ddd; font-weight: 700; }
    h1 { font-size: 18pt; margin: 24pt 0 6pt; }
    h2 { font-size: 15pt; margin: 20pt 0 5pt; }
    h3 { font-size: 13pt; margin: 16pt 0 4pt; }
    h4, h5, h6 { font-size: 11pt; margin: 12pt 0 3pt; }
    p { margin: 0 0 8pt; }
    ul, ol { margin: 0 0 8pt; padding-left: 20pt; }
    li { margin-bottom: 3pt; }
    blockquote { border-left: 3pt solid #ddd; margin: 0 0 8pt; padding: 0 12pt; color: #555; font-style: italic; }
    code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; padding: 1pt 3pt; border-radius: 2pt; }
    pre { background: #f5f5f5; padding: 10pt; border-radius: 4pt; margin: 0 0 8pt; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1pt solid #ddd; margin: 20pt 0; }
    a { color: #111; text-decoration: underline; }
    ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6pt; }
    ul[data-type="taskList"] li label { display: flex; align-items: center; padding-top: 2pt; }
    ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; color: #888; }
    .daynote-tag { background: #dbeafe; color: #1e40af; padding: 0 3pt; border-radius: 2pt; font-size: 10pt; }
    /* Reveal spoilers in print — you're printing for yourself */
    .spoiler { background: transparent !important; color: inherit !important; }
    @media print {
      body { padding: 0; }
      @page { margin: 1in; size: letter; }
    }
  </style>
</head>
<body>
  <h1 class="print-date">${title}</h1>
  ${html}
  <script>window.onload = () => { window.focus(); window.print(); }<\/script>
</body>
</html>`)
    win.document.close()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Export Notes
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Download decrypted notes as Markdown.
        </p>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="space-y-2">
          {currentDateKey && (
            <button
              type="button"
              onClick={printCurrentNote}
              className="btn-secondary w-full"
            >
              Print / Save as PDF
            </button>
          )}
          {currentDateKey && (
            <button
              type="button"
              onClick={exportSingle}
              disabled={exporting}
              className="btn-secondary w-full"
            >
              Export current note (.md)
            </button>
          )}
          <button
            type="button"
            onClick={exportAll}
            disabled={exporting}
            className="btn-primary w-full"
          >
            {exporting ? 'Exporting...' : 'Export all notes (.md)'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Demote all headings by one level so the date H1 stays at the top of the hierarchy.
// H6 headings are left as H6 (can't go deeper).
function demoteHeadings(markdown: string): string {
  return markdown.replace(/^(#{1,6}) /gm, (_, hashes: string) =>
    (hashes.length < 6 ? hashes + '#' : hashes) + ' '
  )
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
