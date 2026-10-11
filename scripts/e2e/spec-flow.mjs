#!/usr/bin/env node
// @name: spec-flow
// @summary: Live check of the lanes in real Claude Code: spec — a complex request opens a change (proposal + lint-clean EARS / Given-When-Then / ZOMBIES deltas); feature — a small behaviour tweak also updates its living spec.
// @usage: node scripts/e2e/spec-flow.mjs [--lane spec|feature|both] [--model haiku] [--keep]
// @tags: [e2e, specs, release]
// @test: spec-flow.test.mjs
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { changeScenarios, listChanges, lintProject } from "../../plugin/scripts/specs.mjs"

const KIT = fileURLToPath(new URL("../../", import.meta.url))
export const PROMPT =
  "Plan a new invoices module for apps/app: invoices with lines, totals rounded to 3 decimals, only users of the invoice's provincia may see it, a database table and RPCs. Open the change with its proposal and delta specs, then stop and wait for my approval."

export const FEATURE_PROMPT = 'Small tweak: on the app\'s home page, rename the "Sign out" button to "Log out".'
export const HOME_SPEC = `---
capability: home
---

# Home

## Purpose
What a signed-in user sees first.

## Requirements

### home.R1 — Sign out
When a signed-in user opens the home page, the app shall show a "Sign out" button that ends the session.

#### home.R1.S1 — Button visible @simple
- Given a signed-in user
- When they open the home page
- Then they see a "Sign out" button

#### home.R1.S2 — Signed-out visitor @exception
- Given a visitor without a session
- When they open the home page
- Then they are sent to the login page
`

/** Failed expectations after the feature run: the living spec follows the renamed button. */
export function evaluateFeature(project) {
  const text = readFileSync(join(project, "work/specs/home/spec.md"), "utf8")
  const f = []
  if (!/Log out/.test(text)) f.push("work/specs/home/spec.md still describes the old button (no \"Log out\")")
  if (/"Sign out"/.test(text)) f.push("work/specs/home/spec.md still mentions \"Sign out\"")
  f.push(...lintProject(project).flatMap((r) => r.errors.map((e) => `${r.file}: ${e}`)))
  return f
}

/** Pure-ish: failed expectations for a project after the run (empty = pass). */
export function evaluate(project) {
  const f = []
  const changes = listChanges(project).filter((c) => !c.legacyDir)
  if (!changes.length) return ["no change folder in work/changes/"]
  const c = changes[changes.length - 1]
  if (c.file !== "proposal.md") f.push(`${c.path}: no proposal.md`)
  if (!c.deltas.length) f.push(`${c.path}: no delta specs in specs/<capability>.md`)
  const errors = lintProject(project).flatMap((r) => r.errors.map((e) => `${r.file}: ${e}`))
  f.push(...errors)
  const scenarios = changeScenarios(c)
  if (c.deltas.length && !scenarios.length) f.push(`${c.path}: delta specs have no scenarios`)
  if (scenarios.length && !scenarios.some((s) => s.tag === "exception" || s.tag === "boundary")) f.push(`${c.path}: no @exception / @boundary scenario`)
  return f
}

function run(lane, model, keep) {
  const dir = mkdtempSync(join(tmpdir(), `agent-kit-${lane}-flow-`))
  spawnSync("node", [join(KIT, "cli/index.mjs"), "init", dir, "--yes", "--name", "specflow", "--apps", "web,app", "--git", "read-only"], { encoding: "utf8" })
  if (lane === "feature") {
    mkdirSync(join(dir, "work/specs/home"), { recursive: true })
    writeFileSync(join(dir, "work/specs/home/spec.md"), HOME_SPEC)
  }
  const r = spawnSync(
    "claude",
    ["-p", lane === "feature" ? FEATURE_PROMPT : PROMPT, "--plugin-dir", join(KIT, "plugin"), "--model", model, "--output-format", "json", "--max-turns", "30",
      "--allowedTools", "Skill", "Read", "Glob", "Grep", "Write", "Edit", "Bash(node:*)", "Bash(ls:*)", "Bash(cat:*)"],
    { cwd: dir, input: "", encoding: "utf8", timeout: 600_000, env: { ...process.env, AGENT_KIT_HOME: KIT } },
  )
  if (r.status !== 0) console.log(`claude exited ${r.status}: ${(r.stderr || "").slice(0, 400)}`)
  const failed = lane === "feature" ? evaluateFeature(dir) : evaluate(dir)
  const ok = lane === "feature" ? "fast-track tweak kept the living spec true and lint-clean" : "change opened with lint-clean EARS + Given/When/Then + ZOMBIES deltas"
  console.log(failed.length ? failed.map((x) => `✗ ${lane}: ${x}`).join("\n") : `✓ ${lane}: ${ok} (${model})`)
  if (keep) console.log(`kept: ${dir}`)
  else rmSync(dir, { recursive: true, force: true })
  return failed.length
}

function main(argv) {
  const model = argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : "haiku"
  const lane = argv.includes("--lane") ? argv[argv.indexOf("--lane") + 1] : "both"
  const lanes = lane === "both" ? ["spec", "feature"] : [lane]
  const failed = lanes.reduce((n, l) => n + run(l, model, argv.includes("--keep")), 0)
  return failed ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
