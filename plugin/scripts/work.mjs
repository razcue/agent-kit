#!/usr/bin/env node
// Work tracking: fast-track features (work/features/) and changes
// (work/changes/NNN-slug/: proposal, delta specs, plan, tasks), their status and
// next task, and traceability (scenario → test or verified check). Living specs
// (work/specs/<capability>/spec.md) are handled by specs.mjs.
//
//   node work.mjs status              active work with progress and next task
//   node work.mjs board               regenerate work/BOARD.md
//   node work.mjs trace [NNN]         scenarios (or legacy AC-n) → tests or ✅ checks
//   node work.mjs new feature|change <slug> [--title "…"]   next number + files from the templates
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { repoRoot } from "./changes.mjs"
import { PLUGIN_ROOT, findProjectDir } from "./config.mjs"
import { parseFrontmatter } from "./knowledge.mjs"
import { changeScenarios, lintProject, listChanges, livingSpecs, parseSpec, scenarioChecks, testFiles, traceScenarios } from "./specs.mjs"

export { testFiles }
export const ACTIVE = new Set(["in-progress", "draft", "approved"])

/** Checklist progress of a Markdown text: counts and the first open item. */
export function progress(text) {
  const items = [...text.matchAll(/^\s*- \[( |x|X)\] (.+)$/gm)]
  const open = items.find((m) => m[1] === " ")
  return { done: items.filter((m) => m[1] !== " ").length, total: items.length, next: open?.[2].trim() ?? null }
}

const title = (text, fallback) => text.match(/^# (.+)$/m)?.[1].trim() ?? fallback

export function collectWork(project) {
  const items = []
  const features = join(project, "work", "features")
  if (existsSync(features))
    for (const file of readdirSync(features).filter((f) => f.endsWith(".md")).sort()) {
      const text = readFileSync(join(features, file), "utf8")
      const { data } = parseFrontmatter(text)
      items.push({ kind: "feature", id: basename(file, ".md"), path: `work/features/${file}`, title: title(text, file), status: data.status || "in-progress", ...progress(text) })
    }
  for (const c of listChanges(project))
    items.push({
      kind: "change",
      id: c.id,
      path: c.path,
      title: title(c.text, c.id),
      status: c.status,
      merged: c.merged,
      ...progress(c.tasksText),
      specText: c.text,
      tasksText: c.tasksText,
      deltas: c.deltas,
    })
  return items.sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === "feature" ? -1 : 1))
}

