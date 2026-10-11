import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { checklistItems, fixtureGaps, parseFixtures, parseRun, qaStatus, renderChecklist, renderHtml, renderRun, scenarioHash, startRun, syncQa } from "../plugin/scripts/qa.mjs"

const spec = (cap, body) => `---\ncapability: ${cap}\n---\n\n# ${cap}\n\n## Requirements\n\n${body}`
const AUTH = spec(
  "auth",
  `### auth.R1 — Login throttle
When a user fails 5 logins within 15 minutes, the system shall refuse further attempts with 429.

#### auth.R1.S1 — Fifth failure blocks @boundary
- Given a user with 4 failed logins
- When the user fails again
- Then the next attempt gets 429

#### auth.R1.S2 — First failure only counts @simple
- Given a user with no failed logins
- When the user fails once
- Then the user can try again
`,
)
const BILLING = spec(
  "billing",
  `### billing.R1 — Totals
The BFF shall round invoice totals to 3 decimals.

#### billing.R1.S1 — Rounding @boundary
- Given a line of 0.0005
- When the invoice is totalled
- Then the total is 0.001

#### billing.R1.S2 — No lines @zero
- Given an invoice without lines
- When it is totalled
- Then the total is 0.000

#### billing.R1.S3 — Bad amount @exception
- Given a line with amount "abc"
- When it is saved
- Then the BFF answers 400
`,
)
const LIVING = [
  { cap: "auth", text: AUTH },
  { cap: "billing", text: BILLING },
]
const SEED = "BEGIN;\n-- @fixture billing.R1.S1 billing.R1.S2 @boundary\nSELECT 1;\n-- @fixture ghost.R9.S1 @one\nCOMMIT;\n"

