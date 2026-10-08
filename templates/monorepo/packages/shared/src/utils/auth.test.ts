import { describe, expect, it } from "vitest"
import { deriveAuthEmail, isPublicRoute, safeRedirect } from "./auth"

// ZOMBIES: Zero, One, Boundaries, Exceptions apply.
describe("deriveAuthEmail", () => {
  it("Zero: no domain keeps the input as typed (trimmed, lower-case)", () => expect(deriveAuthEmail(" Ana@X.com ", "")).toBe("ana@x.com"))
  it("One: a short login gets the domain", () => expect(deriveAuthEmail("ana", "example.com")).toBe("ana@example.com"))
  it("Boundaries: a full email is never changed; a leading @ in the domain is tolerated", () => {
    expect(deriveAuthEmail("ana@other.org", "example.com")).toBe("ana@other.org")
    expect(deriveAuthEmail("ana", "@example.com")).toBe("ana@example.com")
  })
})

describe("isPublicRoute", () => {
  it("One: the login page is public", () => expect(isPublicRoute("/login")).toBe(true))
  it("Boundaries: prefixes must match a whole segment", () => {
    expect(isPublicRoute("/login/help")).toBe(true)
    expect(isPublicRoute("/loginx")).toBe(false)
    expect(isPublicRoute("/")).toBe(false)
  })
})

describe("safeRedirect", () => {
  it("One: keeps a same-site path", () => expect(safeRedirect("/invoices?page=2")).toBe("/invoices?page=2"))
  it("Exceptions: rejects external and protocol-relative URLs and non-strings", () => {
    expect(safeRedirect("https://evil.example")).toBe("/")
    expect(safeRedirect("//evil.example")).toBe("/")
    expect(safeRedirect(["/a"])).toBe("/")
    expect(safeRedirect(undefined, "/home")).toBe("/home")
  })
})
