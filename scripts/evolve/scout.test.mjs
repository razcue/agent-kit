import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { added, majorBehind, majorOf, parseHookEvents, templateDeps } from "./scout.mjs"

// ZOMBIES: Zero, One, Many, Boundaries apply.
describe("scout", () => {
  it("Boundaries: majors, 0.x minors are breaking", () => {
    assert.equal(majorOf("^4.4.6"), "4")
    assert.equal(majorOf("^0.11.3"), "0.11")
    assert.equal(majorBehind("^4.4.6", "5.0.0"), true)
    assert.equal(majorBehind("^4.4.6", "4.9.1"), false)
    assert.equal(majorBehind("^0.11.3", "0.12.0"), true)
    assert.equal(majorBehind("^0.11.3", "0.11.9"), false)
    assert.equal(majorBehind("^5.0.0", "4.0.0"), false)
    assert.equal(majorBehind("*", "1.0.0"), false)
  })
  it("Many: hook events from headings only", () =>
    assert.deepEqual(parseHookEvents("### PreToolUse\n### Stop input\n### SessionStart\n### Stop\n## Hooks\n### PreToolUse\n"), ["PreToolUse", "SessionStart"]))
  it("Zero/One: what's new vs the baseline", () => {
    assert.deepEqual(added(undefined, ["A"]), ["A"])
    assert.deepEqual(added(["A"], ["A", "B"]), ["B"])
    assert.deepEqual(added(["A"], ["A"]), [])
  })
  it("Interface: template deps exclude the scaffold's own workspaces", () => {
    const deps = templateDeps()
    assert.ok(deps.nuxt && deps.zod)
    assert.ok(!Object.keys(deps).some((d) => d.startsWith("@__NAME__")))
  })
})
