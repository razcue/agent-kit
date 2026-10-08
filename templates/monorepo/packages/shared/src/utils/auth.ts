/** Routes reachable without a session. */
export const PUBLIC_ROUTES = ["/login"]

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Lets users sign in with a short login ("ana") when the app sets an email domain. */
export function deriveAuthEmail(input: string, domain: string): string {
  const value = input.trim().toLowerCase()
  if (value.includes("@") || !domain) return value
  return `${value}@${domain.replace(/^@/, "")}`
}

/** Where to go after login: only same-site paths, never an external URL. */
export function safeRedirect(target: unknown, fallback = "/"): string {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : fallback
}
