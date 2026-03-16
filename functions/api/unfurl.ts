export const onRequestGet: PagesFunction = async ({ request }) => {
  const urlParam = new URL(request.url).searchParams.get('url')
  if (!urlParam) return new Response('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(urlParam)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new Response('Invalid url', { status: 400 })
  }

  const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`

  try {
    const res = await fetch(urlParam, {
      headers: { 'User-Agent': 'Daynote/1.0 (link preview)' },
      redirect: 'follow',
    })

    const html = await res.text()

    // Prefer og:title, fall back to <title>, fall back to hostname
    const ogTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    const title = (ogTitle ?? titleTag ?? parsed.hostname)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 200)

    return Response.json({ url: urlParam, title, favicon })
  } catch {
    // Return minimal result if fetch fails (private URLs, CORS, etc.)
    return Response.json({ url: urlParam, title: parsed.hostname, favicon })
  }
}
