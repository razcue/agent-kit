import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

/**
 * Browser Supabase client — auth session only (setSession, refresh,
 * onAuthStateChange, signOut). Never use it for tables, RPCs or storage:
 * data goes through /api routes.
 */
export function useSupabase(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
