import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { parseACs, progress, renderBoard, trace, verifiedChecks } from "../plugin/scripts/work.mjs"
import { strayReason } from "../plugin/scripts/script-nudge.mjs"
import { importsOf } from "../plugin/scripts/context.mjs"
import { orphans, runStats } from "../plugin/scripts/usage.mjs"
import { resumeSection } from "../plugin/scripts/session-start.mjs"
import { related } from "../plugin/scripts/knowledge.mjs"
import { analyze } from "../plugin/scripts/preflight.mjs"

test("work: checklist progress and next open task", () => {
  assert.deepEqual(progress("- [x] a\n- [ ] b\n  - [ ] c"), { done: 1, total: 3, next: "b" })
  assert.deepEqual(progress("no tasks"), { done: 0, total: 0, next: null })
})

test("work: AC ids, verified checks and trace by NNN/AC-n", () => {
  const specText = "## Acceptance criteria\n- **AC-1** Given…\n- **AC-2** Given…\n- **AC-3** Given…\n- **AC-2** dup"
  assert.deepEqual(parseACs(specText), [1, 2, 3])
  const tasksText = "| AC | Evidence | Result |\n| AC-2 | manual: opened /x | ✅ |\n| AC-3 |  | ✅ |\n| AC-1 | pending | ❌ |"
  assert.deepEqual([...verifiedChecks(tasksText)], [[2, "manual: opened /x"]])
  const rows = trace({ id: "004-codes", specText, tasksText }, [
    { path: "a.test.ts", text: 'it("004/AC-1 rejects duplicates")' },
    { path: "b.test.ts", text: 'it("014/AC-3 other spec")' },
  ])
  assert.deepEqual(rows.map((r) => [r.ac, r.covered]), [["AC-1", true], ["AC-2", true], ["AC-3", false]])
  assert.deepEqual(rows[0].tests, ["a.test.ts"])
})

test("work: board renders every item", () => {
  const board = renderBoard([{ kind: "spec", id: "001-x", path: "work/specs/001-x", title: "X", status: "approved", done: 1, total: 4, next: "T2" }])
  assert.match(board, /\| \[spec 001-x\]\(specs\/001-x\) — X \| approved \| 1\/4 \| T2 \|/)
})

test("script-nudge: stray scripts only", () => {
  const P = "/p"
  assert.equal(strayReason("/tmp/check.mjs", P), "outside the project")
  assert.equal(strayReason("/p/check.py", P), "at the project root")
  assert.equal(strayReason("/p/tools/tmp/x.sh", P), "in a temporary folder")
  for (const ok of ["/p/scripts/db/x.mjs", "/p/.agent-kit/scratch/x.mjs", "/p/packages/shared/src/x.ts", "/p/vitest.config.ts", "/p/x.test.mjs", "/tmp/notes.md", "/lib/a.mjs"])
    assert.equal(strayReason(ok, P, "/lib"), null, ok)
})

test("context: @imports, not emails or code", () => {
  assert.deepEqual(importsOf("@AGENTS.md\nsee @docs/rules.md and @~/x/y.md\nmail me@x.com\n`@not/this.md`"), ["AGENTS.md", "docs/rules.md", "~/x/y.md"])
})

test("usage: run stats by label and knowledge orphans", () => {
  const s = runStats([
    { name: "seed-2026-10-07T10-00-00-000Z.log", text: "$ x\n# exit 0 · 5ms\n", mtime: 1 },
    { name: "seed-2026-10-08T10-00-00-000Z.log", text: "$ x\n# exit 1 · 5ms\n", mtime: 2 },
    { name: "test-seed-2026-10-08T10-00-00-000Z.log", text: "# exit 0", mtime: 3 },
  ])
  assert.deepEqual(s.get("seed"), { runs: 2, failures: 1, last: 2 })
  assert.equal(s.get("test-seed").runs, 1)
  const entries = [
    { name: "a", body: "see [[b]]", path: "a" },
    { name: "b", body: "", path: "b" },
    { name: "c", body: "", path: "c" },
  ]
  const now = 1000 * 86_400_000
  const old = new Map(entries.map((e) => [e.path, 0]))
  assert.deepEqual(orphans(entries, old, now, 180).map((e) => e.name), ["a", "c"])
  assert.deepEqual(orphans(entries, new Map(entries.map((e) => [e.path, now])), now, 180), [])
})

test("session-start: resume section from checkpoint and active work", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-"))
  assert.deepEqual(resumeSection(dir), [])
  mkdirSync(join(dir, ".agent-kit"))
  mkdirSync(join(dir, "work", "features"), { recursive: true })
  writeFileSync(join(dir, ".agent-kit", "checkpoint.json"), JSON.stringify({ at: new Date(0).toISOString(), branch: "feat/x", head: "abc", changedCount: 2, changed: ["a.ts", "b.ts"] }))
  writeFileSync(join(dir, "work", "features", "001-x.md"), "---\nstatus: in-progress\n---\n# X\n- [x] one\n- [ ] two\n")
  writeFileSync(join(dir, "work", "features", "002-y.md"), "---\nstatus: done\n---\n# Y\n")
  const lines = resumeSection(dir, 3 * 3600_000).join("\n")
  assert.match(lines, /3 h ago on `feat\/x` \(abc\), 2 uncommitted file\(s\): a\.ts, b\.ts/)
  assert.match(lines, /feature `work\/features\/001-x\.md` — in-progress, 1\/2 tasks; next: two/)
  assert.doesNotMatch(lines, /002-y/)
})

