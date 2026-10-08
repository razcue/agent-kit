#!/usr/bin/env node
// Estimates the context loaded into EVERY Claude Code session of a project
// (CLAUDE.md chain + imports, memory index, agent-kit session context, skill
// listings) and finds skills Claude Code can't see. ~4 characters per token.
//
//   node context.mjs [dir] [--budget 8000]      exit 1 over budget
//   node context.mjs [dir] --sections            cost of every heading in the CLAUDE.md chain
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { PLUGIN_ROOT, findProjectDir, readJson, readProject } from "./config.mjs"
import { parseFrontmatter } from "./knowledge.mjs"

export const tokens = (chars) => Math.ceil(chars / 4)
const HOME = homedir()

/** `@path` imports of a CLAUDE.md text (not emails, not inside code). */
export function importsOf(text) {
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "")
  return [...prose.matchAll(/(?:^|\s)@((?:~\/|\.{1,2}\/|\/)?[\w.-]+(?:\/[\w.-]+)*)/g)]
    .map((m) => m[1])
    .filter((p) => p.includes("/") || /\.(md|txt)$/i.test(p))
}

/** Splits Markdown into heading sections (any level ≤ 3) with their token cost. */
export function sections(text, file) {
  const out = []
  let current = { file, heading: "(before first heading)", chars: 0, lines: 0 }
  let fence = false
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence
    const h = !fence && line.match(/^(#{1,3}) (.+)$/)
    if (h) {
      if (current.chars) out.push(current)
      current = { file, heading: `${"#".repeat(h[1].length)} ${h[2].trim()}`, chars: 0, lines: 0 }
    }
    current.chars += line.length + 1
    current.lines++
  }
  if (current.chars) out.push(current)
  return out.map((s) => ({ ...s, tokens: tokens(s.chars) }))
}

/** Every file of the project's CLAUDE.md chain (ancestors + imports), in load order. */
export function chainFiles(project) {
  const files = []
  const visit = (file, depth = 0) => {
    if (files.includes(file) || !existsSync(file) || depth > 4) return
    files.push(file)
    for (const p of importsOf(readFileSync(file, "utf8")))
      visit(p.startsWith("~/") ? join(HOME, p.slice(2)) : resolve(dirname(file), p), depth + 1)
  }
  for (let dir = project; ; dir = dirname(dir)) {
    for (const name of ["CLAUDE.md", "CLAUDE.local.md", join(".claude", "CLAUDE.md")]) visit(join(dir, name))
    if (dirname(dir) === dir) break
  }
  visit(join(HOME, ".claude", "CLAUDE.md"))
  return files
}

function readWithImports(file, seen = new Set(), depth = 0) {
  if (seen.has(file) || !existsSync(file) || depth > 4) return 0
  seen.add(file)
  const text = readFileSync(file, "utf8")
  let chars = text.length
  for (const p of importsOf(text)) {
    const target = p.startsWith("~/") ? join(HOME, p.slice(2)) : resolve(dirname(file), p)
    chars += readWithImports(target, seen, depth + 1)
  }
  return chars
}

function skillDirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((name) => ({ name, file: join(dir, name, "SKILL.md") }))
    .filter((s) => existsSync(s.file))
}

function listingChars(file) {
  const { data } = parseFrontmatter(readFileSync(file, "utf8"))
  return `- ${data.name ?? ""}: ${data.description ?? ""}`.length
}

