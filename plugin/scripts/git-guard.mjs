#!/usr/bin/env node
// PreToolUse(Bash) hook: blocks git commands the project's git flow forbids.
// Exit 2 blocks the call and shows stderr to Claude. Silent outside agent-kit projects.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { lint } from "./commit.mjs"
import { READ_ONLY, READ_ONLY_FORMS } from "./git-rules.mjs"
import { findProjectDir, hookLog, readProject } from "./config.mjs"


const ON_BRANCH = new Set(["commit", "merge", "rebase", "cherry-pick", "revert", "am"])

/** Minimal shell tokenizer: splits on whitespace, honours quotes. */
function tokenize(segment) {
  return [...segment.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
}

/** Splits a command line on && || ; | and newlines, outside quotes and $( ). */
export function splitSegments(command) {
  const out = []
  let cur = ""
  let quote = null
  let depth = 0
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    const two = command.slice(i, i + 2)
    if (quote) {
      if (c === "\\" && quote === '"') {
        cur += c + (command[++i] ?? "")
        continue
      }
      if (c === quote) quote = null
      if (quote === '"' && two === "$(") depth++
      cur += c
      continue
    }
    if (c === "'" || c === '"') quote = c
    else if (two === "$(") depth++
    else if (c === ")" && depth > 0) depth--
    if (depth === 0 && !quote && (two === "&&" || two === "||")) {
      out.push(cur)
      cur = ""
      i++
      continue
    }
    if (depth === 0 && !quote && (c === ";" || c === "|" || c === "\n")) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

/** Inner commands of $( … ) and backticks in a segment. */
function substitutions(segment) {
  const inner = []
  for (let i = 0; i < segment.length; i++) {
    if (segment.slice(i, i + 2) === "$(") {
      let depth = 1
      let j = i + 2
      for (; j < segment.length && depth; j++) {
        if (segment.slice(j, j + 2) === "$(") depth++
        else if (segment[j] === ")") depth--
      }
      inner.push(segment.slice(i + 2, j - 1))
      i = j - 1
    }
  }
  for (const m of segment.matchAll(/`([^`]*)`/g)) inner.push(m[1])
  return inner
}

const PREFIXES = new Set(["sudo", "command", "exec", "env", "time", "nohup", "nice", "builtin"])
const SHELLS = /(^|\/)(ba|z|da|k)?sh$/

/** Every git invocation in a Bash command, with the folder it runs in — also inside
 * `bash -c`, `eval`, `xargs`, $( ) and backticks. */
export function gitCalls(command, cwd, depth = 0) {
  const calls = []
  if (depth > 4) return calls
  let dir = cwd
  for (const segment of splitSegments(command)) {
    for (const inner of substitutions(segment)) calls.push(...gitCalls(inner, dir, depth + 1))
    const t = tokenize(segment)
    for (;;) {
      if (t.length && (/^\w+=/.test(t[0]) || PREFIXES.has(t[0]))) t.shift()
      else if (t[0] === "timeout" && t.length > 1) t.splice(0, /^\d/.test(t[1]) ? 2 : 1)
      else break
    }
    if (t[0] === "cd" && t[1]) {
      dir = resolve(dir, t[1])
      continue
    }
    if (SHELLS.test(t[0] ?? "")) {
      const c = t.indexOf("-c")
      if (c !== -1 && t[c + 1]) calls.push(...gitCalls(t[c + 1], dir, depth + 1))
      continue
    }
    if (t[0] === "eval") {
      calls.push(...gitCalls(t.slice(1).join(" "), dir, depth + 1))
      continue
    }
    if (t[0] === "xargs") {
      const g = t.findIndex((x) => /(^|\/)git$/.test(x))
      if (g !== -1) t.splice(0, g)
    }
    if (!t.length || !/(^|\/)git$/.test(t[0])) continue
    let i = 1
    let gitDir = dir
    const config = []
    while (i < t.length && t[i].startsWith("-")) {
      if (t[i] === "-C") gitDir = resolve(dir, t[++i] ?? ".")
      else if (t[i] === "-c") config.push(t[++i] ?? "")
      i++
    }
    if (i < t.length) calls.push({ sub: t[i], args: t.slice(i + 1), dir: gitDir, text: segment, config })
  }
  return calls
}

/** Current branch — symbolic-ref first, so a fresh repo with no commits still reports "main". */
function currentBranch(dir) {
  for (const args of [["symbolic-ref", "--short", "-q", "HEAD"], ["rev-parse", "--abbrev-ref", "HEAD"]]) {
    try {
      const out = execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
      if (out) return out
    } catch {
      /* try the next way */
    }
  }
  return null
}

/** Branch a switch/checkout in the same command chain moves to, if any. */
function switchTarget({ sub, args }) {
  if (sub !== "switch" && sub !== "checkout") return null
  const create = args.findIndex((a) => ["-c", "-C", "-b", "-B", "--create"].includes(a))
  if (create !== -1) return args[create + 1] ?? null
  const plain = args.filter((a) => !a.startsWith("-"))
  return sub === "switch" && plain.length === 1 ? plain[0] : null
}

/**
 * The message of `git commit -m …` (several -m joined as paragraphs), or null when
 * it can't be known here: editor, -F file, or shell substitution/heredoc (the
 * commit-msg hook still checks those).
 */
export function commitMessage(args, rawCommand = "") {
  if (/\$\(|`|<<|\$\{?\w/.test(rawCommand)) return null
  const parts = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "-F" || a.startsWith("--file") || a === "--no-edit" || a === "-C" || a === "-c") return null
    if (a === "-m" || a === "--message" || /^-[a-zA-Z]+m$/.test(a)) parts.push(args[++i] ?? "")
    else if (a.startsWith("--message=")) parts.push(a.slice(10))
    else if (/^-m./.test(a)) parts.push(a.slice(2))
  }
  return parts.length ? parts.join("\n\n") : null
}

