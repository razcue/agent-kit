#!/usr/bin/env node
// @name: triggers
// @summary: Skill trigger eval in real Claude Code: one realistic prompt per agent-kit skill, checks the model loads the expected skill (headless, --plugin-dir).
// @usage: node scripts/e2e/triggers.mjs [--model haiku] [--only spec,tdd]
// @tags: [e2e, skills, release]
// @test: triggers.test.mjs
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const KIT = fileURLToPath(new URL("../../", import.meta.url))

/** One prompt per skill: what a user would really type. Optional third value: the project
 * kind to run in ("monorepo" by default; stack skills only exist in their template's projects). */
export const CASES = [
  ["start", "I want to build a small website for my bakery. Help me get started."],
  ["adopt", "Our AGENTS.md is huge and every session burns tokens loading it. Slim it down for agent-kit."],
  ["spec", "Plan a new invoices module with permissions and database changes. Write the spec first."],
  ["feature", "Small tweak: on the app's home page, rename the \"Sign out\" button to \"Log out\"."],
  ["tdd", "Test first: I need a function that rounds money amounts to 3 decimals. Do it TDD."],
  ["scripts", "Write a script that counts the rows of every CSV file in data/ and prints a summary."],
  ["knowledge", "Remember this from now on: all prices are displayed with 3 decimals."],
  ["decide", "We decided to use Supabase instead of Firebase. Record that decision with the reasons."],
  ["retro", "Let's do a retro of this month and improve our agent setup."],
  ["commit", "Commit my changes with a proper message."],
  ["preflight", "What do I need to do before merging this branch to production?"],
  ["stack-nuxt-supabase", "Add a server route in apps/app that lists invoices from Supabase."],
  ["stack-nuxt-content-site", "Add a contact page to the site with our phone number and a short text.", "site"],
]

/** Requests where no agent-kit skill should load (over-triggering wastes context). */
export const NEGATIVE = [
  "What does the useAuthStore composable in apps/app do? Explain in two sentences.",
  "How many SQL migration files does this repository have?",
  "In one paragraph: what is a Nuxt layer?",
]

/** Pure: every tool the model called, from stream-json lines. */
export function toolsUsed(lines) {
  const tools = []
  for (const line of lines) {
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.type === "assistant") for (const c of e.message?.content ?? []) if (c.type === "tool_use") tools.push(c.name)
  }
  return tools
}

/** Pure: skills the model loaded, from stream-json lines. */
export function skillsUsed(lines) {
  const used = []
  for (const line of lines) {
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.type !== "assistant") continue
    for (const c of e.message?.content ?? [])
      if (c.type === "tool_use" && c.name === "Skill") used.push(String(c.input?.skill ?? c.input?.name ?? "").replace(/^agent-kit:/, ""))
  }
  return used
}

function main(argv) {
  const model = argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : "haiku"
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null
  const dir = mkdtempSync(join(tmpdir(), "agent-kit-triggers-"))
  // Scaffolded projects (files only, no install), so prompts about pages and routes are real.
  const projects = { monorepo: join(dir, "monorepo"), site: join(dir, "site") }
  spawnSync("node", [join(KIT, "cli/index.mjs"), "init", projects.monorepo, "--yes", "--name", "triggers", "--apps", "web,app", "--git", "read-only"], { encoding: "utf8" })
  spawnSync("node", [join(KIT, "cli/index.mjs"), "init", projects.site, "--yes", "--kind", "site", "--name", "triggers-site", "--git", "read-only"], { encoding: "utf8" })
  let hits = 0
  const cases = [...CASES.filter(([s]) => !only || only.includes(s)), ...(only && !only.includes("none") ? [] : NEGATIVE.map((p) => [null, p, "monorepo"]))]
  const ours = new Set(CASES.map(([s]) => s))
  for (const [skill, prompt, kind = "monorepo"] of cases) {
    const r = spawnSync(
      "claude",
      // Read-only exploration allowed, as in a real session; the skill counts if it is
      // loaded at any point within 5 turns.
      ["-p", prompt, "--plugin-dir", join(KIT, "plugin"), "--model", model, "--output-format", "stream-json", "--verbose", "--max-turns", "5",
        "--allowedTools", "Skill", "Read", "Glob", "Grep", "Bash(ls:*)", "Bash(cat:*)"],
      { cwd: projects[kind], input: "", encoding: "utf8", timeout: 180_000, env: { ...process.env, AGENT_KIT_HOME: KIT } },
    )
    const lines = (r.stdout ?? "").split("\n")
    const used = skillsUsed(lines)
    const tools = toolsUsed(lines).filter((t) => t !== "Skill")
    const ok = skill ? used.includes(skill) : !used.some((u) => ours.has(u))
    if (ok) hits++
    const label = skill ?? `(none) ${prompt.slice(0, 28)}…`
    console.log(`${ok ? "✓" : "✗"} ${label.padEnd(20)} ${ok ? "" : `→ loaded: ${used.join(", ") || "none"}; other tools: ${tools.join(", ") || "none"}`}`)
  }
  rmSync(dir, { recursive: true, force: true })
  console.log(`\n${hits}/${cases.length} cases right (${model}): skills triggered by their prompt, none on unrelated questions.`)
  return hits === cases.length ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
