interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare(
    'SELECT salt, recovery_salt, wrapped_master_key, wrapped_master_key_iv, wrapped_master_key_recovery, wrapped_master_key_recovery_iv, timezone FROM settings WHERE id = 1'
  ).first()
  return Response.json(row ?? null)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const data = await request.json() as Record<string, string>
  await env.DB.prepare(
    `INSERT INTO settings (id, salt, recovery_salt, wrapped_master_key, wrapped_master_key_iv, wrapped_master_key_recovery, wrapped_master_key_recovery_iv, timezone)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       salt=excluded.salt,
       recovery_salt=excluded.recovery_salt,
       wrapped_master_key=excluded.wrapped_master_key,
       wrapped_master_key_iv=excluded.wrapped_master_key_iv,
       wrapped_master_key_recovery=excluded.wrapped_master_key_recovery,
       wrapped_master_key_recovery_iv=excluded.wrapped_master_key_recovery_iv,
       timezone=excluded.timezone`
  ).bind(
    data.salt, data.recovery_salt,
    data.wrapped_master_key, data.wrapped_master_key_iv,
    data.wrapped_master_key_recovery, data.wrapped_master_key_recovery_iv,
    data.timezone
  ).run()
  return Response.json({ ok: true })
}
