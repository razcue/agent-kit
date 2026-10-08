// Login goes through the BFF, never straight from the browser: the server
// throttles by login and IP (Supabase only sees this server's address), signs
// in, and hands the session to the client, which stores it with setSession.
import { createClient } from "@supabase/supabase-js"
import { loginSchema } from "@__NAME__/shared/schemas/auth"
import { deriveAuthEmail } from "@__NAME__/shared/utils/auth"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readValidatedBody(event, loginSchema.parse)
  const email = deriveAuthEmail(body.email, config.public.authEmailDomain)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const sb = getServiceSupabase()

  const { data: wait, error: waitErr } = await sb.rpc("login_wait_seconds", { p_login: email, p_ip: ip })
  if (waitErr) throw createError({ statusCode: 500, message: waitErr.message })
  if ((wait as number) > 0) {
    const minutes = Math.ceil((wait as number) / 60)
    throw createError({ statusCode: 429, message: `Too many failed attempts. Try again in ${minutes} minute(s).` })
  }

  // A throwaway client: the service singleton must never hold a user session.
  const authClient = createClient(config.public.supabaseUrl, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password: body.password })
  await sb.rpc("login_record", { p_login: email, p_ip: ip, p_success: !error && Boolean(data.session) })
  if (error || !data.session || !data.user) throw createError({ statusCode: 401, message: "Invalid credentials" })

  return {
    user: { id: data.user.id, email: data.user.email ?? null, name: (data.user.app_metadata?.name as string) ?? null },
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  }
})
