import { describe, expect, it } from "vitest"
import { codeSchema, normalizeCode } from "./common"

describe("normalizeCode", () => {
  it("uppercases and replaces spaces with underscores", () => {
    expect(normalizeCode("  cuenta  caja ")).toBe("CUENTA_CAJA")
  })

  it("produces values the code schema accepts", () => {
    expect(codeSchema.safeParse(normalizeCode("usd cash 2")).success).toBe(true)
  })
})
