import type { Env } from '../env'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const direction = url.searchParams.get('direction')

  if (!date || !direction) {
    return new Response('Missing date or direction', { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response('Invalid date', { status: 400 })
  if (direction !== 'prev' && direction !== 'next') return new Response('Invalid direction', { status: 400 })

  let row
  if (direction === 'prev') {
    row = await env.DB.prepare(
      'SELECT date_key FROM notes WHERE date_key < ? ORDER BY date_key DESC LIMIT 1'
    ).bind(date).first()
  } else {
    row = await env.DB.prepare(
      'SELECT date_key FROM notes WHERE date_key > ? ORDER BY date_key ASC LIMIT 1'
    ).bind(date).first()
  }

  return Response.json(row ? row.date_key : null)
}
