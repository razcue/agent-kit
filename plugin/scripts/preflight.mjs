#!/usr/bin/env node
// Pre-merge checklist from the diff between the merge base and the working
// tree (committed + staged + unstaged + untracked). Read-only git.
//
//   node preflight.mjs [base-branch]      exit 1 when a violation is found
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { collectChanges, repoFiles, repoRoot } from "./changes.mjs"
import { SCRIPT_EXT, parseHeader } from "./scripts.mjs"
import { findProjectDir } from "./config.mjs"
import { projectTestConfig, tddStatus } from "./tdd.mjs"
import { traceGaps } from "./work.mjs"

export { addedLines } from "./changes.mjs"

const MIGRATION = /(^|\/)migrations\/[^/]+\.sql$/
const CODE = /\.(ts|js|mjs|cjs|vue)$/
const SECRET_PATTERNS = [
  [/eyJ[\w-]{15,}\.eyJ[\w-]{15,}\.[\w-]{10,}/, "JWT-like token"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "API secret key"],
  [/\b(SERVICE_ROLE(_KEY)?|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)\w*\s*[=:]\s*["']?(?!your|example|xxx|changeme)[^\s"'$]{16,}/i, "credential assignment"],
]

/**
 * @param untested changed logic files without a test (only passed in sdd-tdd projects)
 * @param undocumentedScripts changed scripts under scripts/ without @summary/@usage
 * @param gaps approved/done specs with acceptance criteria not covered by a test or a ✅ check
 */
export function analyze({ status, added, untested = [], undocumentedScripts = [], gaps = [] }) {
  const report = { violations: [], database: [], configuration: [], dependencies: [], warnings: [] }
  for (const file of untested) report.violations.push(`\`${file}\` changed without a test — TDD: write the failing test first`)
  for (const file of undocumentedScripts)
    report.violations.push(`\`${file}\` has no @summary/@usage header — document it (scripts skill)`)
  for (const { spec, missing } of gaps) {
    const msg = `spec \`${spec.id}\` (${spec.status}): ${missing.join(", ")} not covered — reference \`${spec.id.match(/^\d+/)?.[0] ?? spec.id}/AC-n\` in a test or add a ✅ row to tasks.md`
    if (spec.status === "done") report.violations.push(msg)
    else report.warnings.push(msg)
  }
  for (const [file, st] of status) {
    if (!MIGRATION.test(file)) continue
    if (st === "A" || st === "?") report.database.push(`apply new migration \`${file}\``)
    else report.violations.push(`\`${file}\` (${st}): an existing migration was changed — add a new migration instead`)
  }
  for (const [file, lines] of added) {
    for (const { line, text } of lines) {
      const at = `\`${file}:${line}\``
      if (file.endsWith(".sql") && /\bGRANT\b.*\bTO\s+(anon|authenticated)\b/i.test(text))
        report.violations.push(`${at} grants to anon/authenticated — the browser must never reach the Data API`)
      for (const [re, label] of SECRET_PATTERNS)
        if (re.test(text)) report.violations.push(`${at} possible secret (${label})`)
      for (const [, name] of text.matchAll(/process\.env\.([A-Z0-9_]+)/g))
        report.configuration.push(`env var \`${name}\` used at ${at}`)
      if (/(^|\/)\.env\.example$/.test(file) && /^[A-Z0-9_]+=/.test(text))
        report.configuration.push(`new env var \`${text.split("=")[0]}\` (${at}) — set it in every environment`)
      if (/(^|\/)package\.json$/.test(file) && /^\s*"[^"]+":\s*"(\^|~|\d|workspace:|npm:)/.test(text) && !/"(version|name)"/.test(text))
        report.dependencies.push(`${text.trim().replace(/,$/, "")} in \`${file}\``)
      if (CODE.test(file) && /\bconsole\.(log|debug)\(|\bdebugger\b/.test(text))
        report.warnings.push(`${at} debug leftover: \`${text.trim().slice(0, 80)}\``)
    }
  }
  return report
}

export function render(report, base) {
  const out = [`# Preflight vs \`${base}\``, ""]
  const section = (title, items) => {
    out.push(`## ${title}`, "", ...(items.length ? [...new Set(items)].map((i) => `- ${i}`) : ["- none"]), "")
  }
  section("Violations (must fix)", report.violations)
  section("Database", report.database)
  section("Configuration", report.configuration)
  section("Dependencies", report.dependencies)
  section("Warnings", report.warnings)
  out.push(report.violations.length ? "**BLOCK**" : "**PASS**")
  return out.join("\n")
}

function main([baseArg]) {
  const root = repoRoot()
  if (!root) {
    console.error("preflight: not a git repository")
    return 2
  }
  const { status, added, label } = collectChanges(root, baseArg)
  const cfg = projectTestConfig(root)
  const untested =
    cfg.methodology === "sdd-tdd"
      ? tddStatus({ status, files: repoFiles(root), ignore: cfg.ignore }).untested.map((r) => r.file)
      : []
  const undocumentedScripts = [...status]
    .filter(([f, st]) => st !== "D" && /^scripts\//.test(f) && SCRIPT_EXT.test(f) && !/\.(test|spec)\./.test(f))
    .filter(([f]) => existsSync(join(root, f)))
    .filter(([f]) => {
      const h = parseHeader(readFileSync(join(root, f), "utf8"))
      return !(h.summary && h.usage)
    })
    .map(([f]) => f)

  const gaps = traceGaps(findProjectDir(root) ?? root, root)
  const report = analyze({ status, added, untested, undocumentedScripts, gaps })
  console.log(render(report, label))
  return report.violations.length ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main(process.argv.slice(2)))
}
