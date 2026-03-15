import type { Env } from '../env'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const dateKey = params.dateKey as string
  if (!DATE_RE.test(dateKey)) return new Response('Invalid date', { status: 400 })
  const row = await env.DB.prepare(
    'SELECT id, date_key, encrypted_content, iv, content_hash, updated_at FROM notes WHERE date_key = ?'
  ).bind(dateKey).first()
  return Response.json(row ?? null)
}
