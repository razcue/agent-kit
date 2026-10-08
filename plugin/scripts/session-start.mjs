#!/usr/bin/env node
// SessionStart hook: injects the project profile (voice, language, git flow,
// method, work lanes), a compact knowledge index and the script index.
// Silent outside agent-kit projects.
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { STATE_DIR, compareVersions, findProjectDir, globalKnowledge, hookLog, pluginVersion, readProject } from "./config.mjs"
import { collect } from "./knowledge.mjs"
import { collectScripts } from "./scripts.mjs"
import { ACTIVE, collectWork } from "./work.mjs"

// Claude Code caps a hook's additionalContext at 10,000 characters; stay under it.
export const CONTEXT_LIMIT = 9_500
const clip = (text, n = 160) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

/**
 * Renders the session context within `limit` characters. When too long it collapses,
 * in order: global knowledge groups (largest first), the scripts list, project
 * groups (largest first) — collapsed parts keep a count and point to `find`.
 */
export function renderContext({ head, groups, scriptsHead, scripts }, limit = CONTEXT_LIMIT) {
  const open = new Set(groups.map((g) => g.key))
  let scriptsOpen = true
  const render = () =>
    [
      ...head,
      ...(groups.length ? [] : ["_(no entries yet)_"]),
      ...groups.flatMap((g) =>
        open.has(g.key)
          ? [`### ${g.key}`, ...g.items.map((e) => `- ${e.name} — ${clip(e.summary)}`)]
          : [`### ${g.key} — ${g.items.length} entries (use find)`],
      ),
      "",
      ...scriptsHead,
      ...(scripts.length === 0
        ? ["_(no scripts yet)_"]
        : scriptsOpen
          ? scripts.map((s) => `- ${s.origin}/${s.name} — ${clip(s.summary || "(undocumented)")}`)
          : [`- ${scripts.length} scripts (use find)`]),
    ].join("\n")
  const bySize = (list) => [...list].sort((a, b) => b.items.length - a.items.length)
  const steps = [
    ...bySize(groups.filter((g) => g.origin === "global")).map((g) => () => open.delete(g.key)),
    () => (scriptsOpen = false),
    ...bySize(groups.filter((g) => g.origin !== "global")).map((g) => () => open.delete(g.key)),
  ]
  let text = render()
  for (const step of steps) {
    if (text.length <= limit) break
    step()
    text = render()
  }
  const note = "\n… (context truncated — use knowledge.mjs find / scripts.mjs find)"
  return text.length <= limit ? text : text.slice(0, limit - note.length) + note
}
const STACK = {
  "nuxt-supabase": "Nuxt 4 + shadcn-vue + Tailwind v4 + Supabase monorepo (`stack-nuxt-supabase` skill)",
  "nuxt-content-site": "one Nuxt static site with Markdown pages in content/ (global knowledge `nuxt-content-site`)",
}

/** One line when the plugin is newer than the project's setup, else null. */
export function driftNotice(projectVersion, plugin) {
  if (!plugin || !projectVersion || compareVersions(plugin, projectVersion) <= 0) return null
  return `agent-kit ${plugin} is newer than this project's setup (${projectVersion}). Suggest to the user, once: \`npx @razcue/agent-kit upgrade\` (asks only new questions, shows what's new).`
}

/** "Where we left off": last checkpoint + active work with its next task. */
export function resumeSection(dir, now = Date.now()) {
  const out = []
  const file = join(dir, STATE_DIR, "checkpoint.json")
  if (existsSync(file)) {
    try {
      const c = JSON.parse(readFileSync(file, "utf8"))
      const mins = Math.round((now - Date.parse(c.at)) / 60_000)
      const ago = mins < 90 ? `${mins} min` : mins < 2880 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`
      out.push(
        `Last session ended ${ago} ago on \`${c.branch}\` (${c.head ?? "no commits"}), ${c.changedCount} uncommitted file(s)${c.changed?.length ? `: ${c.changed.slice(0, 8).join(", ")}${c.changedCount > 8 ? ", …" : ""}` : ""}.`,
      )
    } catch {
      /* unreadable checkpoint: skip */
    }
  }
  for (const w of collectWork(dir).filter((w) => ACTIVE.has(w.status)))
    out.push(`- ${w.kind} \`${w.path}\` — ${w.status}${w.total ? `, ${w.done}/${w.total} tasks` : ""}${w.next ? `; next: ${w.next}` : ""}`)
  return out.length ? ["## Resume", ...out, "If the user's request continues this work, pick up from the next task.", ""] : []
}

