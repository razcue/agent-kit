// The signed-in user. Server-owned fields come from app_metadata — never from
// user_metadata, which users can edit themselves.
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  return { user: { id: user.id, email: user.email ?? null, name: (user.app_metadata?.name as string) ?? null } }
})
