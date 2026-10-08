#!/usr/bin/env node
// agent-kit CLI: init | setup | doctor | knowledge
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  PLUGIN_ROOT,
  PROJECT_FILE,
  PROJECT_SCOPES,
  USER_CONFIG,
  findProjectDir,
  globalKnowledge,
  readJson,
} from "../plugin/scripts/config.mjs"
import { check, main as knowledgeMain, writeIndexes } from "../plugin/scripts/knowledge.mjs"
import { check as checkScripts, main as scriptsMain, writeIndex as writeScriptsIndex } from "../plugin/scripts/scripts.mjs"
import { main as tddMain } from "../plugin/scripts/tdd.mjs"
import { estimate, main as contextMain } from "../plugin/scripts/context.mjs"
import { main as commitMain } from "../plugin/scripts/commit.mjs"
import { main as usageMain } from "../plugin/scripts/usage.mjs"
import { collectWork, main as workMain, renderBoard } from "../plugin/scripts/work.mjs"
import { KIT_VERSION, QUESTIONS, init } from "./lib/init.mjs"
import { uninstall } from "./lib/uninstall.mjs"
import { upgrade } from "./lib/upgrade.mjs"

const HELP = `agent-kit — minimal agent-driven development kit for Claude Code

  agent-kit init [dir]     ask the setup questions and write the project (re-runnable)
      --name <kebab>  --kind monorepo|existing  --apps web,app,docs
      --level technical|non-technical  --lang en|es  --method sdd-tdd|sdd  --git pr|trunk|read-only
      --main <branch>  --marketplace github:<owner/repo>|<local path>  --yes (defaults, no prompts)
      --supabase-mcp <project-ref>   read-only Supabase MCP server in .mcp.json
  agent-kit upgrade [dir] [--yes]   new questions only + re-apply the agent layer + what's new
  agent-kit uninstall [dir] [--dry-run]   remove what agent-kit added (backed up; your content stays)
  agent-kit setup [--home <agent-kit clone>]   make global knowledge writable on this machine
  agent-kit doctor [dir] [--fix]   check a project's agent setup (--fix regenerates indexes and the board)
  agent-kit knowledge <paths|find|index|check> ...   knowledge base tools
  agent-kit scripts <find|list|run|test|new|index|check> ...   script registry
  agent-kit tdd <status|run> ...   TDD status and related-test runs
  agent-kit work <status|board|trace> ...   active work, board, acceptance-criteria trace
  agent-kit preflight [base]   pre-merge checklist (exit 1 = block)
  agent-kit context [dir] [--budget N]   tokens loaded every session + invisible skills
  agent-kit usage [--days N]   usage signals for a retro
  agent-kit commit draft [--staged] | check "<message>"   Conventional Commit helpers
      (init: --commits conventional|none)
`

function parse(argv) {
  const flags = {}
  const args = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) {
      args.push(a)
      continue
    }
    const [key, inline] = a.slice(2).split("=", 2)
    if (inline !== undefined) flags[key] = inline
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[key] = argv[++i]
    else flags[key] = true
  }
  return { args, flags }
}

function setup(flags) {
  const clone = resolve(PLUGIN_ROOT, "..")
  const home = resolve(flags.home ?? (existsSync(join(clone, "plugin", "knowledge")) ? clone : process.cwd()))
  if (!existsSync(join(home, "plugin", "knowledge"))) {
    console.error(`${home} is not an agent-kit clone (no plugin/knowledge). Pass --home <path to your clone>.`)
    return 1
  }
  mkdirSync(dirname(USER_CONFIG), { recursive: true })
  const config = { ...readJson(USER_CONFIG), home }
  writeFileSync(USER_CONFIG, `${JSON.stringify(config, null, 2)}\n`)
  console.log(`wrote ${USER_CONFIG.replace(homedir(), "~")}: global knowledge = ${home}/plugin/knowledge (writable)

To develop the plugin from this clone instead of GitHub, in Claude Code:
  /plugin marketplace add ${home}
  /plugin install agent-kit@agent-kit`)
  return 0
}

/** Safe, local fixes: regenerate everything that is generated. */
function fix(dir) {
  process.env.CLAUDE_PROJECT_DIR = dir
  const done = writeIndexes({ project: true, global: false }).map((f) => f.replace(`${dir}/`, ""))
  if (existsSync(join(dir, "scripts"))) done.push(writeScriptsIndex(dir).replace(`${dir}/`, ""))
  if (existsSync(join(dir, "work"))) {
    writeFileSync(join(dir, "work", "BOARD.md"), renderBoard(collectWork(dir)))
    done.push("work/BOARD.md")
  }
  console.log(`regenerated: ${done.join(", ")}\n`)
}

