#!/usr/bin/env node
// Stop hook: after every turn (sync: async hooks are dropped when a headless run exits), saves where the work stands so the next
// session can resume — branch, changed files, active work. Silent; never fails.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { git, tryGit } from "./changes.mjs"
import { STATE_DIR, findProjectDir, hookLog } from "./config.mjs"
import { ACTIVE, collectWork } from "./work.mjs"

export function snapshot(project) {
  let porcelain = ""
  try {
    // untrimmed: porcelain columns are fixed-width (" M file")
    porcelain = git(project, ["status", "--porcelain", "--untracked-files=all"])
  } catch {
    /* not a git repo */
  }
  const changed = porcelain.split("\n").filter(Boolean)
  return {
    at: new Date().toISOString(),
    branch: tryGit(project, ["rev-parse", "--abbrev-ref", "HEAD"]),
    head: tryGit(project, ["rev-parse", "--short", "HEAD"]),
    changedCount: changed.length,
    changed: changed.slice(0, 30).map((l) => l.slice(3)),
    active: collectWork(project)
      .filter((w) => ACTIVE.has(w.status))
      .map(({ kind, id, status, done, total, next }) => ({ kind, id, status, done, total, next })),
  }
}

function main() {
  try {
    const project = findProjectDir()
    hookLog("Stop", project ?? "(no project)")
    if (!project) return
    mkdirSync(join(project, STATE_DIR), { recursive: true })
    writeFileSync(join(project, STATE_DIR, "checkpoint.json"), `${JSON.stringify(snapshot(project), null, 2)}\n`)
  } catch {
    // a checkpoint must never disturb the session
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main()