export function estimate(project) {
  const items = []
  const add = (source, chars) => chars > 0 && items.push({ source, chars, tokens: tokens(chars) })

  // CLAUDE.md chain: every ancestor folder, plus the user's global file.
  const seen = new Set()
  for (let dir = project; ; dir = dirname(dir)) {
    for (const name of ["CLAUDE.md", "CLAUDE.local.md", join(".claude", "CLAUDE.md")]) {
      const file = join(dir, name)
      const chars = readWithImports(file, seen)
      add(`${file.replace(HOME, "~")} (+ imports)`, chars)
    }
    if (dirname(dir) === dir) break
  }
  add("~/.claude/CLAUDE.md (+ imports)", readWithImports(join(HOME, ".claude", "CLAUDE.md"), seen))

  // Auto-memory index (first 200 lines).
  const memory = join(HOME, ".claude", "projects", project.replace(/[^A-Za-z0-9]/g, "-"), "memory", "MEMORY.md")
  if (existsSync(memory)) add("auto-memory MEMORY.md", readFileSync(memory, "utf8").split("\n").slice(0, 200).join("\n").length)

  // agent-kit SessionStart context.
  if (readProject(findProjectDir(project))) {
    const r = spawnSync("node", [join(PLUGIN_ROOT, "scripts", "session-start.mjs")], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      encoding: "utf8",
    })
    try {
      add("agent-kit session context", JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length)
    } catch {
      /* not an agent-kit session */
    }
  }

  // Skill listings (name + description of every visible skill).
  const visible = new Map()
  const settings = readJson(join(project, ".claude", "settings.json")) ?? {}
  const sources = [
    ["~/.claude/skills", join(HOME, ".claude", "skills")],
    ["project .claude/skills", join(project, ".claude", "skills")],
  ]
  if (settings.enabledPlugins?.["agent-kit@agent-kit"]) sources.push(["agent-kit plugin skills", join(PLUGIN_ROOT, "skills")])
  for (const [label, dir] of sources) {
    const skills = skillDirs(dir)
    for (const s of skills) visible.set(s.name, s.file)
    add(`${label} (${skills.length} listed)`, skills.reduce((n, s) => n + listingChars(s.file), 0))
  }

  // Skills installed for other agents that Claude Code doesn't load.
  const invisible = []
  for (const dir of [join(HOME, ".agents", "skills"), join(project, ".agents", "skills")])
    for (const s of skillDirs(dir)) if (!visible.has(s.name)) invisible.push({ name: s.name, path: join(dir, s.name) })

  const otherPlugins = Object.entries({
    ...(readJson(join(HOME, ".claude", "settings.json"))?.enabledPlugins ?? {}),
    ...settings.enabledPlugins,
  })
    .filter(([id, on]) => on && id !== "agent-kit@agent-kit")
    .map(([id]) => id)

  items.sort((a, b) => b.chars - a.chars)
  return { items, total: items.reduce((n, i) => n + i.tokens, 0), invisible, otherPlugins }
}

export function main(argv) {
  const budgetIdx = argv.indexOf("--budget")
  const target = argv.find((a, i) => !a.startsWith("--") && (budgetIdx === -1 || i !== budgetIdx + 1))
  const project = resolve(target ?? findProjectDir() ?? ".")
  if (argv.includes("--sections")) {
    const all = chainFiles(project).flatMap((f) => sections(readFileSync(f, "utf8"), f.replace(HOME, "~")))
    console.log(`# Section cost of the CLAUDE.md chain — ${project.replace(HOME, "~")}\n`)
    console.log("| ~tokens | lines | Section | File |\n|---:|---:|---|---|")
    for (const s of [...all].sort((a, b) => b.tokens - a.tokens).slice(0, 40))
      console.log(`| ${s.tokens.toLocaleString("en")} | ${s.lines} | ${s.heading.replace(/\|/g, "\\|")} | ${s.file} |`)
    console.log(`\nTotal ≈ ${all.reduce((n, s) => n + s.tokens, 0).toLocaleString("en")} tokens in ${all.length} sections (top 40 shown). Use the \`adopt\` skill to move them out.`)
    return 0
  }
  const budget = Number(budgetIdx !== -1 ? argv[budgetIdx + 1] : readProject(findProjectDir(project))?.contextBudget) || 8000
  const { items, total, invisible, otherPlugins } = estimate(project)

  console.log(`# Context loaded every session — ${project.replace(HOME, "~")}\n`)
  console.log("| Source | ~tokens |\n|---|---:|")
  for (const i of items) console.log(`| ${i.source} | ${i.tokens.toLocaleString("en")} |`)
  console.log(`\n**Total ≈ ${total.toLocaleString("en")} tokens** (budget ${budget.toLocaleString("en")}) → ${total > budget ? "OVER — move details into skills, .knowledge/ or folder CLAUDE.md files" : "OK"}`)
  console.log(`Not measured: Claude Code's own prompt, MCP tool schemas${otherPlugins.length ? `, plugins: ${otherPlugins.join(", ")}` : ""}.`)
  if (invisible.length) {
    console.log(`\n## Skills Claude Code can't see (${invisible.length})\n`)
    for (const s of invisible) console.log(`- ${s.name} → \`ln -s ${s.path.replace(HOME, "~")} ~/.claude/skills/${s.name}\``)
  }
  return total > budget ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
