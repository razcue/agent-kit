import assert from "node:assert/strict"
import { test } from "node:test"
import { parseHeader, renderIndex } from "../plugin/scripts/scripts.mjs"
import { summarize } from "../plugin/scripts/run.mjs"
import { isLogic, matches, tddStatus, testsFor } from "../plugin/scripts/tdd.mjs"
import { analyze } from "../plugin/scripts/preflight.mjs"
import { QUESTIONS, agentsBlock } from "../cli/lib/init.mjs"

test("scripts: header parsed from any comment style, first value wins", () => {
  assert.deepEqual(parseHeader("#!/usr/bin/env node\n// @summary: Counts rows\n// @usage: node x.mjs\n// @tags: [db, seed]"), {
    summary: "Counts rows",
    usage: "node x.mjs",
    tags: ["db", "seed"],
  })
  assert.equal(parseHeader("#!/bin/bash\n# @summary: sh one\n# @summary: ignored").summary, "sh one")
  assert.equal(parseHeader("-- @usage: apply in SQL editor").usage, "apply in SQL editor")
  assert.equal(parseHeader("/**\n * @summary: block comment\n */").summary, "block comment")
  assert.deepEqual(parseHeader("const a = 1 // @summary: too late".padStart(5000, "\n")), {})
})

test("scripts: index lists only project scripts and flags undocumented ones", () => {
  const index = renderIndex([
    { origin: "project", name: "a", rel: "scripts/db/a.mjs", summary: "A", usage: "node a", test: "/t" },
    { origin: "project", name: "b", rel: "scripts/b.sh", summary: "", usage: "", test: null },
    { origin: "scratch", name: "c", rel: ".agent-kit/scratch/c.mjs", summary: "C", usage: "", test: null },
  ])
  assert.match(index, /\[`a`\]\(db\/a\.mjs\) \| A \| `node a` \| ✅/)
  assert.match(index, /`b`.*⚠️ undocumented/)
  assert.doesNotMatch(index, /`c`/)
})

test("run: short output is untouched, long output keeps failures and tail", () => {
  assert.deepEqual(summarize("a\nb\n\n").lines, ["a", "b"])
  const long = Array.from({ length: 500 }, (_, i) => (i === 42 ? "AssertionError: expected 1" : `line ${i}`)).join("\n")
  const s = summarize(long, 30)
  assert.equal(s.truncated, true)
  assert.ok(s.lines.length <= 30)
  assert.ok(s.lines.some((l) => l.startsWith("43: AssertionError")))
  assert.equal(s.lines.at(-1), "line 499")
})

test("tdd: logic detection skips tests, configs, dot folders, migrations and ignored paths", () => {
  assert.equal(isLogic("packages/shared/src/money.ts"), true)
  assert.equal(isLogic("scripts/db/seed.mjs"), true)
  for (const f of ["packages/shared/src/money.test.ts", "apps/app/nuxt.config.ts", "x.d.ts", ".agent-kit/scratch/a.mjs", "supabase/migrations/1.sql", "apps/app/app/pages/a.vue"])
    assert.equal(isLogic(f), false, f)
  assert.equal(isLogic("apps/app/server/api/things/index.get.ts", ["apps/*/server/api/"]), false)
  assert.equal(matches("apps/app/server/api/x.ts", "apps/*/server/api/"), true)
  assert.equal(matches("apps/a/b/server/api/x.ts", "apps/*/server/api/"), false)
  assert.equal(matches("apps/a/b/x.ts", "apps/**/x.ts"), true)
})

test("tdd: finds tests by name and reports untested / not-updated logic", () => {
  const files = ["src/money.ts", "src/money.test.ts", "src/tax.ts", "lib/__tests__/fmt.spec.ts", "lib/fmt.ts", "test/parse.test.mjs"]
  assert.deepEqual(testsFor("src/money.ts", files), ["src/money.test.ts"])
  assert.deepEqual(testsFor("lib/fmt.ts", files), ["lib/__tests__/fmt.spec.ts"])
  assert.deepEqual(testsFor("lib/parse.mjs", files), ["test/parse.test.mjs"])
  const status = new Map([["src/money.ts", "M"], ["src/tax.ts", "A"], ["lib/fmt.ts", "M"], ["lib/__tests__/fmt.spec.ts", "M"], ["old.ts", "D"]])
  const s = tddStatus({ status, files })
  assert.deepEqual(s.untested.map((r) => r.file), ["src/tax.ts"])
  assert.deepEqual(s.notUpdated.map((r) => r.file), ["src/money.ts"])
  assert.deepEqual(s.changedTests, ["lib/__tests__/fmt.spec.ts"])
})

test("preflight: untested logic and undocumented scripts are violations", () => {
  const r = analyze({ status: new Map(), added: new Map(), untested: ["src/tax.ts"], undocumentedScripts: ["scripts/x.mjs"] })
  assert.equal(r.violations.length, 2)
  assert.match(r.violations[0], /without a test/)
  assert.match(r.violations[1], /@summary\/@usage/)
})

test("init: method question and AGENTS block", () => {
  assert.deepEqual(QUESTIONS.methodology.map((o) => o.value), ["sdd-tdd", "sdd"])
  const cfg = { technicalLevel: "technical", language: "en", methodology: "sdd-tdd", gitFlow: "pr" }
  assert.match(agentsBlock(cfg), /method `sdd-tdd` \(tests first: `tdd` skill\)/)
  assert.doesNotMatch(agentsBlock({ ...cfg, methodology: "sdd" }), /tests first/)
  assert.match(agentsBlock(cfg), /`scripts` skill/)
})
