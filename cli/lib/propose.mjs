// `agent-kit propose "<title>"`: sends an improvement idea from a project to the kit.
// With a local agent-kit clone (agent-kit setup / AGENT_KIT_HOME) it lands in the
// clone's work/proposals/ inbox; otherwise it is saved locally with a ready
// `gh issue create` command — sending it is the user's call.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { PROJECT_FILE, findProjectDir, readJson, readUserConfig, STATE_DIR } from "../../plugin/scripts/config.mjs"
import { nextNumber } from "../../plugin/scripts/work.mjs"

export const KINDS = ["skill", "hook", "script", "knowledge", "template", "cli", "bug", "other"]
export const REPO = "razcue/agent-kit"

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "proposal"

/** Pure: the proposal file. Carries only kit-level context (no code, no project content). */
export function proposalText({ title, body, kind, from, date }) {
  return `---
status: proposed # proposed | accepted | rejected | done
kind: ${kind}
date: ${date}
from: kit ${from.kitVersion ?? "?"}, stack ${from.stack ?? "?"}, method ${from.methodology ?? "?"}
---

# ${title}

${body?.trim() || "## Problem\n<What went wrong or was missing, seen in which kind of task.>\n\n## Proposal\n<The change to the kit: which skill, hook, script, template or knowledge entry.>\n\n## Evidence\n<How often it happened; what a retro or usage report showed.>"}
`
}

export function propose(title, flags = {}) {
  if (!title) throw new Error('usage: agent-kit propose "<title>" [--kind skill|hook|script|knowledge|template|cli|bug|other] [--body "<text>"]')
  const kind = flags.kind ?? "other"
  if (!KINDS.includes(kind)) throw new Error(`--kind: one of ${KINDS.join(", ")}`)
  const project = findProjectDir(resolve("."))
  const cfg = project ? readJson(join(project, PROJECT_FILE)) ?? {} : {}
  const body = flags.body && existsSync(flags.body) ? readFileSync(flags.body, "utf8") : flags.body
  const text = proposalText({ title, body, kind, from: cfg, date: new Date().toISOString().slice(0, 10) })

  const home = process.env.AGENT_KIT_HOME || readUserConfig().home
  const inbox = home && existsSync(join(home, ".claude-plugin", "marketplace.json")) ? join(home, "work", "proposals") : null
  const dir = inbox ?? join(project ?? process.cwd(), STATE_DIR, "proposals")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${nextNumber(readdirSync(dir))}-${slugify(title)}.md`)
  writeFileSync(file, text)
  if (inbox) console.log(`proposal → ${file}\nIt is in your agent-kit clone's inbox: review it there (spec/feature lane) and commit it with the kit.`)
  else
    console.log(`proposal saved → ${file}\nNo local agent-kit clone is configured. To send it to the kit repo, run:\n  gh issue create --repo ${REPO} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(file)}`)
  return 0
}
