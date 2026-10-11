import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  earsPattern,
  lintDelta,
  lintSpec,
  mergeChange,
  mergeDelta,
  nextId,
  parseDelta,
  parseSpec,
  traceScenarios,
} from "../plugin/scripts/specs.mjs"

const LIVING = `---
capability: auth
---

# Auth

## Purpose
Who can sign in and how.

## Requirements

### auth.R1 — Login throttle
When a user fails 5 logins within 15 minutes, the system shall refuse further attempts with 429.

#### auth.R1.S1 — Fifth failure blocks @boundary
- Given a user with 4 failed logins in the last 15 minutes
- When the user fails again
- Then the next attempt gets 429

### auth.R2 — Session restore
While a session is stored, the app shall restore it on reload.

#### auth.R2.S1 — Reload keeps the user signed in @simple
- Given a signed-in user
- When the page reloads
- Then the user is still signed in

#### auth.R2.S2 — Expired session @exception
- Given a stored session that has expired
- When the page reloads
- Then the login page is shown
`

test("001/AC-1 EARS: each pattern is recognised, free text is not", () => {
  assert.equal(earsPattern("The system shall log every change."), "ubiquitous")
  assert.equal(earsPattern("When a user saves, the system shall store the record."), "event")
  assert.equal(earsPattern("While offline, the app shall queue orders."), "state")
  assert.equal(earsPattern("If the RPC fails, then the BFF shall answer 400."), "unwanted")
  assert.equal(earsPattern("Where PWA is enabled, the app shall cache the catalog."), "optional")
  assert.equal(earsPattern("While offline, when the user saves, the app shall queue the order."), "complex")
  assert.equal(earsPattern("Users can log in with email."), null)
  assert.equal(earsPattern("If the RPC fails, the BFF shall answer 400."), null, "unwanted needs 'then'")
  assert.equal(earsPattern("When a user saves the record is stored."), null)
})

test("001/AC-1 lint reports a requirement that is not EARS, with its ID", () => {
  assert.deepEqual(lintSpec(LIVING, "auth").errors, [])
  const bad = LIVING.replace("When a user fails 5 logins within 15 minutes, the system shall refuse further attempts with 429.", "Throttle logins.")
  const { errors } = lintSpec(bad, "auth")
  assert.equal(errors.length, 1)
  assert.match(errors[0], /^auth\.R1: .*EARS/)
})

