import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const CLI = new URL("../cli/index.mjs", import.meta.url).pathname
const run = (...args) => spawnSync("node", [CLI, ...args], { encoding: "utf8" })
const cfg = (dir) => JSON.parse(readFileSync(join(dir, "agent-kit.json"), "utf8"))
const git = (dir, ...args) => spawnSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" })
/** A throwaway repository with one commit on `branch` (test fixture). */
function repo(branch, ...more) {
  const dir = join(mkdtempSync(join(tmpdir(), "ak-branch-")), "p")
  mkdirSync(dir)
  git(dir, "init", "-q", "-b", branch)
  writeFileSync(join(dir, "README.md"), "# p\n")
  git(dir, "add", ".")
  git(dir, "commit", "-q", "-m", "init")
  for (const b of more) git(dir, "branch", b)
  return dir
}

test("setup.R2.S1 upgrade corrects a configured branch that doesn't exist", () => {
  const dir = repo("master")
  run("init", dir, "--yes", "--kind", "existing", "--name", "p", "--git", "pr", "--main", "main")
  assert.equal(cfg(dir).mainBranch, "main")
  const r = run("upgrade", dir, "--yes")
  assert.equal(r.status, 0, r.stderr)
  assert.equal(cfg(dir).mainBranch, "master")
  assert.match(r.stdout, /main branch: "main" doesn't exist → "master"/)
})

test("setup.R2.S2 upgrade keeps a configured branch that exists", () => {
  const dir = repo("master")
  run("init", dir, "--yes", "--kind", "existing", "--name", "p", "--git", "pr")
  const r = run("upgrade", dir, "--yes")
  assert.equal(cfg(dir).mainBranch, "master")
  assert.doesNotMatch(r.stdout, /main branch: "/)
})

test("setup.R3.S1 upgrade keeps fields it doesn't ask about", () => {
  const dir = repo("master")
  run("init", dir, "--yes", "--kind", "existing", "--name", "p", "--git", "pr")
  const c = cfg(dir)
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify({ ...c, testCommand: "node --test", contextBudget: 6000 }, null, 2))
  assert.equal(run("upgrade", dir, "--yes").status, 0)
  assert.equal(cfg(dir).testCommand, "node --test")
  assert.equal(cfg(dir).contextBudget, 6000)
})
