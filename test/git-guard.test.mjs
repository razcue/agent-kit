import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { gitCalls, verdict } from "../plugin/scripts/git-guard.mjs"

const PROT = ["main", "master"]
const v = (cmd, flow) => gitCalls(cmd, "/tmp").map((c) => verdict(c, flow, PROT)).find(Boolean) ?? null

test("plugin.R4.S2 git-guard has no download command in its source and still lets git fetch through", () => {
  const src = readFileSync(new URL("../plugin/scripts/git-guard.mjs", import.meta.url), "utf8")
  assert.doesNotMatch(src, /\b(fetch|pull|clone|curl|wget)\b/)
  assert.equal(v("git fetch origin", "read-only"), null)
  assert.equal(v("git fetch --all", "pr"), null)
  assert.match(v("git pull", "read-only") ?? "", /read-only/, "still blocked in a read-only project")
  assert.match(v("git clone x y", "read-only") ?? "", /read-only/)
})
