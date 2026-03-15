import type { Env } from '../env'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_CONTENT_BYTES = 5 * 1024 * 1024 // 5 MB

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const { date_key, encrypted_content, iv, content_hash } = await request.json() as {
    date_key: string
    encrypted_content: string
    iv: string
    content_hash: string
  }
  if (!DATE_RE.test(date_key)) return new Response('Invalid date_key', { status: 400 })
  if (!encrypted_content || !iv || !content_hash) return new Response('Missing fields', { status: 400 })
  if (encrypted_content.length > MAX_CONTENT_BYTES) return new Response('Content too large', { status: 413 })
  const result = await env.DB.prepare(
    `INSERT INTO notes (date_key, encrypted_content, iv, content_hash)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date_key) DO UPDATE SET encrypted_content=excluded.encrypted_content, iv=excluded.iv, content_hash=excluded.content_hash, updated_at=datetime('now')`
  ).bind(date_key, encrypted_content, iv, content_hash).run()

  const row = await env.DB.prepare('SELECT id FROM notes WHERE date_key = ?').bind(date_key).first()
  return Response.json({ id: row?.id })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')

  if (start && end) {
    const rows = await env.DB.prepare(
      'SELECT id, date_key, encrypted_content, iv, content_hash, updated_at FROM notes WHERE date_key >= ? AND date_key <= ? ORDER BY date_key'
    ).bind(start, end).all()
    return Response.json(rows.results)
  }

  return Response.json([])
}
