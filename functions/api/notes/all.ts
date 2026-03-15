import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare(
    'SELECT id, date_key, encrypted_content, iv, content_hash, updated_at FROM notes ORDER BY date_key'
  ).all()
  return Response.json(rows.results)
}
