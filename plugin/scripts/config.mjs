// Shared paths and config for the agent-kit plugin scripts and CLI.
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
export const PROJECT_FILE = "agent-kit.json"
export const KNOWLEDGE_DIR = ".knowledge"
export const USER_CONFIG = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "agent-kit",
  "config.json",
)

// Project scopes live in <project>/.knowledge/<scope>; `local` is gitignored.
export const PROJECT_SCOPES = ["business", "env", "decisions", "ux", "stack", "local"]
// Global scopes live in <agent-kit clone>/plugin/knowledge/<scope>.
export const GLOBAL_SCOPES = ["stack", "meta", "ux"]

export const ENTRY_TYPES = ["concept", "rule", "decision", "howto", "reference"]
export const ENTRY_STATUS = ["active", "proposed", "superseded", "deprecated"]

/** Semver compare: -1, 0, 1. */
export function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number)
  const pb = String(b).split(".").map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1
  return 0
}

/** Version of the installed plugin (from its manifest). */
export function pluginVersion() {
  return readJson(join(PLUGIN_ROOT, ".claude-plugin", "plugin.json"))?.version ?? null
}

/** Opt-in hook trace: set AGENT_KIT_HOOK_LOG=<file> to see which hooks ran. */
export function hookLog(hook, detail = "") {
  const file = process.env.AGENT_KIT_HOOK_LOG
  if (!file) return
  try {
    appendFileSync(file, `${new Date().toISOString()} ${hook} ${detail}\n`)
  } catch {
    /* tracing must never break a hook */
  }
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

/** Walks up from `start` to the nearest folder holding agent-kit.json. */
export function findProjectDir(start = process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  let dir = resolve(start)
  for (;;) {
    if (existsSync(join(dir, PROJECT_FILE))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function readProject(dir) {
  return dir ? readJson(join(dir, PROJECT_FILE)) : null
}

export function readUserConfig() {
  return readJson(USER_CONFIG) ?? {}
}

/**
 * A global plugin folder (`knowledge`, `library`): the local agent-kit clone
 * (writable) when configured with `agent-kit setup` or AGENT_KIT_HOME, else the
 * copy bundled with the installed plugin (read-only).
 */
function globalDir(name) {
  const home = process.env.AGENT_KIT_HOME || readUserConfig().home
  if (home) {
    const dir = join(home, "plugin", name)
    if (existsSync(dir)) return { dir, writable: true }
  }
  const bundled = join(PLUGIN_ROOT, name)
  if (existsSync(bundled)) return { dir: bundled, writable: false }
  return null
}

export const globalKnowledge = () => globalDir("knowledge")
/** Cross-project reusable scripts. */
export const globalLibrary = () => globalDir("library")

/** Machine state inside a project (gitignored): run logs, scratch scripts. */
export const STATE_DIR = ".agent-kit"
export const METHODS = ["sdd-tdd", "sdd"]
