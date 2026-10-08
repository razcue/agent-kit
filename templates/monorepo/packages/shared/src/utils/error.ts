/** Human-readable message from a $fetch / h3 / Error value, with a fallback. */
export function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const err = e as { data?: { message?: unknown }; message?: unknown }
    if (typeof err.data?.message === "string" && err.data.message) return err.data.message
    if (typeof err.message === "string" && err.message) return err.message
  }
  return fallback
}
