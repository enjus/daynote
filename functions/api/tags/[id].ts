import type { Env } from '../env'

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string
  await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()
  return Response.json({ ok: true })
}
