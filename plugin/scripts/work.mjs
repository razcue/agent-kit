#!/usr/bin/env node
// Work tracking: features and specs in work/, their status and next task, and
// acceptance-criteria traceability (spec AC → test or verified check).
//
//   node work.mjs status              active work with progress and next task
//   node work.mjs board               regenerate work/BOARD.md
//   node work.mjs trace [spec-id]     AC → tests (`NNN/AC-n` in the test) or ✅ checks
//   node work.mjs new feature|spec <slug> [--title "…"]   next number + files from the templates
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { repoFiles, repoRoot } from "./changes.mjs"
import { PLUGIN_ROOT, findProjectDir } from "./config.mjs"
import { parseFrontmatter } from "./knowledge.mjs"
import { isTest } from "./tdd.mjs"

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
  const specs = join(project, "work", "specs")
  if (existsSync(specs))
    for (const dir of readdirSync(specs).sort()) {
      const specPath = join(specs, dir, "spec.md")
      if (!existsSync(specPath)) continue
      const text = readFileSync(specPath, "utf8")
      const tasksPath = join(specs, dir, "tasks.md")
      const tasks = existsSync(tasksPath) ? readFileSync(tasksPath, "utf8") : ""
      const { data } = parseFrontmatter(text)
      items.push({ kind: "spec", id: dir, path: `work/specs/${dir}`, title: title(text, dir), status: data.status || "draft", ...progress(tasks), specText: text, tasksText: tasks })
    }
  return items
}

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

export function testFiles(root) {
  return repoFiles(root)
    .filter(isTest)
    .filter((f) => existsSync(join(root, f)) && statSync(join(root, f)).size < 1024 * 1024)
    .map((f) => ({ path: f, text: readFileSync(join(root, f), "utf8") }))
}

/** Specs that are approved or done, with their uncovered ACs. */
export function traceGaps(project, root) {
  const tests = testFiles(root)
  return collectWork(project)
    .filter((w) => w.kind === "spec" && (w.status === "approved" || w.status === "done"))
    .map((spec) => ({ spec, missing: trace(spec, tests).filter((r) => !r.covered).map((r) => r.ac) }))
    .filter((g) => g.missing.length)
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

/** Creates a feature file or a spec folder; returns the created paths (relative). */
export function createWork(project, kind, slug, title) {
  if (!["feature", "spec"].includes(kind)) throw new Error("kind must be feature or spec")
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? "")) throw new Error("slug: lower-case words joined by -, e.g. invoice-export")
  const base = join(project, "work", kind === "spec" ? "specs" : "features")
  mkdirSync(base, { recursive: true })
  const id = `${nextNumber(readdirSync(base))}-${slug}`
  const heading = title || slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  if (kind === "feature") {
    writeFileSync(join(base, `${id}.md`), FEATURE_TEMPLATE(heading))
    return [`work/features/${id}.md`]
  }
  mkdirSync(join(base, id))
  const created = []
  for (const file of ["spec.md", "plan.md", "tasks.md"]) {
    const text = readFileSync(join(PLUGIN_ROOT, "skills", "spec", "templates", file), "utf8")
      .replaceAll("NNN-slug", id)
      .replaceAll("<Title>", heading)
      .replaceAll("NNN/", `${id.slice(0, 3)}/`)
    writeFileSync(join(base, id, file), text)
    created.push(`work/specs/${id}/${file}`)
  }
  return created
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
  for (const w of items)
    rows.push(`| [${w.kind === "spec" ? "spec" : "feature"} ${w.id}](${w.path.replace(/^work\//, "")}) — ${w.title} | ${w.status} | ${w.total ? `${w.done}/${w.total}` : "—"} | ${w.next ?? "—"} |`)
  if (!items.length) rows.push("| _none yet_ | | | |")
  return `${rows.join("\n")}\n`
}

export function main(argv) {
  const [cmd, id] = argv
  if (cmd === "new") {
    const project = findProjectDir() ?? process.cwd()
    const t = argv.indexOf("--title")
    const created = createWork(project, argv[1], argv[2], t !== -1 ? argv[t + 1] : "")
    for (const f of created) console.log(`created ${f}`)
    writeFileSync(join(project, "work", "BOARD.md"), renderBoard(collectWork(project)))
    return 0
  }
  const project = findProjectDir() ?? process.cwd()
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
    const specs = collectWork(project).filter((w) => w.kind === "spec" && (!id || w.id.startsWith(id)))
    if (!specs.length) console.log(id ? `No spec matching "${id}".` : "No specs.")
    let missing = 0
    for (const spec of specs) {
      const rows = trace(spec, tests)
      console.log(`## ${spec.id} (${spec.status})`)
      if (!rows.length) console.log("- no **AC-n** found in spec.md")
      for (const r of rows) {
        const how = r.tests.length ? r.tests.join(", ") : r.check ? `check: ${r.check}` : "✗ not covered"
        console.log(`- ${r.ac} — ${how}`)
        if (!r.covered) missing++
      }
    }
    return missing ? 1 : 0
  }
  console.log('usage: work.mjs status | board | trace [spec-id] | new feature|spec <slug> [--title "…"]')
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
