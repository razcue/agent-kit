import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { changesSince, compareVersions, removeBlock, stripSettings, withSupabaseMcp } from "../cli/lib/lifecycle.mjs"
import { GIT_RULES, agentsBlock, mergeSettings, upsertBlock } from "../cli/lib/init.mjs"

const LOG = "# Changelog\n\n## 0.3.0 — c\n- three\n\n## 0.2.0 — b\n- two\n\n## 0.1.0 — a\n- one\n"

describe("upgrade: changelog since a version", () => {
  it("compares versions numerically", () => {
    assert.equal(compareVersions("0.10.0", "0.9.9"), 1)
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0)
    assert.equal(compareVersions("0.2.0", "0.10.0"), -1)
  })
  it("Zero: nothing new when already current", () => assert.deepEqual(changesSince(LOG, "0.3.0", "0.3.0"), []))
  it("Many: every section after `from` up to `to`, newest first", () =>
    assert.deepEqual(changesSince(LOG, "0.1.0", "0.3.0").map((s) => s.split(" ")[1]), ["0.3.0", "0.2.0"]))
  it("Boundaries: an unknown old version (0.0.0) shows everything", () => assert.equal(changesSince(LOG, "0.0.0", "0.3.0").length, 3))
})

describe("uninstall", () => {
  const cfg = { technicalLevel: "technical", language: "en", methodology: "sdd", gitFlow: "pr", commitConvention: "none" }
  it("removes the managed block and keeps the user's text", () => {
    const text = upsertBlock("# P\n\nOwn rules.\n", agentsBlock(cfg))
    assert.equal(removeBlock(text), "# P\n\nOwn rules.\n")
  })
  it("Zero: a file without the block is left alone (null)", () => assert.equal(removeBlock("# P\n"), null))
  it("a file that was only the block becomes empty", () => assert.equal(removeBlock(agentsBlock(cfg)), ""))
  it("settings: keeps the user's own entries, drops agent-kit's", () => {
    const merged = mergeSettings({ permissions: { deny: ["Bash(rm -rf:*)"] }, enabledPlugins: { other: true }, model: "opus" }, "read-only", { source: "github", repo: "x/y" })
    assert.deepEqual(stripSettings(merged), { permissions: { deny: ["Bash(rm -rf:*)"] }, enabledPlugins: { other: true }, model: "opus" })
  })
  it("settings with only agent-kit entries → null (delete the file)", () =>
    assert.equal(stripSettings(mergeSettings({}, "pr", { source: "github", repo: "x/y" })), null))
  it("covers every managed git rule", () => {
    for (const flow of Object.keys(GIT_RULES)) assert.equal(stripSettings(mergeSettings({}, flow, { source: "github", repo: "x/y" })), null)
  })
})

describe("supabase MCP", () => {
  const REF = "abcdefghijklmnopqrst"
  it("adds a read-only, project-scoped http server and keeps others", () => {
    const mcp = withSupabaseMcp({ mcpServers: { other: { type: "http", url: "https://x" } } }, REF)
    assert.deepEqual(mcp.mcpServers.supabase, { type: "http", url: `https://mcp.supabase.com/mcp?project_ref=${REF}&read_only=true` })
    assert.ok(mcp.mcpServers.other)
  })
  it("Exceptions: rejects anything that isn't a 20-character ref", () => {
    for (const bad of ["", "short", "https://abcdefghijklmnopqrst.supabase.co", "ABCDEFGHIJKLMNOPQRST"]) assert.throws(() => withSupabaseMcp({}, bad))
  })
})