test("002/AC-3 checklist: one item per scenario grouped by capability, with steps and tag; stable", () => {
  const items = checklistItems(LIVING, [])
  assert.deepEqual(items.map((i) => i.id), ["auth.R1.S1", "auth.R1.S2", "billing.R1.S1", "billing.R1.S2", "billing.R1.S3"])
  const md = renderChecklist(items, { fixturesFile: null })
  assert.match(md, /## auth\n\n### auth\.R1 — Login throttle\nWhen a user fails 5 logins/)
  assert.match(md, /- \[ \] \*\*auth\.R1\.S1\*\* — Fifth failure blocks `@boundary`\n {2}- Given a user with 4 failed logins\n {2}- When the user fails again\n {2}- Then the next attempt gets 429/)
  assert.match(md, /5 scenario\(s\) in 2 capability\(ies\)/)
  assert.equal(renderChecklist(checklistItems(LIVING, []), { fixturesFile: null }), md, "same input → same output")
})

test("002/AC-4 fixtures: tagged sections map to scenarios; gaps list both directions", () => {
  const fixtures = parseFixtures(SEED)
  assert.deepEqual(fixtures, [
    { ids: ["billing.R1.S1", "billing.R1.S2"], tag: "boundary", line: 2 },
    { ids: ["ghost.R9.S1"], tag: "one", line: 4 },
  ])
  const items = checklistItems(LIVING, fixtures)
  assert.deepEqual(items.find((i) => i.id === "billing.R1.S1").fixtures, [{ line: 2, tag: "boundary" }])
  const md = renderChecklist(items, { fixturesFile: "supabase/test-data/seed.sql" })
  assert.match(md, /\*\*billing\.R1\.S1\*\* — Rounding `@boundary` · data: seed\.sql:2/)
  assert.match(md, /\*\*auth\.R1\.S1\*\* — Fifth failure blocks `@boundary` · data: no fixture/)
  const gaps = fixtureGaps(items, fixtures)
  assert.deepEqual(gaps.withoutFixture, ["auth.R1.S1", "auth.R1.S2", "billing.R1.S3"])
  assert.deepEqual(gaps.unknown, [{ id: "ghost.R9.S1", line: 4 }])
})

test("002/AC-5 run file: every scenario unticked with its hash, grouped; same day gets -2", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-qa-"))
  const items = checklistItems(LIVING, [])
  const first = startRun(dir, items, "2026-10-10")
  assert.equal(first, "work/qa/runs/2026-10-10.md")
  const text = readFileSync(join(dir, first), "utf8")
  assert.match(text, /## auth\n\n\| Scenario \| Hash \| Result \| Note \|\n\|---\|---\|---\|---\|\n\| auth\.R1\.S1 \| [0-9a-f]{8} \| {2}\| {2}\|/)
  assert.equal(parseRun(text).rows.length, 5)
  assert.ok(parseRun(text).rows.every((r) => r.result === ""))
  assert.equal(startRun(dir, items, "2026-10-10"), "work/qa/runs/2026-10-10-2.md")
})

test("002/AC-6 status: latest result per scenario; re-check when its text changed; never run otherwise", () => {
  const items = checklistItems(LIVING, [])
  const h = Object.fromEntries(items.map((i) => [i.id, i.hash]))
  const run1 = `# QA run\n\n| Scenario | Hash | Result | Note |\n|---|---|---|---|\n| auth.R1.S1 | ${h["auth.R1.S1"]} | fail | 500 instead of 429 |\n| billing.R1.S1 | ${h["billing.R1.S1"]} | pass |  |\n`
  const run2 = `# QA run\n\n| Scenario | Hash | Result | Note |\n|---|---|---|---|\n| auth.R1.S1 | ${h["auth.R1.S1"]} | pass | fixed |\n| billing.R1.S1 |  |  |  |\n`
  const runs = [{ name: "2026-10-01.md", text: run1 }, { name: "2026-10-02.md", text: run2 }]
  let st = qaStatus(items, runs)
  assert.deepEqual(st.find((s) => s.id === "auth.R1.S1"), { id: "auth.R1.S1", state: "pass", run: "2026-10-02.md", note: "fixed" })
  assert.equal(st.find((s) => s.id === "billing.R1.S1").state, "pass", "an empty later row doesn't erase a result")
  assert.equal(st.find((s) => s.id === "auth.R1.S2").state, "never run")
  const changed = checklistItems([{ cap: "auth", text: AUTH }, { cap: "billing", text: BILLING.replace("the total is 0.001", "the total is 0.001 and shown") }], [])
  st = qaStatus(changed, runs)
  assert.equal(st.find((s) => s.id === "billing.R1.S1").state, "re-check")
  assert.equal(scenarioHash("a  b\n c"), scenarioHash("a b c"), "whitespace doesn't change the hash")
})

test("002/AC-7 html: self-contained page with every item; its export uses the run-file format", () => {
  const items = checklistItems(LIVING, [])
  const html = renderHtml(items, { name: "demo" })
  assert.match(html, /^<!doctype html>/)
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="http/, "no network")
  for (const i of items) assert.ok(html.includes(i.id))
  // The page builds its export with the same renderer the CLI uses (embedded below).
  const md = renderRun(items, "2026-10-10", { "auth.R1.S1": { result: "pass", note: "ok | fine" } })
  const parsed = parseRun(md)
  assert.deepEqual(parsed.rows.find((r) => r.id === "auth.R1.S1"), { id: "auth.R1.S1", hash: items[0].hash, result: "pass", note: "ok / fine" })
  assert.ok(html.includes(renderRun.toString().slice(0, 40)), "the page embeds renderRun")
})

test("sync: writes checklist.md and checklist.html; reports whether anything changed", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-qa-"))
  for (const s of LIVING) {
    mkdirSync(join(dir, "work/specs", s.cap), { recursive: true })
    writeFileSync(join(dir, "work/specs", s.cap, "spec.md"), s.text)
  }
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify({ name: "demo", qa: { checklist: true, testData: true, testDataDir: "supabase/test-data" } }))
  mkdirSync(join(dir, "supabase/test-data"), { recursive: true })
  writeFileSync(join(dir, "supabase/test-data/seed.sql"), SEED)
  const r1 = syncQa(dir)
  assert.deepEqual(r1.written.sort(), ["work/qa/checklist.html", "work/qa/checklist.md"])
  assert.match(readFileSync(join(dir, "work/qa/checklist.md"), "utf8"), /data: seed\.sql:2/)
  assert.deepEqual(syncQa(dir).written, [], "second sync changes nothing")
  assert.equal(syncQa(dir, { check: true }).outOfSync, false)
  writeFileSync(join(dir, "work/specs/auth/spec.md"), AUTH.replace("gets 429", "gets 429 Too Many Requests"))
  assert.equal(syncQa(dir, { check: true }).outOfSync, true)
})