const VOICE = {
  technical: "The user is an experienced web developer: be concise and technical.",
  "non-technical": [
    "The user is NOT a developer. Use plain everyday words; explain any unavoidable technical term in a few words.",
    "Never ask them to choose technologies, libraries or architecture: decide with the project stack and knowledge, and state the decision in one plain sentence.",
    "Ask about goals, content and look, not implementation. After each change say what they will see and how to check it.",
    "Before anything risky or hard to undo, explain the consequence simply and ask first.",
  ].join("\n"),
}

const LANGUAGE = {
  en: "Reply in English.",
  es: "Reply in Spanish. Keep code, identifiers, file names and commit messages in English.",
}

const METHOD = {
  "sdd-tdd":
    "Method: SDD + TDD — tests first (`tdd` skill): a failing test before each behaviour change, done only when it passes; preflight blocks changed logic without a test.",
  sdd: "Method: SDD — verify every acceptance criterion with a test or a reproducible check; tests are written where logic warrants them.",
}

const GIT = {
  "read-only": "read-only for agents — never run git commands that change the repo; the user runs them",
  trunk: "trunk — commit on the main branch; no force-push or hard reset",
  pr: "branches + pull requests — never commit or push on main/master; work on a feature branch",
}

function main() {
  const dir = findProjectDir()
  hookLog("SessionStart", dir ?? "(no project)")
  const project = readProject(dir)
  if (!project) return

  const out = [
    `# agent-kit · ${project.name}`,
    "",
    VOICE[project.technicalLevel] ?? VOICE.technical,
    LANGUAGE[project.language] ?? LANGUAGE.en,
    `Git flow: ${GIT[project.gitFlow] ?? project.gitFlow} (enforced by a hook).`,
    METHOD[project.methodology] ?? METHOD.sdd,
    ...(project.commitConvention === "conventional"
      ? ["Commits: Conventional Commits in English (`type(scope): subject`, ≤ 72 chars), checked by commitlint — use the `commit` skill; never `--no-verify`."]
      : []),
    ...(STACK[project.stack] ? [`Stack: ${STACK[project.stack]}.`] : []),
    ...[driftNotice(project.kitVersion, pluginVersion())].filter(Boolean),
    "",
    "Work lanes — name the lane before starting:",
    "- Answer: questions and exploration, read-only.",
    "- Fast-track (`feature` skill): ≤3 files and no schema, permission or money change.",
    "- Spec (`spec` skill): anything bigger or riskier; the user approves the spec before code.",
    "",
  ]

  out.push(...resumeSection(dir))

  const entries = collect().filter((e) => e.status === "active" || e.status === "proposed")
  const g = globalKnowledge()
  const finder = join(import.meta.dirname, "knowledge.mjs")
  out.push(
    "## Knowledge index",
    `Open an entry only when relevant. Project entries: \`.knowledge/<scope>/<name>.md\`; global: \`${g?.dir ?? "(not configured)"}/<scope>/<name>.md\`.`,
    `Search: \`node "${finder}" find <words> [--body]\` (agent-kit scripts folder: \`${import.meta.dirname}\`). Record facts with the \`knowledge\` skill, decisions with \`decide\`.`,
    "",
  )
  const groups = new Map()
  for (const e of entries) {
    const key = `${e.origin}/${e.scope}`
    if (!groups.has(key)) groups.set(key, { key, origin: e.origin, items: [] })
    groups.get(key).items.push(e)
  }
  const scripts = collectScripts(dir).filter((s) => s.origin !== "library" || s.documented)
  const text = renderContext({
    head: out,
    groups: [...groups.values()],
    scriptsHead: [
      "## Scripts",
      `Before writing a script use the \`scripts\` skill (search first: \`node "${join(import.meta.dirname, "scripts.mjs")}" find <words>\`). Run with \`scripts.mjs run <name>\`.`,
    ],
    scripts,
  })
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main()
