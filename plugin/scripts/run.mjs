// Runs a command and returns a compact result for the agent: exit code, time,
// the lines that matter (failures, errors) and the tail. The full output goes to
// a log file, so a long run costs a few dozen lines of context, not thousands.
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g
const SIGNAL = /\b(fail(ed|ure)?|error|exception|traceback|assert|expected|received|not ok|✗|×|panic)\b/i

/** Pure: picks what to show from the full output. */
export function summarize(output, maxLines = 60) {
  const lines = output.replace(ANSI, "").split("\n")
  while (lines.length && !lines.at(-1).trim()) lines.pop()
  if (lines.length <= maxLines) return { lines, total: lines.length, truncated: false }
  const tailSize = Math.min(20, Math.floor(maxLines / 3))
  const tailStart = lines.length - tailSize
  const signal = []
  for (let i = 0; i < tailStart && signal.length < maxLines - tailSize - 1; i++)
    if (SIGNAL.test(lines[i])) signal.push(`${i + 1}: ${lines[i]}`)
  return {
    lines: [...signal, `… (${lines.length - signal.length - tailSize} lines omitted)`, ...lines.slice(tailStart)],
    total: lines.length,
    truncated: true,
  }
}

/**
 * @param {{ cmd: string, args?: string[], cwd: string, label: string, logDir: string, maxLines?: number, timeoutMs?: number }} opts
 */
export function runCompact({ cmd, args = [], cwd, label, logDir, maxLines = 60, timeoutMs = 10 * 60_000 }) {
  const started = Date.now()
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: timeoutMs,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", CI: process.env.CI ?? "1" },
  })
  const ms = Date.now() - started
  const output = [res.stdout, res.stderr, res.error ? String(res.error) : ""].filter(Boolean).join("\n")
  mkdirSync(logDir, { recursive: true })
  const log = join(logDir, `${label.replace(/[^\w.-]+/g, "_")}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`)
  const code = res.status ?? (res.signal ? 128 : 1)
  writeFileSync(log, `$ ${[cmd, ...args].join(" ")}\n${output}\n# exit ${code} · ${ms}ms\n`)
  const { lines, total, truncated } = summarize(output, maxLines)
  const header = `$ ${[cmd, ...args].join(" ")}  → exit ${code}${res.signal ? ` (${res.signal})` : ""}, ${(ms / 1000).toFixed(1)}s, ${total} lines${truncated ? `, showing ${lines.length}` : ""}; full log: ${relative(cwd, log)}`
  return { code, ms, log, text: [header, ...lines].join("\n") }
}
