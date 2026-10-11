#!/usr/bin/env node
// @name: live
// @summary: Live smoke test in real Claude Code (headless, --plugin-dir, cheap model): plugin + skills load, SessionStart context, git guard blocks, stray-script reminder, end-of-turn checkpoint.
// @usage: node scripts/e2e/live.mjs [--model haiku] [--keep]
// @tags: [e2e, release]
// @test: live.test.mjs
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const KIT = fileURLToPath(new URL("../../", import.meta.url))
export const EXPECTED_SKILLS = ["adopt", "commit", "decide", "feature", "knowledge", "preflight", "retro", "scripts", "spec", "start", "tdd"]

/**
 * Pure: stream-json lines (+ the AGENT_KIT_HOOK_LOG trace, since headless
 * stream output only reports SessionStart hooks) → what the session showed.
 */
export function inspect(lines, hookTrace = "") {
  const seen = {
    plugin: false,
    skills: [],
    sessionContext: "",
    // The guard's rules are unit-tested; live we check the hook is wired, and that a
    // commit the model does attempt is blocked (it may rightly refuse: the session
    // context says git is read-only).
    preToolUse: /PreToolUse:Bash /.test(hookTrace),
    commitAttempted: /PreToolUse:Bash git commit/.test(hookTrace),
    guardBlocked: false,
    nudged: false,
    stopRan: /\bStop\b/.test(hookTrace),
    result: "",
  }
  if (/PostToolUse:Write \S*stray/.test(hookTrace)) seen.nudged = true
  for (const line of lines) {
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.type === "system" && e.subtype === "init") {
      seen.plugin = (e.plugins ?? []).some((p) => p.name === "agent-kit")
      seen.skills = (e.skills ?? []).filter((s) => String(s).startsWith("agent-kit:")).map((s) => s.slice(10))
    }
    if (e.type === "system" && e.subtype === "hook_response") {
      const out = String(e.output ?? e.stdout ?? "")
      if (out.includes('"hookEventName":"SessionStart"')) seen.sessionContext = out
      if (out.includes("You wrote a script")) seen.nudged = true
    }
    if (e.type === "user")
      for (const c of e.message?.content ?? [])
        if (c?.type === "tool_result" && String(JSON.stringify(c.content)).includes("[agent-kit git-guard]")) seen.guardBlocked = true
    if (e.type === "result") seen.result = e.result ?? ""
  }
  return seen
}

/** Pure: failed expectations, empty when everything passed. */
export function failures(seen, checkpointWritten) {
  if (!seen.stopRan) checkpointWritten = false
  const f = []
  if (!seen.plugin) f.push("plugin agent-kit not loaded")
  const missing = EXPECTED_SKILLS.filter((s) => !seen.skills.includes(s))
  if (missing.length) f.push(`skills missing: ${missing.join(", ")}`)
  if (!seen.sessionContext.includes("# agent-kit")) f.push("SessionStart context not injected")
  if (!seen.preToolUse) f.push("PreToolUse(Bash) hook did not run")
  if (seen.commitAttempted && !seen.guardBlocked) f.push("git guard let a commit through")
  if (!seen.nudged) f.push("stray-script reminder did not fire")
  if (!checkpointWritten) f.push("Stop checkpoint not written")
  return f
}

function main(argv) {
  const model = argv[argv.indexOf("--model") + 1] && argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : "haiku"
  const dir = mkdtempSync(join(tmpdir(), "agent-kit-live-"))
  const trace = join(dir, "hooks.log")
  const env = { ...process.env, AGENT_KIT_HOME: KIT, AGENT_KIT_HOOK_LOG: trace }
  const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: dir, encoding: "utf8", env, ...opts })
  sh("node", [join(KIT, "cli/index.mjs"), "init", dir, "--yes", "--kind", "existing", "--name", "live", "--git", "read-only", "--method", "sdd"])
  sh("git", ["init", "-q", "-b", "main"])
  const stray = join(tmpdir(), `agent-kit-live-stray-${Date.now()}.mjs`)
  const prompt = [
    "Do exactly these steps, then stop.",
    "1) Run this bash command: git status --short",
    "2) Run this bash command: git commit --allow-empty -m probe (it may be refused — that is fine)",
    `3) Use the Write tool to create ${stray} containing: console.log(1)`,
    "4) Reply with one line: done.",
  ].join("\n")
  const r = sh(
    "claude",
    ["-p", prompt, "--plugin-dir", join(KIT, "plugin"), "--model", model, "--output-format", "stream-json", "--verbose", "--allowedTools", "Bash(git status:*)", "Bash(git commit:*)", "Write"],
    { input: "", timeout: 240_000 },
  )
  const seen = inspect((r.stdout ?? "").split("\n"), existsSync(trace) ? readFileSync(trace, "utf8") : "")
  const failed = failures(seen, existsSync(join(dir, ".agent-kit", "checkpoint.json")))
  rmSync(stray, { force: true })
  if (!argv.includes("--keep")) rmSync(dir, { recursive: true, force: true })
  console.log(
    failed.length
      ? `FAIL\n- ${failed.join("\n- ")}`
      : `PASS — plugin, ${seen.skills.length} skills, session context, git guard (${seen.commitAttempted ? "blocked the commit" : "wired; model declined the commit"}), script reminder, checkpoint`,
  )
  if (argv.includes("--keep")) console.log(`project kept at ${dir}`)
  return failed.length ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
