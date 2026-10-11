#!/usr/bin/env node
// Living specs (work/specs/<capability>/spec.md) and the delta specs of changes
// (work/changes/NNN-slug/specs/<capability>.md). Notation: EARS requirements
// (`### cap.R1 — name`), Given/When/Then scenarios tagged with one ZOMBIES
// category (`#### cap.R1.S1 — name @boundary`). IDs are never reused.
//
//   node specs.mjs lint [cap|NNN]          notation + id checks (exit 1 on errors)
//   node specs.mjs next <cap|cap.Rn>       next free requirement / scenario id
//   node specs.mjs merge <NNN>             apply a change's deltas to the living specs
//   node specs.mjs trace [NNN|cap]         scenario → tests (id in the test name) or ✅ rows
//   node specs.mjs list                    capabilities with requirement and scenario counts
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { repoFiles, repoRoot } from "./changes.mjs"
import { findProjectDir } from "./config.mjs"
import { parseFrontmatter } from "./knowledge.mjs"
import { isTest } from "./tdd.mjs"

export const ZOMBIES = ["zero", "one", "many", "boundary", "interface", "exception", "simple"]
export const CAP = /^[a-z][a-z0-9-]*$/
const REQ_HEAD = /^### ([a-z][a-z0-9-]*)\.R(\d+)\s*(?:—|–|-|:)\s*(.*?)\s*$/
const SCN_HEAD = /^#### ([a-z][a-z0-9-]*)\.R(\d+)\.S(\d+)\s*(?:—|–|-|:)\s*(.*?)\s*$/
const STEP = /^\s*(?:[-*]\s+)?(Given|When|Then|And|But)\b/
const EARS_HELP =
  "use EARS — `The <system> shall …` · `When <trigger>, the <system> shall …` · `While <state>, …` · `If <condition>, then the <system> shall …` · `Where <feature>, …`"
const CLAUSE = { when: "event", while: "state", if: "unwanted", where: "optional" }

/** EARS pattern of a requirement sentence, or null when it matches none. */
export function earsPattern(sentence) {
  const s = sentence.trim().replace(/\s+/g, " ")
  const m = s.match(/^((?:(?:Where|While|When|If)\b[^,]+,\s*)*)(then\s+)?((?:the\s+)?\S.*?\bshall\b\s+\S.*)$/i)
  if (!m) return null
  const clauses = [...m[1].matchAll(/(Where|While|When|If)\b/gi)].map((c) => c[1].toLowerCase())
  const hasIf = clauses.includes("if")
  if (hasIf !== Boolean(m[2])) return null
  if (!clauses.length) return /^the\s/i.test(m[3]) ? "ubiquitous" : null
  return clauses.length === 1 ? CLAUSE[clauses[0]] : "complex"
}

/** Requirement blocks of a list of lines: { pre, reqs, post, stray }. */
function splitBlocks(lines) {
  const pre = []
  const reqs = []
  const post = []
  const stray = []
  let cur = null
  let inPost = false
  for (const line of lines) {
    if (inPost) {
      post.push(line)
      continue
    }
    if (line.startsWith("### ")) {
      cur = { head: line, lines: [] }
      reqs.push(cur)
      if (!REQ_HEAD.test(line)) stray.push(line)
      continue
    }
    if (/^## /.test(line) && reqs.length) {
      inPost = true
      post.push(line)
      continue
    }
    if (cur) cur.lines.push(line)
    else pre.push(line)
  }
  return { pre, reqs: reqs.map(parseRequirement), post, stray }
}

