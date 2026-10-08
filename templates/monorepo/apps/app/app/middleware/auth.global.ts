import { isPublicRoute } from "@__NAME__/shared/utils/auth"

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.meta.public === true || isPublicRoute(to.path)) return
  const auth = useAuthStore()
  await auth.ensureReady()
  if (!auth.isAuthenticated)
    return navigateTo({ path: "/login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined })
})
