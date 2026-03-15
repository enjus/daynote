import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare('SELECT id, name FROM tags ORDER BY name').all()
  return Response.json(rows.results)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { name } = await request.json() as { name: string }
  const normalized = name.toLowerCase().trim()
  if (!normalized || normalized.length > 100) return new Response('Invalid tag name', { status: 400 })

  const existing = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(normalized).first()
  if (existing) {
    return Response.json({ id: existing.id })
  }

  await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(normalized).run()
  const row = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(normalized).first()
  return Response.json({ id: row?.id })
}