function parseRequirement({ head, lines }) {
  const m = head.match(REQ_HEAD)
  const req = { id: m ? `${m[1]}.R${m[2]}` : head.slice(4).trim(), cap: m?.[1], n: m ? Number(m[2]) : 0, name: m?.[3] ?? "", sentence: "", scenarios: [], stray: [] }
  const intro = []
  let sc = null
  for (const line of lines) {
    if (line.startsWith("#### ")) {
      const s = line.match(SCN_HEAD)
      const name = s?.[4] ?? line.slice(5).trim()
      const tag = name.match(/\s@(\w+)\s*$/)?.[1] ?? null
      sc = { id: s ? `${s[1]}.R${s[2]}.S${s[3]}` : name, req: s ? `${s[1]}.R${s[2]}` : null, n: s ? Number(s[3]) : 0, name: name.replace(/\s@\w+\s*$/, ""), tag, steps: [], lines: [line] }
      if (!s) req.stray.push(line)
      req.scenarios.push(sc)
      continue
    }
    if (sc) {
      sc.lines.push(line)
      const k = line.match(STEP)
      if (k) sc.steps.push(k[1])
    } else intro.push(line)
  }
  req.sentence = intro.join("\n").trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim() ?? ""
  req.text = [head, ...lines].join("\n").trimEnd()
  for (const s of req.scenarios) s.text = s.lines.join("\n").trimEnd()
  return req
}

/** A living spec: { data, raw frontmatter, header, requirements, footer, retired }. */
export function parseSpec(text) {
  const { data, body } = parseFrontmatter(text)
  const raw = text.startsWith("---\n") ? text.slice(4, text.indexOf("\n---", 4)) : ""
  const { pre, reqs, post, stray } = splitBlocks(body.split("\n"))
  const retired = Array.isArray(data.retired) ? data.retired : data.retired ? [data.retired] : []
  return { data, raw, header: pre.join("\n").trim(), requirements: reqs, footer: post.join("\n").trim(), retired, stray }
}

