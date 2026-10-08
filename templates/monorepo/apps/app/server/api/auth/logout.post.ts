// Revokes the session server-side; the client then clears its local copy.
export default defineEventHandler(async (event) => {
  const { token } = await requireUser(event)
  await getServiceSupabase().auth.admin.signOut(token, "local").catch(() => {})
  return { ok: true }
})
