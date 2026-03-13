# Daynote

A personal daily note-taking app. One note per day, rich text editor over Markdown, everything encrypted in the browser before it leaves your device.

## Features

- **One note per day** — navigate by date with prev/next arrows or a calendar picker
- **Rich text editing** — bold, italic, headings, lists, task lists, blockquotes, code, links
- **Tags** — highlight any word or phrase as a tag; sidebar shows all tags with note counts
- **Hidden text** — mark sensitive passages as spoilers; hidden by default, revealed on tap
- **Full-text search** — Cmd+K searches all notes client-side; results are cached for speed
- **Export** — download the current note or all notes as Markdown; print or save as PDF
- **End-to-end encryption** — AES-256-GCM; the server stores only ciphertext and never sees plaintext
- **Password + recovery key** — two ways to unlock; password changes don't require re-encrypting notes

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Editor | Tiptap (ProseMirror) |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite at the edge) |
| Crypto | Web Crypto API — AES-256-GCM, PBKDF2 |
| Deploy | Cloudflare Pages |

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — `npm install -g wrangler`
- A Cloudflare account

### 1. Create the D1 database

```bash
npx wrangler d1 create daynote-db
```

Copy the `database_id` from the output into `wrangler.toml`.

### 2. Apply the schema

```bash
npx wrangler d1 execute daynote-db --file=schema.sql --remote
```

### 3. Install dependencies

```bash
npm install
```

### 4. Deploy

```bash
npm run build
npx wrangler pages deploy dist
```

## Local development

Running the full stack locally requires building first, then serving through Wrangler (which provides the D1 binding and Pages Functions):

```bash
npm run build
npx wrangler pages dev dist --d1=DB=daynote-db
```

`npm run dev` starts a Vite dev server for frontend-only work, but API calls will fail without the Pages Functions runtime.

## Commands

```bash
npm run dev        # frontend dev server (no API)
npm run build      # tsc + vite build
npm run lint       # eslint

npx wrangler pages dev dist --d1=DB=daynote-db   # full local stack (build first)
npx wrangler pages deploy dist                    # deploy to Cloudflare Pages
npx wrangler d1 execute daynote-db --file=schema.sql --remote  # apply schema changes
```

## Encryption model

1. On first setup, a random **master key** (AES-256-GCM) is generated in the browser.
2. The master key is **wrapped** twice: once with a key derived from your password (PBKDF2), once with a key derived from a random recovery key.
3. Both wrapped copies are stored in D1. The master key itself is never stored anywhere.
4. On unlock, the appropriate wrapped copy is unwrapped and held in React state (and `sessionStorage` for session persistence).
5. Each note is encrypted with the master key and a unique random IV before upload.

Changing your password only re-wraps the master key — notes are not re-encrypted.

## Security model and threat model

Daynote is a **single-user, personal app**. The backend API has no authentication — security relies entirely on encryption. This is an intentional tradeoff:

- An attacker with access to the D1 database sees only ciphertext and cannot read your notes without your password or recovery key.
- An attacker with network access to the API could overwrite or delete encrypted data (denial of service), but cannot read plaintext.
- The recovery key is as sensitive as your password — store it securely offline.
- This app is not designed for multi-user deployments or adversarial network environments.

## Project structure

```
functions/api/          Cloudflare Pages Functions (backend)
  settings.ts           GET/PUT /api/settings (wrapped keys, salt)
  notes/                GET/PUT /api/notes, date queries
  tags/                 GET/POST/DELETE /api/tags

src/
  lib/
    api.ts              Typed fetch client for all API endpoints
    crypto.ts           Web Crypto helpers (encrypt, decrypt, wrap, PBKDF2)
    search.ts           Client-side search cache and query logic
    backup.ts           Backup nudge state (localStorage)
    dates.ts            Date key formatting and navigation helpers
  hooks/
    useCrypto.tsx       Key management context (setup, unlock, lock)
    useNote.ts          Note load / autosave / conflict resolution
    useTags.ts          Tag list with per-tag note counts
  components/
    auth/               Setup and unlock screens
    editor/             Tiptap editor, bubble toolbar, TagMark, SpoilerMark
    nav/                Day navigation, calendar, search dialog
    notes/              DayPage, TagPage, export dialog

schema.sql              D1 database schema
wrangler.toml           Cloudflare configuration
```
# daynote