// ── legacy acceptance criteria (`**AC-n**` + `NNN/AC-n` in tests) ──────────
export function parseACs(specText) {
  return [...new Set([...specText.matchAll(/\*\*AC-(\d+)\*\*/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)
}

/** Verified rows of the tasks.md verification table: `| AC-n | evidence | ✅ |` */
export function verifiedChecks(tasksText) {
  const ok = new Map()
  for (const m of tasksText.matchAll(/^\|\s*AC-(\d+)\s*\|\s*([^|]*?)\s*\|\s*✅\s*\|/gm)) if (m[2]) ok.set(Number(m[1]), m[2])
  return ok
}

/** @param tests [{ path, text }] */
export function trace(spec, tests) {
  const num = spec.id.match(/^\d+/)?.[0] ?? spec.id
  const checks = verifiedChecks(spec.tasksText)
  return parseACs(spec.specText).map((n) => {
    const ref = new RegExp(`\\b0*${Number(num)}\\/AC-${n}\\b`)
    const byTest = tests.filter((t) => ref.test(t.text)).map((t) => t.path)
    return { ac: `AC-${n}`, tests: byTest, check: checks.get(n) ?? null, covered: byTest.length > 0 || checks.has(n) }
  })
}

/** A change's trace rows `{ id, tests, check, covered }`: by scenario id when it has deltas, else legacy AC-n. */
export function traceChange(change, tests) {
  if (change.deltas?.length) return traceScenarios(changeScenarios(change), tests, scenarioChecks(change.tasksText))
  return trace(change, tests).map((r) => ({ ...r, id: r.ac }))
}

/**
 * Everything preflight reports about work and specs:
 * gaps — approved/done changes with uncovered scenarios (or legacy ACs);
 * unmerged — done changes whose deltas aren't in the living specs;
 * living — uncovered / total living-spec scenarios; lint — notation errors.
 */
export function workGaps(project, tests) {
  const changes = collectWork(project).filter((w) => w.kind === "change")
  const gaps = changes
    .filter((c) => c.status === "approved" || c.status === "done")
    .map((c) => ({ spec: { id: c.id, status: c.status, legacy: !c.deltas.length }, missing: traceChange(c, tests).filter((r) => !r.covered).map((r) => r.id) }))
    .filter((g) => g.missing.length)
  const unmerged = changes.filter((c) => c.status === "done" && c.deltas.length && !c.merged).map((c) => c.id)
  const checks = new Map(changes.flatMap((c) => [...scenarioChecks(c.tasksText)]))
  const scenarios = livingSpecs(project).flatMap((s) => parseSpec(s.text).requirements.flatMap((r) => r.scenarios.filter((x) => x.req)))
  const rows = traceScenarios(scenarios, tests, checks)
  const lint = lintProject(project).flatMap((r) => r.errors.map((e) => `${r.file}: ${e}`))
  return { gaps, unmerged, living: { uncovered: rows.filter((r) => !r.covered).length, total: rows.length }, lint }
}

/** Approved/done changes with uncovered items (kept for 0.12 callers). */
export function traceGaps(project, root) {
  return workGaps(project, testFiles(root)).gaps
}

/** Next free NNN among names like "004-x" / "004-x.md". */
export function nextNumber(names) {
  const max = names.reduce((n, name) => Math.max(n, Number(name.match(/^(\d+)-/)?.[1] ?? 0)), 0)
  return String(max + 1).padStart(3, "0")
}

const FEATURE_TEMPLATE = (title) => `---
status: in-progress # in-progress | done
---

# ${title}

- [ ] <task>
  - evidence: <command → result, or what you checked>
`

const ls = (dir) => (existsSync(dir) ? readdirSync(dir) : [])

/** Creates a feature file or a change folder; returns the created paths (relative). */
export function createWork(project, kind, slug, title) {
  if (kind === "spec") kind = "change"
  if (!["feature", "change"].includes(kind)) throw new Error("kind must be feature or change")
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? "")) throw new Error("slug: lower-case words joined by -, e.g. invoice-export")
  const heading = title || slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  if (kind === "feature") {
    const base = join(project, "work", "features")
    mkdirSync(base, { recursive: true })
    const id = `${nextNumber(readdirSync(base))}-${slug}`
    writeFileSync(join(base, `${id}.md`), FEATURE_TEMPLATE(heading))
    return [`work/features/${id}.md`]
  }
  const base = join(project, "work", "changes")
  const id = `${nextNumber([...ls(base), ...ls(join(project, "work", "specs"))])}-${slug}`
  mkdirSync(join(base, id), { recursive: true })
  const created = []
  for (const file of ["proposal.md", "plan.md", "tasks.md"]) {
    const text = readFileSync(join(PLUGIN_ROOT, "skills", "spec", "templates", file), "utf8").replaceAll("NNN-slug", id).replaceAll("<Title>", heading)
    writeFileSync(join(base, id, file), text)
    created.push(`work/changes/${id}/${file}`)
  }
  return created
}

/** Old layout (≤ 0.12): work/specs/NNN-slug/ → work/changes/NNN-slug/, moved untouched. */
export function migrateWorkLayout(project) {
  const from = join(project, "work", "specs")
  const moved = []
  for (const id of ls(from).filter((d) => /^\d+-/.test(d) && existsSync(join(from, d, "spec.md")))) {
    const to = join(project, "work", "changes", id)
    if (existsSync(to)) continue
    mkdirSync(join(project, "work", "changes"), { recursive: true })
    renameSync(join(from, id), to)
    moved.push(`work/specs/${id} → work/changes/${id}`)
  }
  return moved
}

export function renderBoard(items) {
  const rows = [
    "# Work board",
    "",
    "<!-- generated by `work.mjs board` — edit the work files, not this table -->",
    "",
    "| Work | Status | Progress | Next |",
    "|---|---|---|---|",
  ]
  for (const w of items) {
    const status = w.kind === "change" && w.status === "done" && w.deltas?.length && !w.merged ? "done (not merged)" : w.status
    rows.push(`| [${w.kind} ${w.id}](${w.path.replace(/^work\//, "")}) — ${w.title} | ${status} | ${w.total ? `${w.done}/${w.total}` : "—"} | ${w.next ?? "—"} |`)
  }
  if (!items.length) rows.push("| _none yet_ | | | |")
  return `${rows.join("\n")}\n`
}

export function main(argv) {
  const [cmd, id] = argv
  const project = findProjectDir() ?? process.cwd()
  if (cmd === "new") {
    const t = argv.indexOf("--title")
    const created = createWork(project, argv[1], argv[2], t !== -1 ? argv[t + 1] : "")
    for (const f of created) console.log(`created ${f}`)
    writeFileSync(join(project, "work", "BOARD.md"), renderBoard(collectWork(project)))
    return 0
  }
  if (cmd === "status") {
    const active = collectWork(project).filter((w) => ACTIVE.has(w.status))
    if (!active.length) console.log("No active work.")
    for (const w of active)
      console.log(`${w.kind} ${w.id} — ${w.status}${w.total ? `, ${w.done}/${w.total}` : ""}${w.next ? ` — next: ${w.next}` : ""}`)
    return 0
  }
  if (cmd === "board") {
    writeFileSync(join(project, "work", "BOARD.md"), renderBoard(collectWork(project)))
    console.log("wrote work/BOARD.md")
    return 0
  }
  if (cmd === "trace") {
    const root = repoRoot(project) ?? project
    const tests = testFiles(root)
    const changes = collectWork(project).filter((w) => w.kind === "change" && (!id || w.id.startsWith(id)))
    if (!changes.length) console.log(id ? `No change matching "${id}".` : "No changes.")
    let missing = 0
    for (const c of changes) {
      const rows = traceChange(c, tests)
      console.log(`## ${c.id} (${c.status}${c.merged ? `, merged ${c.merged}` : ""})`)
      if (!rows.length) console.log(c.deltas.length ? "- no scenarios in the delta specs" : "- no delta specs (specs/<capability>.md) and no **AC-n**")
      for (const r of rows) {
        const how = r.tests.length ? r.tests.join(", ") : r.check ? `check: ${r.check}` : "✗ not covered"
        console.log(`- ${r.id} — ${how}`)
        if (!r.covered) missing++
      }
    }
    return missing ? 1 : 0
  }
  console.log('usage: work.mjs status | board | trace [NNN] | new feature|change <slug> [--title "…"]')
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
