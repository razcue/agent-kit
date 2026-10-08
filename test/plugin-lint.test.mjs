import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { parseFrontmatter } from "../plugin/scripts/knowledge.mjs"
import { EXPECTED_SKILLS } from "../scripts/e2e/live.mjs"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const PLUGIN = join(ROOT, "plugin")
const skills = readdirSync(join(PLUGIN, "skills")).sort()
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"))

test("skills: name matches folder, description present and short", () => {
  for (const dir of skills) {
    const { data } = parseFrontmatter(readFileSync(join(PLUGIN, "skills", dir, "SKILL.md"), "utf8"))
    assert.equal(data.name, dir, `${dir}: frontmatter name`)
    assert.ok(data.description?.length >= 80, `${dir}: description too short to trigger well`)
    assert.ok(data.description.length <= 450, `${dir}: description ${data.description.length} chars > 450 (loads every session)`)
  }
})

test("skills: all listings together stay within ~1500 tokens per session", () => {
  const chars = skills.reduce((n, dir) => {
    const { data } = parseFrontmatter(readFileSync(join(PLUGIN, "skills", dir, "SKILL.md"), "utf8"))
    return n + `- agent-kit:${data.name}: ${data.description}`.length
  }, 0)
  assert.ok(chars / 4 <= 1500, `skill listings ≈ ${Math.ceil(chars / 4)} tokens`)
})

test("live smoke test expects exactly the plugin's skills", () => assert.deepEqual([...EXPECTED_SKILLS].sort(), skills))

test("hooks: every command points to an existing script", () => {
  const hooks = json("plugin/hooks/hooks.json").hooks
  const commands = Object.values(hooks).flat().flatMap((m) => m.hooks.map((h) => h.command))
  assert.ok(commands.length >= 4)
  for (const c of commands) {
    const file = c.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/)[1]
    assert.ok(existsSync(join(PLUGIN, file)), `${file} missing`)
  }
})

test("hooks: silent and successful outside agent-kit projects", () => {
  const foreign = mkdtempSync(join(tmpdir(), "not-agent-kit-"))
  const input = JSON.stringify({ cwd: foreign, tool_input: { command: "git commit -m x", file_path: "/tmp/x.mjs" } })
  for (const script of ["session-start.mjs", "git-guard.mjs", "script-nudge.mjs", "checkpoint.mjs"]) {
    const r = spawnSync("node", [join(PLUGIN, "scripts", script)], { cwd: foreign, input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: foreign } })
    assert.equal(r.status, 0, `${script} exit ${r.status}: ${r.stderr}`)
    assert.equal(r.stdout, "", `${script} printed output outside a project`)
  }
})

test("versions agree across package.json, plugin.json and marketplace.json", () => {
  const v = json("package.json").version
  assert.equal(json("plugin/.claude-plugin/plugin.json").version, v)
  assert.equal(json(".claude-plugin/marketplace.json").plugins[0].version, v)
})

test("hooks: each runs within the latency budget in a real project", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-latency-"))
  spawnSync("node", [join(ROOT, "cli/index.mjs"), "init", dir, "--yes", "--kind", "existing", "--name", "lat", "--git", "pr"], { encoding: "utf8" })
  spawnSync("git", ["init", "-q", "-b", "main"], { cwd: dir })
  const input = JSON.stringify({ cwd: dir, tool_input: { command: "git status", file_path: join(dir, "notes.mjs") } })
  for (const script of ["session-start.mjs", "git-guard.mjs", "script-nudge.mjs", "checkpoint.mjs"]) {
    const started = Date.now()
    const r = spawnSync("node", [join(PLUGIN, "scripts", script)], { cwd: dir, input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } })
    const ms = Date.now() - started
    assert.equal(r.status, 0, `${script}: ${r.stderr}`)
    assert.ok(ms < 1500, `${script} took ${ms}ms`)
  }
})
