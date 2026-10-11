#!/usr/bin/env node
// @name: scout
// @summary: Ecosystem watch for the kit: new Claude Code versions, new hook events in the docs, template dependencies a major version behind — vs a reviewed baseline; report to stdout or the proposals inbox.
// @usage: node scripts/evolve/scout.mjs [--write] [--update-baseline]
// @tags: [evolve, release]
// @test: scout.test.mjs
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = fileURLToPath(new URL("../../", import.meta.url))
const BASELINE = join(ROOT, "scripts", "evolve", "baseline.json")
const HOOKS_DOC = "https://code.claude.com/docs/en/hooks.md"

/** Major of a semver range or version; for 0.x the minor is the breaking part. */
export function majorOf(v) {
  const m = String(v).match(/(\d+)\.(\d+)/)
  if (!m) return null
  return m[1] === "0" ? `0.${m[2]}` : m[1]
}

export function majorBehind(range, latest) {
  const a = majorOf(range)
  const b = majorOf(latest)
  if (a == null || b == null || a === b) return false
  const [x1, y1] = a.split(".").map(Number)
  const [x2, y2] = b.split(".").map(Number)
  return x2 > x1 || (x2 === x1 && (y2 ?? 0) > (y1 ?? 0))
}

/** Hook event names documented as `### Name` (PascalCase) headings. */
export function parseHookEvents(markdown) {
  return [...new Set([...markdown.matchAll(/^### ([A-Z][a-z]+(?:[A-Z][a-z]+)+)\s*$/gm)].map((m) => m[1]))].sort()
}

export const added = (before = [], after = []) => after.filter((x) => !before.includes(x))

/** Every external dependency range in the templates (workspace packages excluded). */
export function templateDeps(root = ROOT) {
  const deps = {}
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules") continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name === "package.json") {
        const pkg = JSON.parse(readFileSync(p, "utf8"))
        for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }))
          if (!name.startsWith("@__NAME__")) deps[name] = range
      }
    }
  }
  walk(join(root, "templates"))
  return deps
}

const npmLatest = (name) => {
  try {
    return execFileSync("npm", ["view", name, "version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return null
  }
}

async function main(argv) {
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {}
  const current = { claudeCode: npmLatest("@anthropic-ai/claude-code"), hookEvents: [], checked: new Date().toISOString().slice(0, 10) }
  try {
    current.hookEvents = parseHookEvents(await (await fetch(HOOKS_DOC)).text())
  } catch {
    /* offline: report without docs */
  }
  const deps = templateDeps()
  const behind = []
  for (const [name, range] of Object.entries(deps)) {
    const latest = npmLatest(name)
    if (latest && majorBehind(range, latest)) behind.push(`\`${name}\` ${range} → latest ${latest}`)
  }

  const newEvents = added(baseline.hookEvents, current.hookEvents)
  const lines = [
    `# Scout report — ${current.checked}`,
    "",
    "## Claude Code",
    current.claudeCode && current.claudeCode !== baseline.claudeCode
      ? `- New version ${current.claudeCode} (kit last verified on ${baseline.claudeCode ?? "?"}): read the changelog, then \`node scripts/e2e/live.mjs\` and \`triggers.mjs\`.`
      : `- ${current.claudeCode ?? "unknown"} — no change since the baseline.`,
    "",
    "## Hook events in the docs",
    ...(current.hookEvents.length === 0
      ? ["- docs not reachable"]
      : newEvents.length
        ? newEvents.map((e) => `- new: \`${e}\` — could a guardrail or checkpoint use it?`)
        : [`- ${current.hookEvents.length} events, none new.`]),
    "",
    "## Template dependencies a major version behind",
    ...(behind.length ? behind.map((b) => `- ${b} — try it in a scaffold (templates CI), then update the range`) : ["- none"]),
    "",
    "## Beyond this report",
    "Trends (new skills, harnesses, workflows) need judgment and web research: see scripts/evolve/ROUTINE.md.",
  ]
  const report = lines.join("\n")
  console.log(report)
  if (argv.includes("--write")) {
    const inbox = join(ROOT, "work", "proposals")
    mkdirSync(inbox, { recursive: true })
    const n = String(readdirSync(inbox).reduce((m, f) => Math.max(m, Number(f.match(/^(\d+)-/)?.[1] ?? 0)), 0) + 1).padStart(3, "0")
    const file = join(inbox, `${n}-scout-${current.checked}.md`)
    writeFileSync(file, `---\nstatus: proposed\nkind: other\ndate: ${current.checked}\nfrom: scout\n---\n\n${report}\n`)
    console.log(`\nwrote ${relative(ROOT, file)}`)
  }
  if (argv.includes("--update-baseline")) {
    mkdirSync(dirname(BASELINE), { recursive: true })
    writeFileSync(BASELINE, `${JSON.stringify({ claudeCode: current.claudeCode, hookEvents: current.hookEvents, checked: current.checked }, null, 2)}\n`)
    console.log("baseline updated")
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2)).then((c) => process.exit(c))
