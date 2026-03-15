import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare('SELECT date_key FROM notes ORDER BY date_key').all()
  return Response.json(rows.results.map((r: Record<string, unknown>) => r.date_key))
}