const KNOWN = new Set([
  ...READ_ONLY, ...Object.keys(READ_ONLY_FORMS), "add", "commit", "push", "reset", "restore", "checkout", "switch",
  "rebase", "merge", "cherry-pick", "clean", "revert", "pull", "rm", "mv", "am", "apply", "init", "clone", "gc",
  "prune", "update-ref", "filter-branch", "bisect", "submodule", "tag", "stash", "worktree", "sparse-checkout",
])

function configuredAlias(dir, name) {
  try {
    return execFileSync("git", ["-C", dir, "config", "--get", `alias.${name}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

/** A call through a configured alias (`git ci` → `git commit`), resolved to what really runs. */
export function expandAlias(call, lookup = configuredAlias, depth = 0) {
  if (KNOWN.has(call.sub) || depth > 3) return [call]
  const value = lookup(call.dir, call.sub)
  if (!value) return [call]
  if (value.startsWith("!")) return gitCalls(value.slice(1), call.dir)
  const t = tokenize(value)
  return expandAlias({ ...call, sub: t[0], args: [...t.slice(1), ...call.args] }, lookup, depth + 1)
}

export function verdict(call, flow, protectedBranches, branchOf = currentBranch, opts = {}) {
  const { sub, args } = call
  if (call.config?.some((c) => /^alias\./i.test(c)))
    return "Inline git aliases (`-c alias.…`) hide the real command and are blocked. Run the command itself."
  const readOnly = READ_ONLY.has(sub) || (READ_ONLY_FORMS[sub]?.(args) ?? false)
  if (readOnly) return null

  if (flow === "read-only")
    return `This project's git flow is read-only for agents: \`${call.text}\` changes the repository. Ask the user to run it (they can type \`! ${call.text}\`).`

  if ((sub === "commit" || sub === "push") && args.some((a) => a === "--no-verify" || (sub === "commit" && /^-\w*n/.test(a) && !a.startsWith("--"))))
    return "`--no-verify` skips the commit checks (commitlint) and is blocked. Fix what the hook reports instead."
  if (sub === "commit" && opts.commitConvention === "conventional") {
    const message = commitMessage(args, opts.rawCommand)
    const problems = message === null ? [] : lint(message)
    if (problems.length)
      return `Commit message is not a valid Conventional Commit:\n- ${problems.join("\n- ")}\nFix it (\`commit\` skill; check with \`commit.mjs check "<message>"\`) and commit again.`
  }
  if (sub === "push" && args.some((a) => a === "-f" || a === "--force" || /^\+/.test(a) || a === "--mirror"))
    return "Force-push is blocked. Use --force-with-lease on a feature branch, or ask the user to run it."
  if (sub === "reset" && args.includes("--hard"))
    return "`git reset --hard` discards work and is blocked. Ask the user to run it if intended."
  if (sub === "clean" && args.some((a) => /^-\w*f/.test(a)))
    return "`git clean -f` deletes untracked files and is blocked. Ask the user to run it if intended."
  if (sub === "branch" && args.some((a) => a === "-D" || (a === "--delete" && args.includes("--force"))))
    return "Force-deleting a branch is blocked. Ask the user to run it if intended."

  if (flow === "pr") {
    const branch = branchOf(call.dir)
    if (ON_BRANCH.has(sub) && protectedBranches.includes(branch))
      return `Git flow is branches + pull requests: don't \`git ${sub}\` on ${branch}. Create a feature branch first (\`git switch -c feat/<name>\`).`
    if (sub === "push") {
      const targets = args.filter((a) => !a.startsWith("-")).slice(1)
      const hitsProtected = targets.some((r) => protectedBranches.includes(r.split(":").pop()))
      if (hitsProtected || (!targets.length && protectedBranches.includes(branch)))
        return "Git flow is branches + pull requests: never push to the main branch. Push the feature branch and open a PR."
    }
  }
  return null
}

function main() {
  let input = {}
  try {
    input = JSON.parse(readFileSync(0, "utf8"))
  } catch {
    return 0
  }
  const command = input.tool_input?.command
  hookLog("PreToolUse:Bash", command ?? "")
  if (!command || !/git/.test(command)) return 0
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const project = readProject(findProjectDir(cwd))
  if (!project) return 0

  const protectedBranches = [...new Set(["main", "master", project.mainBranch].filter(Boolean))]
  // `git switch -c feat/x && git commit …` commits on feat/x: follow switches in the chain.
  const switched = new Map()
  const branchOf = (dir) => (switched.has(dir) ? switched.get(dir) : currentBranch(dir))
  for (const call of gitCalls(command, cwd).flatMap((c) => expandAlias(c))) {
    const reason = verdict(call, project.gitFlow, protectedBranches, branchOf, {
      commitConvention: project.commitConvention,
      rawCommand: command,
    })
    if (reason) {
      process.stderr.write(`[agent-kit git-guard] ${reason}\n`)
      return 2
    }
    const target = switchTarget(call)
    if (target) switched.set(call.dir, target)
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main())
}
