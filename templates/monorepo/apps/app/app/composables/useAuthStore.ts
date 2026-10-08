import type { Session } from "@supabase/supabase-js"
import type { LoginInput, SessionUser } from "@__NAME__/shared/schemas/auth"
import { defineStore } from "pinia"

/**
 * Session lives in the Supabase client (local storage, auto-refresh); the user
 * profile comes from /api/auth/me. Every data call sends `authHeaders`.
 */
export const useAuthStore = defineStore("auth", () => {
  const supabase = useSupabase()
  const session = shallowRef<Session | null>(null)
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)
  const loading = ref(false)

  const accessToken = computed(() => session.value?.access_token ?? null)
  const isAuthenticated = computed(() => Boolean(session.value && user.value))
  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value ?? ""}` }))

  let initial: Promise<void> | null = null

  async function loadUser(next: Session | null) {
    session.value = next
    if (!next) {
      user.value = null
      return
    }
    try {
      const me = await $fetch<{ user: SessionUser }>("/api/auth/me", {
        headers: { Authorization: `Bearer ${next.access_token}` },
      })
      user.value = me.user
    } catch {
      user.value = null
    }
  }

  /** Restores the stored session once (route middleware awaits it). */
  function ensureReady() {
    initial ??= (async () => {
      const { data } = await supabase.auth.getSession()
      await loadUser(data.session)
      ready.value = true
    })()
    return initial
  }

  async function login(input: LoginInput) {
    loading.value = true
    try {
      const res = await $fetch<{ user: SessionUser; access_token: string; refresh_token: string }>("/api/auth/login", {
        method: "POST",
        body: input,
      })
      const { data, error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      })
      if (error) throw error
      session.value = data.session
      user.value = res.user
      ready.value = true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    if (accessToken.value)
      await $fetch("/api/auth/logout", { method: "POST", headers: authHeaders.value }).catch(() => {})
    await supabase.auth.signOut()
    session.value = null
    user.value = null
  }

  if (import.meta.client)
    supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes only swap the session; sign-in/out reload the user.
      if (event === "TOKEN_REFRESHED") session.value = next
      else if (event === "SIGNED_OUT") loadUser(null)
    })

  return { session, user, ready, loading, accessToken, isAuthenticated, authHeaders, ensureReady, login, logout }
})