test("001/AC-2 lint reports scenarios without a ZOMBIES tag, without Given/When/Then, duplicated or foreign", () => {
  const noTag = LIVING.replace("Fifth failure blocks @boundary", "Fifth failure blocks")
  assert.match(lintSpec(noTag, "auth").errors.join("\n"), /auth\.R1\.S1: .*ZOMBIES/)
  const badTag = LIVING.replace("@boundary", "@happy")
  assert.match(lintSpec(badTag, "auth").errors.join("\n"), /auth\.R1\.S1: .*ZOMBIES/)
  const noThen = LIVING.replace("- Then the next attempt gets 429\n", "")
  assert.match(lintSpec(noThen, "auth").errors.join("\n"), /auth\.R1\.S1: .*Given \/ When \/ Then/)
  const dup = LIVING.replace("#### auth.R2.S2", "#### auth.R2.S1")
  assert.match(lintSpec(dup, "auth").errors.join("\n"), /auth\.R2\.S1: duplicate/)
  const foreign = LIVING.replace("#### auth.R2.S2", "#### auth.R1.S9")
  assert.match(lintSpec(foreign, "auth").errors.join("\n"), /auth\.R1\.S9: .*under auth\.R2/)
  const otherCap = LIVING.replace("### auth.R2 — Session", "### users.R2 — Session")
  assert.match(lintSpec(otherCap, "auth").errors.join("\n"), /users\.R2: .*capability "auth"/)
  const noScenario = LIVING.replace(/#### auth\.R1\.S1[\s\S]*?429\n/, "")
  assert.match(lintSpec(noScenario, "auth").errors.join("\n"), /auth\.R1: no scenario/)
})

test("001/AC-2 lint warns when a requirement has only happy-path scenarios", () => {
  const happy = LIVING.replace("Expired session @exception", "Second reload @simple")
  assert.match(lintSpec(happy, "auth").warnings.join("\n"), /auth\.R2: .*@exception or @boundary/)
  assert.deepEqual(lintSpec(LIVING, "auth").warnings, [])
})

test("parse: requirements, scenarios, retired ids", () => {
  const s = parseSpec(LIVING.replace("capability: auth", "capability: auth\nretired: [auth.R9]"))
  assert.deepEqual(s.requirements.map((r) => r.id), ["auth.R1", "auth.R2"])
  assert.deepEqual(s.requirements[1].scenarios.map((x) => [x.id, x.tag]), [["auth.R2.S1", "simple"], ["auth.R2.S2", "exception"]])
  assert.deepEqual(s.retired, ["auth.R9"])
  assert.match(s.requirements[0].sentence, /^When a user fails 5 logins/)
})

const DELTA = `# Delta — auth

## ADDED Requirements

### auth.R3 — Logout revokes
When a user logs out, the BFF shall revoke the session.

#### auth.R3.S1 — Logout @simple
- Given a signed-in user
- When the user logs out
- Then the session token is rejected

## MODIFIED Requirements

### auth.R2 — Session restore
While a session is stored, the app shall restore it on reload and refresh its token.

#### auth.R2.S1 — Reload keeps the user signed in @simple
- Given a signed-in user
- When the page reloads
- Then the user is still signed in

#### auth.R2.S3 — Token refreshed @boundary
- Given a session one minute from expiry
- When the page reloads
- Then a new token is stored

## REMOVED Requirements

### auth.R1 — Login throttle
Reason: moved to the rate-limit capability.
`

test("parse delta: added, modified, removed", () => {
  const d = parseDelta(DELTA)
  assert.deepEqual(d.added.map((r) => r.id), ["auth.R3"])
  assert.deepEqual(d.modified.map((r) => r.id), ["auth.R2"])
  assert.deepEqual(d.removed.map((r) => r.id), ["auth.R1"])
})

test("001/AC-3 merge appends ADDED, replaces MODIFIED, removes REMOVED and retires their ids", () => {
  const { text, conflicts } = mergeDelta(LIVING, DELTA, "auth")
  assert.deepEqual(conflicts, [])
  const s = parseSpec(text)
  assert.deepEqual(s.requirements.map((r) => r.id), ["auth.R2", "auth.R3"])
  assert.match(s.requirements[0].sentence, /refresh its token/)
  assert.deepEqual(s.requirements[0].scenarios.map((x) => x.id), ["auth.R2.S1", "auth.R2.S3"])
  assert.deepEqual(s.retired.sort(), ["auth.R1", "auth.R2.S2"])
  assert.match(text, /## Purpose\nWho can sign in and how\./, "header kept")
  assert.deepEqual(lintSpec(text, "auth").errors, [])
})

test("001/AC-3 merge of a new capability creates its living spec", () => {
  const delta = "# Delta — billing\n\n## Purpose\nInvoices and payments.\n\n## ADDED Requirements\n\n### billing.R1 — Totals\nThe system shall round invoice totals to 3 decimals.\n\n#### billing.R1.S1 — Rounding @boundary\n- Given a line of 0.0005\n- When the invoice is totalled\n- Then the total is 0.001\n"
  const { text, conflicts } = mergeDelta(null, delta, "billing")
  assert.deepEqual(conflicts, [])
  assert.match(text, /^---\ncapability: billing\n---\n\n# Billing\n\n## Purpose\nInvoices and payments\.\n\n## Requirements\n\n### billing\.R1/)
  assert.deepEqual(lintSpec(text, "billing").errors, [])
})

test("001/AC-4 merge refuses MODIFIED/REMOVED of a missing requirement and ADDED of a taken or retired id", () => {
  const missing = mergeDelta(LIVING, DELTA.replace("### auth.R1 — Login throttle", "### auth.R7 — Ghost"), "auth")
  assert.match(missing.conflicts.join("\n"), /auth\.R7: REMOVED but not in the living spec/)
  assert.equal(missing.text, null)
  const taken = mergeDelta(LIVING, DELTA.replace("### auth.R3 — Logout", "### auth.R2 — Logout").replace("auth.R3.S1", "auth.R2.S9"), "auth")
  assert.match(taken.conflicts.join("\n"), /auth\.R2: ADDED but the id is taken/)
  const retired = mergeDelta(LIVING.replace("capability: auth", "capability: auth\nretired: [auth.R3]"), DELTA, "auth")
  assert.match(retired.conflicts.join("\n"), /auth\.R3: ADDED but the id is retired/)
  const modMissing = mergeDelta(LIVING, DELTA.replaceAll("auth.R2", "auth.R8"), "auth")
  assert.match(modMissing.conflicts.join("\n"), /auth\.R8: MODIFIED but not in the living spec/)
})

function project() {
  const dir = mkdtempSync(join(tmpdir(), "ak-specs-"))
  mkdirSync(join(dir, "work", "specs", "auth"), { recursive: true })
  mkdirSync(join(dir, "work", "changes", "007-logout", "specs"), { recursive: true })
  writeFileSync(join(dir, "work", "specs", "auth", "spec.md"), LIVING)
  writeFileSync(join(dir, "work", "changes", "007-logout", "proposal.md"), "---\nstatus: done\n---\n\n# Logout\n")
  writeFileSync(join(dir, "work", "changes", "007-logout", "specs", "auth.md"), DELTA)
  return dir
}

test("001/AC-3 mergeChange writes the living specs once; a second merge changes nothing", () => {
  const dir = project()
  const first = mergeChange(dir, "007", "2026-10-10")
  assert.deepEqual(first.conflicts, [])
  assert.deepEqual(first.written, ["work/specs/auth/spec.md"])
  const after = readFileSync(join(dir, "work", "specs", "auth", "spec.md"), "utf8")
  assert.match(readFileSync(join(dir, "work", "changes", "007-logout", "proposal.md"), "utf8"), /merged: 2026-10-10/)
  const second = mergeChange(dir, "007", "2026-10-11")
  assert.equal(second.already, true)
  assert.deepEqual(second.written, [])
  assert.equal(readFileSync(join(dir, "work", "specs", "auth", "spec.md"), "utf8"), after)
})

test("001/AC-4 mergeChange writes nothing when any delta conflicts", () => {
  const dir = project()
  writeFileSync(join(dir, "work", "changes", "007-logout", "specs", "users.md"), "# Delta — users\n\n## REMOVED Requirements\n\n### users.R1 — Ghost\nReason: x\n")
  const r = mergeChange(dir, "007", "2026-10-10")
  assert.match(r.conflicts.join("\n"), /users\.R1/)
  assert.equal(readFileSync(join(dir, "work", "specs", "auth", "spec.md"), "utf8"), LIVING)
  assert.doesNotMatch(readFileSync(join(dir, "work", "changes", "007-logout", "proposal.md"), "utf8"), /merged:/)
})

test("001/AC-5 next id skips living, retired and pending-delta ids", () => {
  const living = LIVING.replace("capability: auth", "capability: auth\nretired: [auth.R7]")
  assert.equal(nextId("auth", [living], []), "auth.R8")
  assert.equal(nextId("auth", [LIVING], []), "auth.R3")
  assert.equal(nextId("auth", [LIVING], [DELTA]), "auth.R4")
  assert.equal(nextId("billing", [], []), "billing.R1")
  assert.equal(nextId("auth.R2", [LIVING], []), "auth.R2.S3")
  assert.equal(nextId("auth.R2", [LIVING], [DELTA]), "auth.R2.S4")
  assert.equal(nextId("auth.R2", [LIVING.replace("capability: auth", "capability: auth\nretired: [auth.R2.S5]")], []), "auth.R2.S6")
})

test("001/AC-6 trace: tests naming the scenario id, ✅ rows, or not covered", () => {
  const scenarios = parseSpec(LIVING).requirements.flatMap((r) => r.scenarios)
  const tests = [
    { path: "a.test.ts", text: 'it("auth.R1.S1 blocks the fifth failure")' },
    { path: "b.test.ts", text: 'it("auth.R2.S10 something else")' },
  ]
  const checks = new Map([["auth.R2.S2", "manual: reloaded with an expired token"]])
  const rows = traceScenarios(scenarios, tests, checks)
  assert.deepEqual(rows.map((r) => [r.id, r.covered]), [["auth.R1.S1", true], ["auth.R2.S1", false], ["auth.R2.S2", true]])
  assert.deepEqual(rows[0].tests, ["a.test.ts"])
  assert.equal(rows[2].check, "manual: reloaded with an expired token")
})

test("lint delta: shapes checked, targets checked against the living spec", () => {
  assert.deepEqual(lintDelta(DELTA, LIVING, "auth").errors, [])
  assert.match(lintDelta(DELTA.replace("### auth.R1 — Login throttle", "### auth.R7 — Ghost"), LIVING, "auth").errors.join("\n"), /auth\.R7/)
  assert.match(lintDelta(DELTA.replace("When a user logs out, the BFF shall revoke the session.", "Logout works."), LIVING, "auth").errors.join("\n"), /auth\.R3: .*EARS/)
})
