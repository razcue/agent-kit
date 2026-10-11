import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { pickMainBranch } from "../cli/lib/init.mjs"

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

test("setup.R1.S1 only master exists → mainBranch master", () => {
  const dir = repo("master")
  const r = run("init", dir, "--yes", "--kind", "existing", "--name", "p", "--git", "pr")
  assert.equal(r.status, 0, r.stderr)
  assert.equal(cfg(dir).mainBranch, "master")
})

test("setup.R1.S2 origin HEAD decides, without a question", () =>
  assert.deepEqual(pickMainBranch({ originHead: "production", branches: ["main", "production"], current: "main" }), { branch: "production", sure: true }))

test("setup.R1.S3 two candidates → the current one, not sure (interactive init asks)", () =>
  assert.deepEqual(pickMainBranch({ originHead: null, branches: ["main", "master"], current: "master" }), { branch: "master", sure: false }))

test("setup.R1.S4 not a git repository → main", () => {
  const dir = join(mkdtempSync(join(tmpdir(), "ak-branch-")), "p")
  const r = run("init", dir, "--yes", "--kind", "blank", "--name", "p", "--git", "pr")
  assert.equal(r.status, 0, r.stderr)
  assert.equal(cfg(dir).mainBranch, "main")
})

test("setup.R1.S5 --main wins over detection", () => {
  const dir = repo("master")
  run("init", dir, "--yes", "--kind", "existing", "--name", "p", "--git", "pr", "--main", "develop")
  assert.equal(cfg(dir).mainBranch, "develop")
})

test("setup.R1.S6 no usual name → that branch, not sure", () => {
  assert.deepEqual(pickMainBranch({ originHead: null, branches: ["develop"], current: "develop" }), { branch: "develop", sure: false })
  assert.deepEqual(pickMainBranch({ originHead: null, branches: [], current: null }), { branch: null, sure: false })
})
