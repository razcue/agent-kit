import { describe, expect, it } from "vitest"
import { getErrorMessage } from "./error"

describe("getErrorMessage", () => {
  it("prefers the server message from a fetch error", () => {
    expect(getErrorMessage({ data: { message: "Not allowed" }, message: "403" }, "x")).toBe("Not allowed")
  })

  it("falls back when nothing usable is present", () => {
    expect(getErrorMessage(null, "Could not load")).toBe("Could not load")
  })
})
