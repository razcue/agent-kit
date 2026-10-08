import { z } from "zod"

/** FK references in the API are UUIDs. */
export const idSchema = z.uuid()

/** Natural codes: uppercase letters, digits and underscores. */
export const codeSchema = z.string().regex(/^[A-Z0-9_]+$/, "Uppercase letters, digits and _ only")

/** Applied on form submit so users can type freely: "cuenta caja" → "CUENTA_CAJA". */
export function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_")
}
