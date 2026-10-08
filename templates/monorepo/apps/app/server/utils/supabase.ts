import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import type { H3Event } from "h3"

let service: SupabaseClient | null = null

/** Service-role client. Server only — never import from app/ code. */
export function getServiceSupabase(): SupabaseClient {
  if (!service) {
    const config = useRuntimeConfig()
    service = createClient(config.public.supabaseUrl, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return service
}

/** Validates the Bearer token; rejects missing, invalid and suspended accounts. */
export async function requireUser(event: H3Event): Promise<{ user: User; token: string }> {
  const header = getHeader(event, "authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!token) throw createError({ statusCode: 401, message: "Not authenticated" })

  const { data, error } = await getServiceSupabase().auth.getUser(token)
  if (error || !data.user) throw createError({ statusCode: 401, message: "Invalid session" })
  const bannedUntil = data.user.banned_until ? new Date(data.user.banned_until) : null
  if (bannedUntil && bannedUntil > new Date())
    throw createError({ statusCode: 401, message: "Account suspended" })
  return { user: data.user, token }
}