/** A delta spec: { purpose, added, modified, removed } (each a list of requirements). */
export function parseDelta(text) {
  const sections = { added: [], modified: [], removed: [] }
  let purpose = ""
  let key = null
  const buf = { added: [], modified: [], removed: [], purpose: [] }
  for (const line of text.split("\n")) {
    const h = line.match(/^## (ADDED|MODIFIED|REMOVED) Requirements\s*$/i)
    if (h) {
      key = h[1].toLowerCase()
      continue
    }
    if (/^## Purpose\s*$/i.test(line)) {
      key = "purpose"
      continue
    }
    if (/^## /.test(line)) {
      key = null
      continue
    }
    if (key) buf[key].push(line)
  }
  for (const k of ["added", "modified", "removed"]) sections[k] = splitBlocks(buf[k]).reqs
  purpose = buf.purpose.join("\n").trim()
  return { purpose, ...sections }
}

/** Notation errors of one requirement block (shared by living specs and deltas). */
function lintRequirement(req, cap, errors, warnings) {
  if (!req.cap) return errors.push(`"### ${req.id}": heading is not a requirement id (\`### ${cap}.R1 — name\`)`)
  if (req.cap !== cap) errors.push(`${req.id}: id outside capability "${cap}"`)
  if (!earsPattern(req.sentence)) errors.push(`${req.id}: requirement is not EARS — ${EARS_HELP}`)
  for (const line of req.stray) errors.push(`"${line}": heading is not a scenario id (\`#### ${req.id}.S1 — name @simple\`)`)
  const valid = req.scenarios.filter((s) => s.req)
  if (!valid.length) errors.push(`${req.id}: no scenario — add Given / When / Then scenarios`)
  const seen = new Set()
  for (const s of valid) {
    if (seen.has(s.id)) errors.push(`${s.id}: duplicate id`)
    seen.add(s.id)
    if (s.req !== req.id) errors.push(`${s.id}: scenario id must be under ${req.id}`)
    if (!s.tag || !ZOMBIES.includes(s.tag)) errors.push(`${s.id}: needs one ZOMBIES tag (${ZOMBIES.map((z) => `@${z}`).join(" ")})`)
    const g = s.steps.indexOf("Given")
    const w = s.steps.indexOf("When")
    const t = s.steps.indexOf("Then")
    if (g === -1 || w === -1 || t === -1 || !(g < w && w < t)) errors.push(`${s.id}: needs Given / When / Then steps in that order`)
  }
  if (valid.length && !valid.some((s) => s.tag === "exception" || s.tag === "boundary"))
    warnings.push(`${req.id}: only happy-path scenarios — consider @exception or @boundary (ZOMBIES)`)
}

/** Lint a living spec of capability `cap`: { errors, warnings }. */
export function lintSpec(text, cap) {
  const errors = []
  const warnings = []
  const spec = parseSpec(text)
  if (spec.data.capability && spec.data.capability !== cap) errors.push(`frontmatter capability "${spec.data.capability}" ≠ folder "${cap}"`)
  const ids = new Set()
  for (const req of spec.requirements) {
    if (req.cap && ids.has(req.id)) errors.push(`${req.id}: duplicate id`)
    ids.add(req.id)
    if (spec.retired.includes(req.id)) errors.push(`${req.id}: id is retired — use \`specs.mjs next ${cap}\``)
    lintRequirement(req, cap, errors, warnings)
  }
  return { errors, warnings }
}

/** Conflicts of a delta against the living spec (null = capability doesn't exist yet). */
function targetConflicts(delta, living) {
  const have = new Map((living?.requirements ?? []).map((r) => [r.id, r]))
  const retired = new Set(living?.retired ?? [])
  const out = []
  for (const r of delta.added) {
    if (have.has(r.id)) out.push(`${r.id}: ADDED but the id is taken — use \`specs.mjs next ${r.cap}\``)
    else if (retired.has(r.id)) out.push(`${r.id}: ADDED but the id is retired — use \`specs.mjs next ${r.cap}\``)
  }
  for (const r of delta.modified) if (!have.has(r.id)) out.push(`${r.id}: MODIFIED but not in the living spec`)
  for (const r of delta.removed) if (!have.has(r.id)) out.push(`${r.id}: REMOVED but not in the living spec`)
  return out
}

/** Lint a delta: notation of ADDED/MODIFIED blocks + targets against the living spec. */
export function lintDelta(deltaText, livingText, cap) {
  const errors = []
  const warnings = []
  const delta = parseDelta(deltaText)
  for (const req of [...delta.added, ...delta.modified]) lintRequirement(req, cap, errors, warnings)
  for (const req of delta.removed) if (!req.cap) errors.push(`"### ${req.id}": heading is not a requirement id`)
  if (!delta.added.length && !delta.modified.length && !delta.removed.length) errors.push(`${cap}: delta has no ADDED / MODIFIED / REMOVED requirements`)
  errors.push(...targetConflicts(delta, livingText ? parseSpec(livingText) : null))
  return { errors, warnings }
}

const titleOf = (cap) => cap.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())

