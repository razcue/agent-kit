# BFF (server routes)

`apps/app` is a Nuxt SPA (`ssr: false`); `apps/app/server/api/**` is its backend-for-frontend, deployed as serverless functions.

## Clients
- `getServiceSupabase()` (`server/utils/supabase.ts`) — singleton with the service-role key. Only on the server. Used for RPCs and simple reads.
- `requireUser(event)` — validates the `Authorization: Bearer <access token>` header with `auth.getUser()`; throws 401.
- Browser: `useSupabase()` — anon client used **only** for `setSession`, token refresh, `onAuthStateChange`, `signOut`.

## Route shape
```ts
// server/api/things/index.post.ts
import { createThingSchema } from "@<project>/shared/schemas/things"

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)          // + permission check when roles exist
  const body = await readValidatedBody(event, createThingSchema.parse)
  const { data, error } = await getServiceSupabase().rpc("create_thing", {
    p_name: body.name,
  })
  if (error) throw createError({ statusCode: 400, message: error.message })
  return data
})
```
- File names: `index.get.ts` (list), `index.post.ts` (create), `[id].patch.ts`, `[id].delete.ts`.
- PATCH passes `body.field ?? null` for optional fields.
- 400 for business errors, 401/403 for auth, 500 for unexpected.
- Direct reads (`sb.from(...).select()`) only for simple single-table reads, and they **must** apply the caller's scope filter in code. A failed scope lookup throws — never widen access.
- Roles and permissions come from a server-owned table, never from `user_metadata` (users can edit their own metadata). Server-owned user fields go in `app_metadata`.

## Auth flow (scaffolded)
- `POST /api/auth/login` → throttle (`login_wait_seconds` / `login_record` RPCs: 5 failures per login, 20 per IP, 15 min) → `signInWithPassword` on a throwaway client → returns the session; the browser stores it with `supabase.auth.setSession` (`useAuthStore().login`).
- Session restore: the global middleware awaits `useAuthStore().ensureReady()` (stored session → `GET /api/auth/me`); public routes are listed in `@<project>/shared/utils/auth` (`PUBLIC_ROUTES`), redirects go through `safeRedirect`.
- `POST /api/auth/logout` revokes server-side (`auth.admin.signOut(token, "local")`), then the client signs out.
- Every data call: `$fetch(url, { headers: useAuthStore().authHeaders })`.

## Client calls
```ts
const auth = useAuthStore()
const headers = computed(() => ({ Authorization: `Bearer ${auth.accessToken ?? ""}` }))
await $fetch("/api/things", { method: "POST", body, headers: headers.value })
```
Show errors with a toast using `getErrorMessage(e, "fallback")` from `@<project>/shared/utils/error`.

## Multi-step writes
If step 2 fails after step 1 succeeded (e.g. auth user created, then business row fails), undo step 1 in a `try/catch` and rethrow.
