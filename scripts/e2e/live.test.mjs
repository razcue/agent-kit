import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { EXPECTED_SKILLS, failures, inspect } from "./live.mjs"

const init = JSON.stringify({ type: "system", subtype: "init", plugins: [{ name: "agent-kit" }], skills: EXPECTED_SKILLS.map((s) => `agent-kit:${s}`) })
const ctx = JSON.stringify({ type: "system", subtype: "hook_response", output: '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"# agent-kit · x"}}' })
const blocked = JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", content: "[agent-kit git-guard] read-only" }] } })
const nudge = JSON.stringify({ type: "system", subtype: "hook_response", output: '{"additionalContext":"[agent-kit] You wrote a script outside"}' })

const TRACE = "t SessionStart /p\nt PreToolUse:Bash git status --short\nt PreToolUse:Bash git commit --allow-empty -m probe\nt PostToolUse:Write /tmp/agent-kit-live-stray-1.mjs project=/p\nt Stop /p\n"

// ZOMBIES: Zero, Many, Boundaries, Interface, Exceptions apply.
describe("live", () => {
  it("Zero: no output means every check fails", () => assert.equal(failures(inspect([]), false).length, 6))
  it("Boundaries: a commit attempted but not blocked fails", () =>
    assert.ok(failures(inspect([init, ctx], TRACE), true).includes("git guard let a commit through")))
  it("Boundaries: the model declining the commit is fine when the hook is wired", () => {
    const noCommit = TRACE.replace(/.*git commit.*\n/, "")
    assert.deepEqual(failures(inspect([init, ctx], noCommit), true), [])
  })
  it("Many: a full healthy stream passes", () => assert.deepEqual(failures(inspect([init, ctx, blocked], TRACE), true), []))
  it("Many: the nudge also counts when seen in the stream", () => assert.equal(inspect([nudge]).nudged, true))
  it("Boundaries: a checkpoint file without a Stop run does not count", () =>
    assert.ok(failures(inspect([init, ctx, blocked, nudge]), true).includes("Stop checkpoint not written")))
  it("Interface: reports exactly the missing skills", () => {
    const partial = JSON.stringify({ type: "system", subtype: "init", plugins: [{ name: "agent-kit" }], skills: ["agent-kit:spec"] })
    assert.match(failures(inspect([partial, ctx, blocked], TRACE), true)[0], /skills missing: adopt, commit, decide/)
  })
  it("Exceptions: ignores non-JSON lines (warnings on stderr)", () => assert.equal(inspect(["Warning: x", init]).plugin, true))
})
