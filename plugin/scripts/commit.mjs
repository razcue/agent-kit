#!/usr/bin/env node
// Conventional Commit helpers for agents.
//
//   node commit.mjs draft [--staged]        changed files → suggested scope(s) and type
//   node commit.mjs check "<message>"       validate: project commitlint if installed,
//   node commit.mjs check --file <path>     else the built-in rules below (exit 1 = invalid)
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { git, repoRoot } from "./changes.mjs"

export const TYPES = ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"]
export const HEADER_MAX = 72

/**
 * The error-level rules of @commitlint/config-conventional (header limited to 72),
 * without dependencies — used when the project has no commitlint and by the git
 * guard. Parity with real commitlint is pinned in test/commit.test.mjs.
 * @returns {string[]} problems; empty when valid
 */
export function lint(message) {
  const lines = message.replace(/\r/g, "").replace(/\n+$/, "").split("\n").filter((l) => !l.startsWith("#"))
  const header = lines[0] ?? ""
  const problems = []
  const m = header.match(/^(\w+)(?:\(([^)]+)\))?(!)?: (.*)$/)
  if (!header.trim()) return ["message is empty"]
  if (header.length > HEADER_MAX) problems.push(`header is ${header.length} characters (max ${HEADER_MAX})`)
  if (!m) {
    problems.push('header must be "type(scope): subject", e.g. "feat(app): add invoice export"')
    return problems
  }
  const [, type, , , subject] = m
  if (type !== type.toLowerCase()) problems.push(`type "${type}" must be lower-case`)
  if (!TYPES.includes(type.toLowerCase())) problems.push(`type "${type}" must be one of ${TYPES.join(", ")}`)
  if (!subject.trim()) problems.push("subject is empty")
  else {
    if (subject.endsWith(".")) problems.push("subject must not end with a period")
    // commitlint counts any capital first letter as sentence-case, acronyms included.
    if (/^[A-Z]/.test(subject))
      problems.push("subject must start lower-case (imperative: \"add …\", not \"Added …\"; put acronyms later: \"rotate API keys\")")
    if (subject === subject.toUpperCase() && /[A-Z]/.test(subject) && subject.split(/\s+/).length > 1)
      problems.push("subject must not be upper-case")
  }
  for (const [i, l] of lines.entries()) if (i > 0 && l.length > 100) problems.push(`line ${i + 1} is longer than 100 characters`)
  return problems
}

/** Commit scope suggested by a path in the agent-kit layouts. */
export function scopeOf(file) {
  const m = file.match(/^(apps|packages)\/([^/]+)\//)
  if (m) return m[2]
  if (/^supabase\/|(^|\/)migrations\//.test(file)) return "db"
  if (/^scripts\//.test(file)) return "scripts"
  if (/^(\.knowledge|work|docs)\//.test(file)) return "docs"
  if (/^\.github\//.test(file)) return "ci"
  if (/^content\//.test(file)) return "content"
  if (/^app\//.test(file)) return "site"
  return null
}

/** A type when the files alone decide it; null when it needs judgment (feat/fix/refactor). */
export function suggestType(files) {
  if (!files.length) return null
  if (files.every((f) => /\.(test|spec)\.\w+$/.test(f))) return "test"
  if (files.every((f) => /^\.github\//.test(f))) return "ci"
  if (files.every((f) => /(^|\/)(package(-lock)?\.json)$/.test(f))) return "build"
  if (files.every((f) => /\.md$/.test(f) || /^(\.knowledge|work|docs)\//.test(f))) return "docs"
  return null
}

function commitlintCheck(root, message) {
  const bin = join(root, "node_modules", ".bin", "commitlint")
  if (!existsSync(bin)) return null
  const r = spawnSync(bin, [], { cwd: root, input: message, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } })
  return { ok: r.status === 0, output: `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "").trim() }
}

export function main(argv) {
  const [cmd, ...rest] = argv
  const root = repoRoot() ?? process.cwd()
  if (cmd === "check") {
    const fileIdx = rest.indexOf("--file")
    const message = fileIdx !== -1 ? readFileSync(rest[fileIdx + 1], "utf8") : rest.join(" ")
    const viaCommitlint = commitlintCheck(root, message)
    if (viaCommitlint) {
      console.log(viaCommitlint.ok ? "✓ commitlint: valid" : viaCommitlint.output)
      return viaCommitlint.ok ? 0 : 1
    }
    const problems = lint(message)
    console.log(problems.length ? `✗ ${problems.join("\n✗ ")}` : "✓ valid (built-in Conventional Commits rules; commitlint not installed)")
    return problems.length ? 1 : 0
  }
  if (cmd === "draft") {
    const staged = rest.includes("--staged")
    let files = git(root, ["diff", "--name-only", ...(staged ? ["--cached"] : ["HEAD"])]).split("\n").filter(Boolean)
    if (!staged) files = [...new Set([...files, ...git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)])]
    if (!files.length) {
      console.log(staged ? "Nothing staged." : "No changes.")
      return 0
    }
    const scopes = new Map()
    for (const f of files) {
      const s = scopeOf(f) ?? "(root)"
      scopes.set(s, [...(scopes.get(s) ?? []), f])
    }
    console.log(`# ${staged ? "Staged" : "Changed"} files: ${files.length}\n`)
    for (const [s, list] of scopes) console.log(`- ${s}: ${list.slice(0, 6).join(", ")}${list.length > 6 ? `, … (${list.length})` : ""}`)
    const named = [...scopes.keys()].filter((s) => s !== "(root)")
    const type = suggestType(files)
    console.log(`\nSuggested: ${type ?? "<feat|fix|refactor|…>"}${named.length === 1 ? `(${named[0]})` : ""}: <imperative subject, ≤ ${HEADER_MAX} chars>`)
    if (scopes.size > 2) console.log("Several areas changed: consider one commit per area.")
    return 0
  }
  console.log('usage: commit.mjs draft [--staged] | check "<message>" | check --file <path>')
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