/** Apply a delta to a living spec (null = new capability): { text, conflicts }. Pure. */
export function mergeDelta(livingText, deltaText, cap) {
  const living = livingText ? parseSpec(livingText) : null
  const delta = parseDelta(deltaText)
  const conflicts = targetConflicts(delta, living)
  if (conflicts.length) return { text: null, conflicts }
  const retired = new Set(living?.retired ?? [])
  const removed = new Set(delta.removed.map((r) => r.id))
  const modified = new Map(delta.modified.map((r) => [r.id, r]))
  const blocks = []
  for (const r of living?.requirements ?? []) {
    if (removed.has(r.id)) {
      retired.add(r.id)
      continue
    }
    const next = modified.get(r.id)
    if (next) {
      const keep = new Set(next.scenarios.map((s) => s.id))
      for (const s of r.scenarios) if (!keep.has(s.id)) retired.add(s.id)
    }
    blocks.push((next ?? r).text)
  }
  for (const r of [...delta.added].sort((a, b) => a.n - b.n)) blocks.push(r.text)
  const fmLines = (living?.raw ?? `capability: ${cap}`).split("\n").filter((l) => !/^retired:/.test(l))
  if (retired.size) fmLines.push(`retired: [${[...retired].sort().join(", ")}]`)
  let header = living?.header ?? `# ${titleOf(cap)}\n\n## Purpose\n${delta.purpose || "<What this capability is for, in 1-3 lines.>"}\n\n## Requirements`
  if (!/^## Requirements\s*$/m.test(header)) header = `${header}\n\n## Requirements`
  const footer = living?.footer ? `\n\n${living.footer}` : ""
  return { text: `---\n${fmLines.join("\n")}\n---\n\n${header.trim()}\n\n${blocks.join("\n\n")}${footer}\n`, conflicts: [] }
}

/** Next free id: `cap` → `cap.Rn`; `cap.Rn` → `cap.Rn.Sm`. Counts living, retired and pending-delta ids. */
export function nextId(target, livingTexts, deltaTexts) {
  const reqs = []
  const retired = []
  for (const t of livingTexts) {
    const s = parseSpec(t)
    reqs.push(...s.requirements)
    retired.push(...s.retired)
  }
  for (const t of deltaTexts) {
    const d = parseDelta(t)
    reqs.push(...d.added, ...d.modified, ...d.removed)
  }
  const r = target.match(/^([a-z][a-z0-9-]*)\.R(\d+)$/)
  if (r) {
    const nums = reqs.filter((q) => q.id === target).flatMap((q) => q.scenarios.map((s) => s.n))
    for (const id of retired) {
      const m = id.match(/\.S(\d+)$/)
      if (m && id.startsWith(`${target}.S`)) nums.push(Number(m[1]))
    }
    return `${target}.S${Math.max(0, ...nums) + 1}`
  }
  if (!CAP.test(target)) throw new Error("next: a capability (auth) or a requirement id (auth.R2)")
  const nums = reqs.filter((q) => q.cap === target).map((q) => q.n)
  for (const id of retired) {
    const m = id.match(/^([a-z][a-z0-9-]*)\.R(\d+)$/)
    if (m && m[1] === target) nums.push(Number(m[2]))
  }
  return `${target}.R${Math.max(0, ...nums) + 1}`
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Verified rows of a tasks.md verification table keyed by scenario id: `| auth.R1.S2 | evidence | ✅ |` */
export function scenarioChecks(tasksText) {
  const ok = new Map()
  for (const m of tasksText.matchAll(/^\|\s*([a-z][a-z0-9-]*\.R\d+\.S\d+)\s*\|\s*([^|]*?)\s*\|\s*✅\s*\|/gm)) if (m[2]) ok.set(m[1], m[2])
  return ok
}

/** Scenario → tests whose text names its id, or a ✅ check. */
export function traceScenarios(scenarios, tests, checks = new Map()) {
  return scenarios.map((s) => {
    const ref = new RegExp(`(?<![\\w.])${esc(s.id)}(?!\\d)`)
    const byTest = tests.filter((t) => ref.test(t.text)).map((t) => t.path)
    return { id: s.id, name: s.name, tag: s.tag, tests: byTest, check: checks.get(s.id) ?? null, covered: byTest.length > 0 || checks.has(s.id) }
  })
}

export function testFiles(root) {
  return repoFiles(root)
    .filter(isTest)
    .filter((f) => existsSync(join(root, f)) && statSync(join(root, f)).size < 1024 * 1024)
    .map((f) => ({ path: f, text: readFileSync(join(root, f), "utf8") }))
}

// ── project files ──────────────────────────────────────────────────────────

/** Living specs: work/specs/<cap>/spec.md (folders named NNN-… are legacy changes). */
export function livingSpecs(project) {
  const base = join(project, "work", "specs")
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((d) => CAP.test(d) && existsSync(join(base, d, "spec.md")))
    .sort()
    .map((cap) => ({ cap, path: `work/specs/${cap}/spec.md`, text: readFileSync(join(base, cap, "spec.md"), "utf8") }))
}

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "")

/** Changes: work/changes/NNN-slug/ plus legacy work/specs/NNN-slug/ (old layout, spec.md). */
export function listChanges(project) {
  const out = []
  for (const [rel, legacyDir] of [["work/changes", false], ["work/specs", true]]) {
    const base = join(project, rel)
    if (!existsSync(base)) continue
    for (const id of readdirSync(base).filter((d) => /^\d+-/.test(d)).sort()) {
      const dir = join(base, id)
      const file = existsSync(join(dir, "proposal.md")) ? "proposal.md" : existsSync(join(dir, "spec.md")) ? "spec.md" : null
      if (!file) continue
      const text = read(join(dir, file))
      const { data } = parseFrontmatter(text)
      const specsDir = join(dir, "specs")
      const deltas = existsSync(specsDir)
        ? readdirSync(specsDir)
            .filter((f) => f.endsWith(".md") && CAP.test(basename(f, ".md")))
            .sort()
            .map((f) => ({ cap: basename(f, ".md"), path: `${rel}/${id}/specs/${f}`, text: read(join(specsDir, f)) }))
        : []
      out.push({ id, dir, path: `${rel}/${id}`, file, legacyDir, text, status: data.status || "draft", merged: data.merged || null, tasksText: read(join(dir, "tasks.md")), deltas })
    }
  }
  return out
}

export function findChange(project, ref) {
  const changes = listChanges(project)
  return changes.find((c) => c.id === ref) ?? changes.find((c) => c.id.startsWith(`${String(ref).padStart(3, "0")}-`)) ?? null
}

/** Scenarios a change adds or modifies. */
export function changeScenarios(change) {
  return change.deltas.flatMap((d) => {
    const p = parseDelta(d.text)
    return [...p.added, ...p.modified].flatMap((r) => r.scenarios.filter((s) => s.req))
  })
}

const setFrontmatter = (text, key, value) => {
  if (!text.startsWith("---\n")) return `---\n${key}: ${value}\n---\n\n${text}`
  const end = text.indexOf("\n---", 4)
  const fm = text.slice(4, end).split("\n").filter((l) => !l.startsWith(`${key}:`))
  return `---\n${[...fm, `${key}: ${value}`].join("\n")}${text.slice(end)}`
}

/** Merge a change's deltas into the living specs — all or nothing. */
export function mergeChange(project, ref, today = new Date().toISOString().slice(0, 10)) {
  const change = findChange(project, ref)
  if (!change) return { written: [], conflicts: [`no change matching "${ref}"`] }
  if (change.merged) return { written: [], conflicts: [], already: true }
  if (change.status === "draft" || change.status === "dropped") return { written: [], conflicts: [`change ${change.id} is ${change.status}`] }
  if (!change.deltas.length) return { written: [], conflicts: [`change ${change.id} has no delta specs (specs/<capability>.md)`] }
  const plans = []
  const conflicts = []
  for (const d of change.deltas) {
    const path = join(project, "work", "specs", d.cap, "spec.md")
    const r = mergeDelta(existsSync(path) ? readFileSync(path, "utf8") : null, d.text, d.cap)
    if (r.conflicts.length) conflicts.push(...r.conflicts)
    else plans.push({ path, rel: `work/specs/${d.cap}/spec.md`, text: r.text })
  }
  if (conflicts.length) return { written: [], conflicts }
  for (const p of plans) {
    mkdirSync(join(p.path, ".."), { recursive: true })
    writeFileSync(p.path, p.text)
  }
  writeFileSync(join(change.dir, change.file), setFrontmatter(change.text, "merged", today))
  return { written: plans.map((p) => p.rel).sort(), conflicts: [] }
}

/** Lint every living spec and the deltas of open changes (or one cap / change). */
export function lintProject(project, only) {
  const living = livingSpecs(project)
  const byCap = new Map(living.map((s) => [s.cap, s.text]))
  const out = []
  for (const s of living) if (!only || only === s.cap) out.push({ file: s.path, ...lintSpec(s.text, s.cap) })
  for (const c of listChanges(project)) {
    if (c.merged || c.status === "dropped") continue
    if (only && !c.id.startsWith(`${String(only).padStart(3, "0")}-`) && !c.deltas.some((d) => d.cap === only)) continue
    for (const d of c.deltas) out.push({ file: d.path, ...lintDelta(d.text, byCap.get(d.cap) ?? null, d.cap) })
  }
  return out
}

export async function main(argv) {
  const [cmd, arg] = argv
  const project = findProjectDir() ?? process.cwd()
  if (cmd === "lint") {
    const results = lintProject(project, arg)
    let errors = 0
    for (const r of results) {
      if (!r.errors.length && !r.warnings.length) continue
      console.log(r.file)
      for (const e of r.errors) console.log(`  ✗ ${e}`)
      for (const w of r.warnings) console.log(`  ! ${w}`)
      errors += r.errors.length
    }
    console.log(results.length ? `${results.length} file(s), ${errors} error(s)` : "No living specs or open deltas.")
    return errors ? 1 : 0
  }
  if (cmd === "next") {
    if (!arg) return console.error("usage: specs.mjs next <cap|cap.Rn>"), 2
    const pending = listChanges(project).filter((c) => !c.merged && c.status !== "dropped").flatMap((c) => c.deltas.map((d) => d.text))
    console.log(nextId(arg, livingSpecs(project).map((s) => s.text), pending))
    return 0
  }
  if (cmd === "merge") {
    if (!arg) return console.error("usage: specs.mjs merge <NNN>"), 2
    const r = mergeChange(project, arg)
    if (r.already) console.log(`change ${arg} is already merged — nothing to do`)
    for (const f of r.written) console.log(`merged into ${f}`)
    for (const c of r.conflicts) console.log(`✗ ${c}`)
    if (r.conflicts.length) console.log("Nothing written.")
    if (r.written.length) {
      // The QA checklist is a view of the living specs: keep it in step.
      const { syncQa } = await import("./qa.mjs")
      for (const f of syncQa(project).written) console.log(`updated ${f}`)
    }
    return r.conflicts.length ? 1 : 0
  }
  if (cmd === "trace") {
    const root = repoRoot(project) ?? project
    const tests = testFiles(root)
    const changes = listChanges(project)
    const checks = new Map(changes.flatMap((c) => [...scenarioChecks(c.tasksText)]))
    const change = arg && /^\d/.test(arg) ? findChange(project, arg) : null
    if (arg && /^\d/.test(arg) && !change) return console.log(`No change matching "${arg}".`), 1
    const groups = change
      ? [{ label: `change ${change.id}`, scenarios: changeScenarios(change), checks: scenarioChecks(change.tasksText) }]
      : livingSpecs(project)
          .filter((s) => !arg || s.cap === arg)
          .map((s) => ({ label: s.path, scenarios: parseSpec(s.text).requirements.flatMap((r) => r.scenarios.filter((x) => x.req)), checks }))
    if (!groups.length) return console.log("No living specs."), 0
    let missing = 0
    for (const g of groups) {
      console.log(`${g.label}`)
      if (!g.scenarios.length) console.log("  - no scenarios")
      for (const r of traceScenarios(g.scenarios, tests, g.checks)) {
        if (!r.covered) missing++
        console.log(`  ${r.covered ? "✓" : "✗"} ${r.id} @${r.tag ?? "?"} — ${r.tests.length ? r.tests.join(", ") : r.check ? `check: ${r.check}` : "not covered"}`)
      }
    }
    console.log(missing ? `${missing} scenario(s) not covered` : "All scenarios covered.")
    return change && missing ? 1 : 0
  }
  if (cmd === "list") {
    const specs = livingSpecs(project)
    if (!specs.length) console.log("No living specs yet (work/specs/<capability>/spec.md).")
    for (const s of specs) {
      const p = parseSpec(s.text)
      console.log(`${s.cap} — ${p.requirements.length} requirement(s), ${p.requirements.reduce((n, r) => n + r.scenarios.length, 0)} scenario(s)`)
    }
    return 0
  }
  console.log("usage: specs.mjs lint [cap|NNN] | next <cap|cap.Rn> | merge <NNN> | trace [NNN|cap] | list")
  return cmd ? 2 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2)).then((code) => process.exit(code))
