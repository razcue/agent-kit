import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { describe, it } from "node:test"
import { CASES, NEGATIVE, skillsUsed } from "./triggers.mjs"

const use = (skill) => JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill } }] } })

// ZOMBIES: Zero, One, Many, Interface apply.
describe("triggers", () => {
  it("Zero: no stream, no skills", () => assert.deepEqual(skillsUsed([]), []))
  it("One: namespaced skill name is normalised", () => assert.deepEqual(skillsUsed([use("agent-kit:tdd")]), ["tdd"]))
  it("Many: other tools and junk lines are ignored", () =>
    assert.deepEqual(skillsUsed(["warning", use("spec"), JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: {} }] } })]), ["spec"]))
  it("Interface: negative cases exist", () => assert.ok(NEGATIVE.length >= 3))
  it("Interface: one case per plugin skill and per template stack skill", () =>
    assert.deepEqual(
      CASES.map(([s]) => s).sort(),
      [...readdirSync(new URL("../../plugin/skills", import.meta.url)), ...readdirSync(new URL("../../templates/skills", import.meta.url))].sort(),
    ))
})