test("knowledge: related gives links and backlinks", () => {
  const e = (name, body) => ({ name, body, summary: name, origin: "project", scope: "x", path: name })
  const r = related("b", [e("a", "uses [[b]]"), e("b", "see [[c]] and [[ghost]]"), e("c", "")])
  assert.deepEqual(r.links.map((l) => l.name), ["c", "ghost"])
  assert.equal(r.links[1].missing, true)
  assert.deepEqual(r.backlinks.map((l) => l.name), ["a"])
})

test("preflight: uncovered ACs block done specs, warn approved ones", () => {
  const gaps = [
    { spec: { id: "001-a", status: "done" }, missing: ["AC-2"] },
    { spec: { id: "002-b", status: "approved" }, missing: ["AC-1"] },
  ]
  const r = analyze({ status: new Map(), added: new Map(), gaps })
  assert.equal(r.violations.length, 1)
  assert.match(r.violations[0], /001-a.*AC-2.*001\/AC-n/)
  assert.equal(r.warnings.length, 1)
})

test("work new: numbering and files from the templates", async () => {
  const { createWork, nextNumber } = await import("../plugin/scripts/work.mjs")
  assert.equal(nextNumber([]), "001")
  assert.equal(nextNumber(["001-a.md", "009-b", "README.md"]), "010")
  const dir = mkdtempSync(join(tmpdir(), "ak-work-"))
  assert.deepEqual(createWork(dir, "spec", "invoice-export", "Invoice export"), [
    "work/specs/001-invoice-export/spec.md",
    "work/specs/001-invoice-export/plan.md",
    "work/specs/001-invoice-export/tasks.md",
  ])
  assert.deepEqual(createWork(dir, "feature", "fix-footer"), ["work/features/001-fix-footer.md"])
  assert.deepEqual(createWork(dir, "spec", "second"), ["work/specs/002-second/spec.md", "work/specs/002-second/plan.md", "work/specs/002-second/tasks.md"])
  assert.throws(() => createWork(dir, "spec", "Bad Slug"), /slug/)
  assert.throws(() => createWork(dir, "epic", "x"), /feature or spec/)
})

test("session-start: drift notice only when the plugin is newer", async () => {
  const { driftNotice } = await import("../plugin/scripts/session-start.mjs")
  assert.match(driftNotice("0.5.0", "0.7.0"), /0\.7\.0 is newer than this project's setup \(0\.5\.0\).*upgrade/)
  assert.equal(driftNotice("0.7.0", "0.7.0"), null)
  assert.equal(driftNotice("0.8.0", "0.7.0"), null)
  assert.equal(driftNotice(undefined, "0.7.0"), null)
})

test("knowledge: index log lines (OKF log.md)", async () => {
  const { logLines, parseIndex } = await import("../plugin/scripts/knowledge.mjs")
  const before = parseIndex("# Knowledge index\n\n## ux (2)\n\n- [[a]] — A _(rule)_\n- [[b]] — B\n\n## meta (0)\n\n_(empty)_\n")
  assert.deepEqual([...before], [["ux/a", "A"], ["ux/b", "B"]])
  assert.deepEqual(logLines(before, new Map([["ux/a", "A2"], ["meta/c", "C"]])), ["- changed ux/a — A2", "- added meta/c — C", "- removed ux/b"])
  assert.deepEqual(logLines(before, before), [])
})

test("session-start: context stays under Claude Code's 10k hook limit", async () => {
  const { renderContext, CONTEXT_LIMIT } = await import("../plugin/scripts/session-start.mjs")
  const entries = (n, len = 120) => Array.from({ length: n }, (_, i) => ({ name: `e${i}`, summary: "s".repeat(len) }))
  const head = ["# agent-kit · x", "profile"]
  const scriptsHead = ["## Scripts"]
  const small = renderContext({ head, groups: [{ key: "project/ux", origin: "project", items: entries(3) }], scriptsHead, scripts: [] })
  assert.match(small, /### project\/ux\n- e0/)
  assert.match(small, /_\(no scripts yet\)_/)

  const big = renderContext({
    head,
    groups: [
      { key: "project/business", origin: "project", items: entries(30) },
      { key: "global/stack", origin: "global", items: entries(80) },
      { key: "global/ux", origin: "global", items: entries(10) },
    ],
    scriptsHead,
    scripts: Array.from({ length: 40 }, (_, i) => ({ origin: "project", name: `s${i}`, summary: "x".repeat(100) })),
  })
  assert.ok(big.length <= CONTEXT_LIMIT, `${big.length} chars`)
  assert.match(big, /### global\/stack — 80 entries \(use find\)/)
  assert.match(big, /### project\/business\n- e0/, "project knowledge is kept longest")

  const huge = renderContext({ head, groups: [{ key: "project/x", origin: "project", items: entries(500, 300) }], scriptsHead, scripts: [] })
  assert.ok(huge.length <= CONTEXT_LIMIT)
  assert.match(huge, /### project\/x — 500 entries/)
  assert.ok(!/s{161}/.test(renderContext({ head, groups: [{ key: "project/y", origin: "project", items: entries(1, 400) }], scriptsHead, scripts: [] })), "summaries are clipped")
})