test("002/AC-11 preflight: migrations without seed/purge changes, stale checklist and unknown fixtures warn", async () => {
  const { qaPreflight } = await import("../plugin/scripts/qa.mjs")
  const { analyze } = await import("../plugin/scripts/preflight.mjs")
  const dir = mkdtempSync(join(tmpdir(), "ak-qa-"))
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify({ name: "demo", qa: { checklist: true, testData: true, testDataDir: "supabase/test-data" } }))
  mkdirSync(join(dir, "supabase/test-data"), { recursive: true })
  writeFileSync(join(dir, "supabase/test-data/seed.sql"), SEED)
  for (const s of LIVING) {
    mkdirSync(join(dir, "work/specs", s.cap), { recursive: true })
    writeFileSync(join(dir, "work/specs", s.cap, "spec.md"), s.text)
  }
  const status = new Map([["supabase/migrations/202610101200_invoices.sql", "A"]])
  const qa = qaPreflight(dir, status)
  assert.deepEqual(qa.migrationsWithoutSeed, ["supabase/migrations/202610101200_invoices.sql"])
  assert.equal(qa.outOfSync, true)
  assert.deepEqual(qa.unknown, [{ id: "ghost.R9.S1", line: 4 }])
  const w = analyze({ status: new Map(), added: new Map(), qa }).warnings.join("\n")
  assert.match(w, /202610101200_invoices\.sql.*seed\.sql \/ purge\.sql/)
  assert.match(w, /QA checklist is out of date/)
  assert.match(w, /seed\.sql:4.*ghost\.R9\.S1/)

  status.set("supabase/test-data/purge.sql", "M")
  assert.deepEqual(qaPreflight(dir, status).migrationsWithoutSeed, [])
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify({ name: "demo", qa: { checklist: false, testData: false } }))
  assert.deepEqual(qaPreflight(dir, new Map([["supabase/migrations/x.sql", "A"]])), { outOfSync: false, unknown: [], migrationsWithoutSeed: [] }, "002/AC-10 off → nothing")
})

test("002/AC-8 002/AC-9 test-data templates: one transaction, the _env guard before any change, marked rows only", () => {
  const dir = new URL("../templates/qa/supabase-test-data/", import.meta.url)
  const sql = (f) => readFileSync(new URL(f, dir), "utf8").replace(/^--.*$/gm, "").trim()
  for (const f of ["seed.sql", "purge.sql"]) {
    const s = sql(f)
    assert.match(s, /^BEGIN;\s*\n+DO \$\$\nBEGIN\n {2}IF to_regclass\('public\._env'\) IS NULL THEN\n {4}RAISE EXCEPTION/, `${f}: BEGIN then the guard first`)
    assert.match(s, /IF NOT EXISTS \(SELECT 1 FROM public\._env WHERE name IN \('dev', 'test', 'staging'\)\) THEN\n {4}RAISE EXCEPTION/, `${f}: production / missing row refused`)
    assert.match(s, /COMMIT;$/, `${f}: ends with COMMIT`)
    assert.doesNotMatch(readFileSync(new URL(f, dir), "utf8"), /LIKE '__PREFIX__%'/, `${f}: no LIKE on the prefix`)
  }
  const env = sql("env.sql")
  assert.match(env, /CREATE TABLE IF NOT EXISTS public\._env \(\n {2}id {3}boolean PRIMARY KEY DEFAULT true CHECK \(id\),\n {2}name text NOT NULL CHECK \(name IN \('dev', 'test', 'staging', 'production'\)\)/)
  assert.doesNotMatch(env, /INSERT INTO/, "env.sql never sets a value: each environment sets its own")
})

test("002/AC-10 session context names the QA setup only when it is on", async () => {
  const { qaLine } = await import("../plugin/scripts/session-start.mjs")
  assert.equal(qaLine(undefined), null)
  assert.equal(qaLine({ checklist: false, testData: false }), null)
  assert.match(qaLine({ checklist: true, testData: false }), /^QA: checklist `work\/qa\/`/)
  assert.doesNotMatch(qaLine({ checklist: true, testData: false }), /seed/)
  assert.match(qaLine({ checklist: true, testData: true, testPrefix: "QA_", testDataDir: "db/test-data" }), /`db\/test-data\/`.*`QA_`.*@fixture/)
})

test("002/AC-10 a project set up before QA (no `qa` in agent-kit.json) has QA off until upgrade asks", async () => {
  const { qaConfig, qaPreflight } = await import("../plugin/scripts/qa.mjs")
  const dir = mkdtempSync(join(tmpdir(), "ak-qa-"))
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify({ name: "old" }))
  assert.equal(qaConfig(dir).checklist, false)
  assert.equal(qaConfig(dir).testData, false)
  assert.deepEqual(qaPreflight(dir, new Map([["supabase/migrations/x.sql", "A"]])), { outOfSync: false, unknown: [], migrationsWithoutSeed: [] })
})
