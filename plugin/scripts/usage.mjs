#!/usr/bin/env node
// Usage signals for a retro: what ran and failed, scripts never used, scratch
// scripts to promote or delete, knowledge nobody links to, work status.
//
//   node usage.mjs [--days 30]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { STATE_DIR, findProjectDir } from "./config.mjs"
import { collect } from "./knowledge.mjs"
import { collectScripts } from "./scripts.mjs"
import { collectWork } from "./work.mjs"

const DAY = 86_400_000

/** Run logs → Map<label, { runs, failures, last }> */
export function runStats(files) {
  const stats = new Map()
  for (const { name, text, mtime } of files) {
    const label = name.replace(/-\d{4}-\d{2}-\d{2}T[\d-]+Z\.log$/, "")
    const code = Number(text.match(/^# exit (\d+)/m)?.[1] ?? 0)
    const s = stats.get(label) ?? { runs: 0, failures: 0, last: 0 }
    s.runs++
    if (code) s.failures++
    s.last = Math.max(s.last, mtime)
    stats.set(label, s)
  }
  return stats
}

/** Entries no other entry links to (and not touched in `days`). */
export function orphans(entries, mtimes, now, days) {
  const linked = new Set()
  for (const e of entries) for (const [, t] of e.body.matchAll(/\[\[([^\]|]+)/g)) linked.add(t.trim())
  return entries.filter((e) => !linked.has(e.name) && now - (mtimes.get(e.path) ?? now) > days * DAY)
}

export function main(argv) {
  const days = Number(argv[argv.indexOf("--days") + 1]) || 30
  const project = findProjectDir() ?? process.cwd()
  const now = Date.now()
  const runsDir = join(project, STATE_DIR, "runs")
  const logs = existsSync(runsDir)
    ? readdirSync(runsDir)
        .filter((f) => f.endsWith(".log"))
        .map((name) => ({ name, mtime: statSync(join(runsDir, name)).mtimeMs, path: join(runsDir, name) }))
        .filter((l) => now - l.mtime < days * DAY)
        .map((l) => ({ ...l, text: readFileSync(l.path, "utf8") }))
    : []
  const stats = runStats(logs)

  console.log(`# Usage — last ${days} days\n\n## Runs`)
  if (!stats.size) console.log("- none recorded")
  for (const [label, s] of [...stats].sort((a, b) => b[1].runs - a[1].runs))
    console.log(`- ${label}: ${s.runs} run(s)${s.failures ? `, ${s.failures} failed` : ""}`)

  const scripts = collectScripts(project)
  const never = scripts.filter((s) => s.origin === "project" && !stats.has(s.name))
  console.log("\n## Project scripts not run in this window")
  console.log(never.length ? never.map((s) => `- ${s.name} — ${s.summary}`).join("\n") : "- none")

  console.log("\n## Scratch scripts")
  const scratch = scripts.filter((s) => s.origin === "scratch")
  if (!scratch.length) console.log("- none")
  for (const s of scratch) {
    const age = Math.floor((now - statSync(s.path).mtimeMs) / DAY)
    const runs = stats.get(s.name)?.runs ?? 0
    const hint = runs >= 2 ? "PROMOTE (used more than once)" : age > 14 ? "delete? (old, unused)" : "keep for now"
    console.log(`- ${s.name} — ${age}d old, ${runs} run(s) → ${hint}`)
  }

  const entries = collect()
  const mtimes = new Map(entries.map((e) => [e.path, statSync(e.path).mtimeMs]))
  const lonely = orphans(entries.filter((e) => e.origin === "project"), mtimes, now, 180)
  console.log("\n## Project knowledge nobody links to, untouched for 180+ days")
  console.log(lonely.length ? lonely.map((e) => `- ${e.scope}/${e.name} — ${e.summary}`).join("\n") : "- none")

  const work = collectWork(project)
  const byStatus = {}
  for (const w of work) byStatus[w.status] = (byStatus[w.status] ?? 0) + 1
  console.log(`\n## Work\n- ${Object.entries(byStatus).map(([k, n]) => `${k}: ${n}`).join(", ") || "none"}`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
