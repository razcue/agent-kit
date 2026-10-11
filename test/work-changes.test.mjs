import assert from "node:assert/strict"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { collectWork, createWork, migrateWorkLayout, traceChange, workGaps } from "../plugin/scripts/work.mjs"
import { analyze } from "../plugin/scripts/preflight.mjs"

const DELTA = `# Delta — auth

## ADDED Requirements

### auth.R1 — Logout revokes
When a user logs out, the BFF shall revoke the session.

#### auth.R1.S1 — Logout @simple
- Given a signed-in user
- When the user logs out
- Then the session token is rejected

#### auth.R1.S2 — Revoked token reused @exception
- Given a token revoked by logout
- When it is used again
- Then the BFF answers 401
`

const tmp = () => mkdtempSync(join(tmpdir(), "ak-changes-"))
const put = (dir, rel, text) => {
  mkdirSync(join(dir, rel, ".."), { recursive: true })
  writeFileSync(join(dir, rel), text)
}

test("work new change: proposal, plan and tasks under work/changes; numbering spans the legacy layout", () => {
  const dir = tmp()
  put(dir, "work/specs/004-old/spec.md", "---\nstatus: done\n---\n# Old\n")
  assert.deepEqual(createWork(dir, "change", "logout", "Logout"), [
    "work/changes/005-logout/proposal.md",
    "work/changes/005-logout/plan.md",
    "work/changes/005-logout/tasks.md",
  ])
  assert.match(readFileSync(join(dir, "work/changes/005-logout/proposal.md"), "utf8"), /^---\nid: 005-logout\nstatus: draft/)
  assert.deepEqual(createWork(dir, "spec", "alias"), ["work/changes/006-alias/proposal.md", "work/changes/006-alias/plan.md", "work/changes/006-alias/tasks.md"], "`spec` stays an alias")
})

test("work collect: changes from both layouts, living spec folders are not work items", () => {
  const dir = tmp()
  put(dir, "work/specs/004-old/spec.md", "---\nstatus: approved\n---\n# Old\n")
  put(dir, "work/specs/auth/spec.md", "---\ncapability: auth\n---\n# Auth\n")
  put(dir, "work/changes/005-logout/proposal.md", "---\nstatus: in-progress\n---\n# Logout\n")
  put(dir, "work/changes/005-logout/tasks.md", "- [x] T1\n- [ ] T2 next\n")
  const items = collectWork(dir)
  assert.deepEqual(items.map((w) => [w.kind, w.id, w.path, w.status]), [
    ["change", "004-old", "work/specs/004-old", "approved"],
    ["change", "005-logout", "work/changes/005-logout", "in-progress"],
  ])
  assert.equal(items[1].next, "T2 next")
})

test("001/AC-8 upgrade moves legacy spec folders to work/changes untouched; their NNN/AC-n trace still works", () => {
  const dir = tmp()
  const spec = "---\nstatus: done\n---\n# Old\n\n- **AC-1** Given x When y Then z\n"
  put(dir, "work/specs/004-old/spec.md", spec)
  put(dir, "work/specs/004-old/tasks.md", "- [x] T1\n")
  put(dir, "work/specs/auth/spec.md", "living")
  assert.deepEqual(migrateWorkLayout(dir), ["work/specs/004-old → work/changes/004-old"])
  assert.equal(readFileSync(join(dir, "work/changes/004-old/spec.md"), "utf8"), spec)
  assert.ok(!existsSync(join(dir, "work/specs/004-old")))
  assert.ok(existsSync(join(dir, "work/specs/auth/spec.md")), "living specs stay")
  assert.deepEqual(migrateWorkLayout(dir), [], "second run moves nothing")
  const change = collectWork(dir).find((w) => w.id === "004-old")
  const rows = traceChange(change, [{ path: "a.test.ts", text: 'it("004/AC-1 works")' }])
  assert.deepEqual(rows.map((r) => [r.id, r.covered]), [["AC-1", true]])
})

test("001/AC-6 trace of a change with deltas is by scenario id", () => {
  const dir = tmp()
  put(dir, "work/changes/005-logout/proposal.md", "---\nstatus: approved\n---\n# Logout\n")
  put(dir, "work/changes/005-logout/specs/auth.md", DELTA)
  put(dir, "work/changes/005-logout/tasks.md", "| Scenario | Evidence | Result |\n| auth.R1.S2 | manual: reused a token | ✅ |\n")
  const change = collectWork(dir)[0]
  const rows = traceChange(change, [{ path: "a.test.ts", text: 'it("auth.R1.S1 revokes")' }])
  assert.deepEqual(rows.map((r) => [r.id, r.covered]), [["auth.R1.S1", true], ["auth.R1.S2", true]])
})