async function doctor(target, flags = {}) {
  const dir = findProjectDir(resolve(target ?? "."))
  const results = []
  const ok = (pass, label, fix = "") => results.push({ pass, label, fix })
  if (!dir) {
    console.log(`✗ no ${PROJECT_FILE} found — run: npx @razcue/agent-kit init`)
    return 1
  }
  if (flags.fix) fix(dir)
  const cfg = readJson(join(dir, PROJECT_FILE)) ?? {}
  ok(
    ["technicalLevel", "language", "methodology", "commitConvention", "gitFlow"].every((k) => QUESTIONS[k].some((o) => o.value === cfg[k])),
    `${PROJECT_FILE} answers are valid`,
    "re-run init",
  )
  const agents = existsSync(join(dir, "AGENTS.md")) ? readFileSync(join(dir, "AGENTS.md"), "utf8") : ""
  ok(agents.includes("<!-- agent-kit:start -->"), "AGENTS.md has the agent-kit block", "re-run init")
  ok(agents.split("\n").length <= 300, `AGENTS.md is short (${agents.split("\n").length} lines ≤ 300)`, "move details to .knowledge/")
  const claude = existsSync(join(dir, "CLAUDE.md")) ? readFileSync(join(dir, "CLAUDE.md"), "utf8") : ""
  ok(claude.includes("@AGENTS.md"), "CLAUDE.md imports @AGENTS.md", "re-run init")
  const settings = readJson(join(dir, ".claude", "settings.json"))
  ok(settings?.enabledPlugins?.["agent-kit@agent-kit"] === true, "plugin enabled in .claude/settings.json", "re-run init")
  ok(
    PROJECT_SCOPES.every((s) => existsSync(join(dir, ".knowledge", s))),
    "knowledge scopes exist",
    "re-run init",
  )
  const gitignore = existsSync(join(dir, ".gitignore")) ? readFileSync(join(dir, ".gitignore"), "utf8") : ""
  ok(gitignore.split("\n").includes(".knowledge/local/"), ".knowledge/local/ is gitignored", "re-run init")
  process.env.CLAUDE_PROJECT_DIR = dir
  const k = check()
  ok(k.errors.length === 0, `knowledge valid (${k.count} entries, ${k.errors.length} errors, ${k.warnings.length} warnings)`, "agent-kit knowledge check")
  ok(
    !cfg.kitVersion || cfg.kitVersion === KIT_VERSION,
    `project set up with agent-kit ${cfg.kitVersion ?? "?"} (this CLI: ${KIT_VERSION})`,
    "re-run init to upgrade the agent layer",
  )
  const budget = cfg.contextBudget ?? 8000
  const ctx = estimate(dir)
  ok(ctx.total <= budget, `session context ≈ ${ctx.total.toLocaleString("en")} tokens (budget ${budget.toLocaleString("en")})`, "agent-kit context — see what to move out")
  ok(ctx.invisible.length === 0, `all installed skills visible to Claude Code${ctx.invisible.length ? ` (${ctx.invisible.length} not)` : ""}`, "agent-kit context — symlink them into ~/.claude/skills")
  if (cfg.commitConvention === "conventional" && existsSync(join(dir, "package.json"))) {
    const pkg = readJson(join(dir, "package.json")) ?? {}
    ok(Boolean(pkg.devDependencies?.["@commitlint/cli"] && existsSync(join(dir, "commitlint.config.mjs"))), "commitlint configured", "re-run init")
    ok(existsSync(join(dir, ".husky", "commit-msg")), "commit-msg hook file present", "re-run init")
    const { spawnSync } = await import("node:child_process")
    const hooksPath = spawnSync("git", ["-C", dir, "config", "--get", "core.hooksPath"], { encoding: "utf8" }).stdout.trim()
    ok(hooksPath.includes(".husky"), `git hooks active${hooksPath ? ` (${hooksPath})` : ""}`, "run npm install (husky sets core.hooksPath)")
  }
  const mcp = readJson(join(dir, ".mcp.json"))?.mcpServers?.supabase
  if (mcp) ok(/read_only=true/.test(mcp.url ?? "") || (mcp.args ?? []).includes("--read-only"), "Supabase MCP server is read-only", "agents could write to the database — add read_only=true")
  const sc = checkScripts(dir)
  ok(sc.errors.length === 0, `scripts documented (${sc.count} scripts, ${sc.errors.length} errors, ${sc.warnings.length} warnings)`, "agent-kit scripts check")
  const g = globalKnowledge()
  ok(Boolean(g), g ? `global knowledge: ${g.dir}${g.writable ? "" : " (read-only)"}` : "global knowledge found", "agent-kit setup")
  const marketplaces = readJson(join(homedir(), ".claude", "plugins", "known_marketplaces.json")) ?? {}
  ok("agent-kit" in marketplaces, "agent-kit marketplace known to Claude Code", "open claude in the project and accept the plugin, or /plugin marketplace add")

  for (const r of results) console.log(`${r.pass ? "✓" : "✗"} ${r.label}${r.pass || !r.fix ? "" : `  → ${r.fix}`}`)
  return results.every((r) => r.pass) ? 0 : 1
}

async function run() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === "knowledge") return knowledgeMain(rest)
  if (cmd === "scripts") return scriptsMain(rest)
  if (cmd === "tdd") return tddMain(rest)
  if (cmd === "work") return workMain(rest)
  if (cmd === "commit") return commitMain(rest)
  if (cmd === "context") return contextMain(rest)
  if (cmd === "usage") return usageMain(rest)
  if (cmd === "preflight") {
    const { spawnSync } = await import("node:child_process")
    const script = fileURLToPath(new URL("../plugin/scripts/preflight.mjs", import.meta.url))
    return spawnSync("node", [script, ...rest], { stdio: "inherit" }).status ?? 1
  }
  const { args, flags } = parse(rest)
  if (cmd === "init") return init(args[0], flags)
  if (cmd === "setup") return setup(flags)
  if (cmd === "upgrade") return upgrade(args[0], flags)
  if (cmd === "uninstall") return uninstall(args[0], { dryRun: Boolean(flags["dry-run"]) })
  if (cmd === "doctor") return await doctor(args[0], flags)
  if (cmd === "--version" || cmd === "-v")
    return console.log(readJson(fileURLToPath(new URL("../package.json", import.meta.url))).version), 0
  console.log(HELP)
  return cmd && cmd !== "help" && cmd !== "--help" ? 2 : 0
}

run().then(
  (code) => process.exit(code ?? 0),
  (e) => {
    console.error(`agent-kit: ${e.message}`)
    process.exit(1)
  },
)
