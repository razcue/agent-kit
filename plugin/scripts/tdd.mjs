#!/usr/bin/env node
// TDD support: which changed logic files have no test, and a compact run of only
// the tests related to the current changes.
//
//   node tdd.mjs status [base]
//   node tdd.mjs run [test files...] [--all] [--base <branch>] [--lines N]
import { existsSync } from "node:fs"
import { basename, dirname, extname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { collectChanges, repoFiles, repoRoot } from "./changes.mjs"
import { STATE_DIR, findProjectDir, readJson, readProject } from "./config.mjs"
import { runCompact } from "./run.mjs"

const LOGIC = /\.(ts|mts|mjs|js|cjs)$/
const NOT_LOGIC =
  /(\.(test|spec)\.\w+$|\.d\.ts$|(^|\/)[^/]+\.config\.\w+$|(^|\/)(node_modules|\.nuxt|\.output|dist|migrations)\/|(^|\/)\.[^/]+\/)/

export const isTest = (file) => /\.(test|spec)\.\w+$/.test(file)

/** Glob with `*` = one path segment, `**` = any depth; a pattern ending in / matches a prefix. */
export function matches(file, pattern) {
  const re = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replaceAll("\0", ".*")
  return new RegExp(`^${re}${pattern.endsWith("/") ? "" : "$"}`).test(file)
}

export const isLogic = (file, ignore = []) =>
  LOGIC.test(file) && !NOT_LOGIC.test(file) && !ignore.some((p) => matches(file, p))

/** Tests that cover `file` by name: x.test.*, x.spec.*, __tests__/x.* (any folder). */
export function testsFor(file, files) {
  const stem = basename(file, extname(file))
  return files.filter(
    (f) =>
      isTest(f) &&
      (basename(f).startsWith(`${stem}.test.`) || basename(f).startsWith(`${stem}.spec.`) || f.startsWith(`${dirname(file)}/__tests__/${stem}.`)),
  )
}

export function tddStatus({ status, files, ignore = [] }) {
  const rows = []
  for (const [file, st] of status) {
    if (st === "D" || !isLogic(file, ignore)) continue
    const tests = testsFor(file, files)
    rows.push({ file, st, tests, testChanged: tests.some((t) => status.has(t)) })
  }
  const changedTests = [...status].filter(([f, st]) => isTest(f) && st !== "D").map(([f]) => f)
  return {
    rows,
    untested: rows.filter((r) => !r.tests.length),
    notUpdated: rows.filter((r) => r.tests.length && !r.testChanged),
    changedTests,
  }
}

export function projectTestConfig(root) {
  const cfg = readProject(findProjectDir(root)) ?? {}
  return { methodology: cfg.methodology ?? "sdd", ignore: cfg.testIgnore ?? [], testCommand: cfg.testCommand }
}

function testCommand(root, configured) {
  if (configured) return configured.split(/\s+/)
  const pkg = readJson(join(root, "package.json"))
  if (pkg?.scripts?.test) return ["npm", "test", "--"]
  throw new Error('no test command: add "testCommand" to agent-kit.json or a "test" script to package.json')
}

export function main(argv) {
  const [cmd, ...rest] = argv
  const flags = {}
  const args = []
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) args.push(rest[i])
    else if (["--base", "--lines"].includes(rest[i])) flags[rest[i].slice(2)] = rest[++i]
    else flags[rest[i].slice(2)] = true
  }
  const root = repoRoot()
  if (!root) {
    console.error("tdd: not a git repository")
    return 2
  }
  const cfg = projectTestConfig(root)

  if (cmd === "status") {
    const changes = collectChanges(root, args[0] ?? flags.base)
    const s = tddStatus({ status: changes.status, files: repoFiles(root), ignore: cfg.ignore })
    console.log(`# TDD status vs ${changes.label} (method: ${cfg.methodology})\n`)
    if (!s.rows.length) console.log("No changed logic files.")
    for (const r of s.rows)
      console.log(
        `- ${r.file} — ${r.tests.length ? `${r.tests.join(", ")} (${r.testChanged ? "updated" : "not updated"})` : "✗ no test"}`,
      )
    if (s.changedTests.length) console.log(`\nChanged tests: ${s.changedTests.join(", ")}`)
    if (s.untested.length) console.log(`\n${s.untested.length} changed logic file(s) without a test.`)
    return 0
  }

  if (cmd === "run") {
    let files = args
    if (!files.length && !flags.all) {
      const changes = collectChanges(root, flags.base)
      const s = tddStatus({ status: changes.status, files: repoFiles(root), ignore: cfg.ignore })
      files = [...new Set([...s.changedTests, ...s.rows.flatMap((r) => r.tests)])].filter((f) => existsSync(join(root, f)))
      if (!files.length) {
        console.log("No tests related to the current changes. Use --all for the full suite.")
        return 0
      }
    }
    const [bin, ...pre] = testCommand(root, cfg.testCommand)
    const r = runCompact({
      cmd: bin,
      args: [...pre, ...(flags.all ? [] : files)],
      cwd: root,
      label: "tests",
      logDir: join(findProjectDir(root) ?? root, STATE_DIR, "runs"),
      maxLines: Number(flags.lines) || 60,
    })
    console.log(r.text)
    return r.code
  }

  console.log("usage: tdd.mjs status [base] | run [test files...] [--all] [--base b] [--lines N]")
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (e) {
    console.error(`tdd: ${e.message}`)
    process.exit(1)
  }
}