test("001/AC-7 gaps: uncovered or unmerged done changes block, approved ones and living specs warn", () => {
  const dir = tmp()
  put(dir, "work/changes/005-logout/proposal.md", "---\nstatus: done\n---\n# Logout\n")
  put(dir, "work/changes/005-logout/specs/auth.md", DELTA)
  put(dir, "work/changes/006-next/proposal.md", "---\nstatus: approved\n---\n# Next\n")
  put(dir, "work/changes/006-next/specs/auth.md", DELTA.replaceAll("auth.R1", "auth.R2"))
  const tests = [{ path: "a.test.ts", text: 'it("auth.R1.S1 x")' }]
  const g = workGaps(dir, tests)
  assert.deepEqual(g.gaps.map((x) => [x.spec.id, x.spec.status, x.missing]), [["005-logout", "done", ["auth.R1.S2"]], ["006-next", "approved", ["auth.R2.S1", "auth.R2.S2"]]])
  assert.deepEqual(g.unmerged, ["005-logout"])
  const r = analyze({ status: new Map(), added: new Map(), ...g })
  assert.match(r.violations.join("\n"), /005-logout.*auth\.R1\.S2.*scenario id/)
  assert.match(r.violations.join("\n"), /005-logout.*not merged.*specs\.mjs merge 005/)
  assert.match(r.warnings.join("\n"), /006-next/)

  put(dir, "work/specs/auth/spec.md", `---\ncapability: auth\n---\n\n# Auth\n\n## Requirements\n\n${DELTA.split("## ADDED Requirements\n\n")[1]}`)
  writeFileSync(join(dir, "work/changes/005-logout/proposal.md"), "---\nstatus: done\nmerged: 2026-10-10\n---\n# Logout\n")
  const g2 = workGaps(dir, tests)
  assert.deepEqual(g2.unmerged, [])
  assert.deepEqual(g2.living, { uncovered: 1, total: 2 })
  assert.match(analyze({ status: new Map(), added: new Map(), ...g2 }).warnings.join("\n"), /1 of 2 living-spec scenario\(s\) not covered/)
})

test("001/AC-7 lint errors in specs surface as preflight warnings", () => {
  const dir = tmp()
  put(dir, "work/changes/005-logout/proposal.md", "---\nstatus: approved\n---\n# Logout\n")
  put(dir, "work/changes/005-logout/specs/auth.md", DELTA.replace("When a user logs out, the BFF shall revoke the session.", "Logout works."))
  const g = workGaps(dir, [])
  assert.match(g.lint.join("\n"), /auth\.R1: requirement is not EARS/)
  assert.match(analyze({ status: new Map(), added: new Map(), ...g }).warnings.join("\n"), /work\/changes\/005-logout\/specs\/auth\.md: auth\.R1: requirement is not EARS/)
})

test("001/AC-8 `agent-kit upgrade` moves the legacy layout", async () => {
  const { spawnSync } = await import("node:child_process")
  const cli = new URL("../cli/index.mjs", import.meta.url).pathname
  const dir = tmp()
  const r1 = spawnSync("node", [cli, "init", dir, "--yes", "--kind", "existing", "--name", "up", "--git", "pr"], { encoding: "utf8" })
  assert.equal(r1.status, 0, r1.stderr)
  put(dir, "work/specs/003-old/spec.md", "---\nstatus: done\n---\n# Old\n")
  const r2 = spawnSync("node", [cli, "upgrade", dir, "--yes"], { encoding: "utf8" })
  assert.equal(r2.status, 0, r2.stderr)
  assert.match(r2.stdout, /move {4}work\/specs\/003-old → work\/changes\/003-old/)
  assert.ok(existsSync(join(dir, "work/changes/003-old/spec.md")))
})

test("session-start: one line naming the living specs, none when there are none", async () => {
  const { specsSummary } = await import("../plugin/scripts/session-start.mjs")
  const dir = tmp()
  assert.equal(specsSummary(dir), null)
  put(dir, "work/specs/auth/spec.md", `---\ncapability: auth\n---\n\n# Auth\n\n## Requirements\n\n${DELTA.split("## ADDED Requirements\n\n")[1]}`)
  put(dir, "work/specs/billing/spec.md", "---\ncapability: billing\n---\n\n# Billing\n\n## Requirements\n")
  assert.match(specsSummary(dir), /^Living specs \(requirements\): auth \(1\), billing \(0\)\.$/)
  assert.match(specsSummary(dir, 1), /auth \(1\), … 1 more/)
})
