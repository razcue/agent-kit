// What changed since the base branch: committed + staged + unstaged + untracked.
// Shared by preflight.mjs and tdd.mjs. Read-only git.
import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { findProjectDir, readProject } from "./config.mjs"

export const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

export function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  })
}

export function tryGit(root, args) {
  try {
    return git(root, args).trim()
  } catch {
    return null
  }
}

export const repoRoot = (cwd = process.cwd()) => tryGit(cwd, ["rev-parse", "--show-toplevel"])

/** Added lines per file from a -U0 unified diff: Map<file, [{ line, text }]> */
export function addedLines(diff) {
  const files = new Map()
  let file = null
  let n = 0
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.slice(6)
      if (file && !files.has(file)) files.set(file, [])
      continue
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      n = Number(hunk[1])
      continue
    }
    if (file && raw.startsWith("+") && !raw.startsWith("+++")) files.get(file).push({ line: n++, text: raw.slice(1) })
  }
  return files
}

/**
 * @returns {{ status: Map<string,string>, added: Map<string,{line:number,text:string}[]>, label: string }}
 * status: A/M/D from git, "?" for untracked.
 */
export function collectChanges(root, baseArg) {
  const base = baseArg || readProject(findProjectDir(root))?.mainBranch || "main"
  // No commits yet → compare against git's empty tree.
  const head = tryGit(root, ["rev-parse", "--verify", "-q", "HEAD"]) ? "HEAD" : EMPTY_TREE
  const mergeBase =
    tryGit(root, ["merge-base", "HEAD", base]) ?? tryGit(root, ["merge-base", "HEAD", `origin/${base}`]) ?? head

  const status = new Map()
  for (const row of git(root, ["diff", "--name-status", "--no-renames", mergeBase]).split("\n").filter(Boolean)) {
    const [st, file] = row.split("\t")
    status.set(file, st)
  }
  const added = addedLines(git(root, ["diff", "-U0", "--no-color", "--no-renames", mergeBase]))
  for (const file of git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) {
    status.set(file, "?")
    const path = join(root, file)
    if (statSync(path).size > 1024 * 1024) continue
    const text = readFileSync(path, "utf8")
    if (text.includes("\0")) continue
    added.set(file, text.split("\n").map((t, i) => ({ line: i + 1, text: t })))
  }
  const label =
    mergeBase === "HEAD"
      ? "HEAD (uncommitted only)"
      : mergeBase === EMPTY_TREE
        ? "empty repository"
        : `${base} @ ${mergeBase.slice(0, 8)}`
  return { status, added, label }
}

/** Every file in the working tree that git would track (tracked + untracked, not ignored). */
export function repoFiles(root) {
  return git(root, ["ls-files", "--cached", "--others", "--exclude-standard"]).split("\n").filter(Boolean)
}
