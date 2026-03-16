# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # local dev server (frontend only — API calls will fail without Pages Functions)
npm run build        # tsc -b && vite build
npm run lint         # eslint

npx wrangler pages dev dist --d1=DB=daynote-db   # run full stack locally (build first)
npx wrangler pages deploy dist --branch=production # deploy to Cloudflare Pages
npx wrangler d1 execute daynote-db --file=schema.sql --remote  # apply schema migrations
```

There are no tests.

## Architecture

Daynote is a single-page React app deployed to **Cloudflare Pages**. The backend is **Cloudflare Pages Functions** (file-based routing under `functions/api/`) backed by **Cloudflare D1** (SQLite). All note content is encrypted client-side before it ever leaves the browser — the server stores only ciphertext and never sees plaintext.

### Encryption model

`src/lib/crypto.ts` is the most security-critical file. The model:

1. On setup, a random **master key** (AES-256-GCM, extractable) is generated.
2. The master key is **wrapped** (encrypted) twice: once with a PBKDF2-derived key from the user's password, once with a PBKDF2-derived key from a random recovery key.
3. Both wrapped copies are stored in D1 `settings`. The master key itself is never stored.
4. On unlock, the appropriate wrapped copy is unwrapped and held in React state (and sessionStorage for session persistence across navigations).
5. Each note is encrypted with the master key + a unique random IV before upload.

Password changes only require re-wrapping the master key, not re-encrypting all notes.

### Data flow

- **`src/lib/api.ts`** — typed fetch client for all `functions/api/` endpoints.
- **`src/hooks/useCrypto.tsx`** — React context provider. Manages setup/unlock/lock lifecycle, holds `masterKey` in state. Persists the raw key bytes in `sessionStorage` (keyed `daynote-session-key`) so navigations don't require re-login.
- **`src/hooks/useNote.ts`** — loads, decrypts, autosaves (2s debounce), and polls for remote changes every 30s. Surfaces a `conflict` state when both local and remote have diverged since load; autosave is paused until resolved.
- **`src/hooks/useTags.ts`** — requires `masterKey` as argument. Decrypts all notes in the background to compute per-tag occurrence counts.

### Editor

`src/components/editor/DaynoteEditor.tsx` wraps Tiptap (ProseMirror). Key details:
- Content is stored and retrieved as **Markdown** via the `tiptap-markdown` extension. Access markdown via `(editor.storage as any).markdown.getMarkdown()` — the type is not exported by the library.
- `TagMark.ts` is a custom Tiptap `Mark`. Tags render as `<span class="daynote-tag" data-tag="name">`.
- `BubbleToolbar.tsx` is a custom floating toolbar (Tiptap v3 does not ship a React `BubbleMenu` component). It positions itself using `window.getSelection().getRangeAt(0).getBoundingClientRect()`.
- Tab/Shift-Tab on headings promotes/demotes heading level (H1↔H6).

### Backend (Pages Functions)

`functions/api/` uses Cloudflare's file-based routing. The D1 binding is `DB` (declared in `wrangler.toml` and typed in `functions/api/env.d.ts`). All endpoints are simple CRUD — no auth middleware. Security relies entirely on client-side encryption; anyone with raw D1 access only sees ciphertext.

Routes: `GET/PUT /api/settings`, `GET/PUT /api/notes`, `GET /api/notes/dates`, `GET /api/notes/all`, `GET /api/notes/adjacent`, `GET /api/notes/[dateKey]`, `GET/POST /api/tags`, `DELETE /api/tags/[id]`.

### Key conventions

- Date keys are `yyyy-MM-dd` strings (e.g. `2026-03-11`). URL paths use `/yyyy/MM/dd`.
- Dark mode is handled entirely by Tailwind's `darkMode: 'media'` — no manual toggling.
- All inputs must be `text-base` (16px minimum) to prevent iOS Safari zoom-on-focus.
- Heading demotions on export: `ExportDialog` prepends an H1 date title, so all body headings are shifted down one level via regex before download.
- `schema.sql` must be manually applied via wrangler after any schema change — there is no migration framework.
