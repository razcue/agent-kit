// `agent-kit uninstall`: removes only what agent-kit added to a project — the
// AGENTS.md block, its settings entries and agent-kit.json — after backing them
// up. Project content (.knowledge/, work/, scripts/, commitlint) is kept.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { PROJECT_FILE, STATE_DIR, findProjectDir, readJson } from "../../plugin/scripts/config.mjs"
import { removeBlock, stripSettings } from "./lifecycle.mjs"

export function uninstall(target, { dryRun = false } = {}) {
  const dir = findProjectDir(resolve(target ?? "."))
  if (!dir) throw new Error(`no ${PROJECT_FILE} here — nothing to uninstall`)
  const backup = join(dir, STATE_DIR, "backups", `${new Date().toISOString().replace(/[:.]/g, "-")}-uninstall`)
  const plan = []
  const save = (rel) => {
    mkdirSync(dirname(join(backup, rel)), { recursive: true })
    copyFileSync(join(dir, rel), join(backup, rel))
  }

  const agents = join(dir, "AGENTS.md")
  if (existsSync(agents)) {
    const next = removeBlock(readFileSync(agents, "utf8"))
    if (next !== null) plan.push(["AGENTS.md", "remove the agent-kit block", () => (next ? writeFileSync(agents, next) : rmSync(agents))])
  }
  const settingsPath = join(dir, ".claude", "settings.json")
  if (existsSync(settingsPath)) {
    const next = stripSettings(readJson(settingsPath))
    plan.push([".claude/settings.json", next ? "remove the plugin and git-flow rules" : "delete (only agent-kit entries)", () => (next ? writeFileSync(settingsPath, `${JSON.stringify(next, null, 2)}\n`) : rmSync(settingsPath))])
  }
  plan.push([PROJECT_FILE, "delete", () => rmSync(join(dir, PROJECT_FILE))])

  console.log(`${dryRun ? "Would change" : "Changing"} in ${dir}:`)
  for (const [rel, what] of plan) console.log(`  ${rel} — ${what}`)
  console.log("Kept: .knowledge/, work/, scripts/, CLAUDE.md, .mcp.json, commitlint/husky setup, .agent-kit/ (backups).")
  if (dryRun) return 0
  for (const [rel, , apply] of plan) {
    save(rel)
    apply()
  }
  console.log(`Backed up to ${backup.replace(`${dir}/`, "")}/. In Claude Code you can also run: /plugin uninstall agent-kit@agent-kit`)
  return 0
}
