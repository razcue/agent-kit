import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const CLI = new URL("../cli/index.mjs", import.meta.url).pathname
const cli = (...args) => {
  const r = spawnSync("node", [CLI, ...args], { encoding: "utf8" })
  assert.equal(r.status, 0, `${args.join(" ")}\n${r.stdout}\n${r.stderr}`)
  return r.stdout
}
const tmp = () => join(mkdtempSync(join(tmpdir(), "ak-qa-init-")), "p")
const cfg = (dir) => JSON.parse(readFileSync(join(dir, "agent-kit.json"), "utf8"))
const read = (dir, rel) => readFileSync(join(dir, rel), "utf8")

test("002/AC-1 002/AC-8 defaults on a Supabase project: checklist + test data scaffolded, init migration has _env", () => {
  const dir = tmp()
  cli("init", dir, "--yes", "--name", "shop", "--apps", "web,app", "--git", "pr")
  assert.deepEqual(cfg(dir).qa, { checklist: true, testData: true, testPrefix: "TEST_", testDataDir: "supabase/test-data" })
  for (const f of ["env.sql", "seed.sql", "purge.sql", "README.md"]) assert.ok(existsSync(join(dir, "supabase/test-data", f)), f)
  assert.match(read(dir, "supabase/test-data/seed.sql"), /starts_with\(codigo, 'TEST_'\)/)
  assert.doesNotMatch(read(dir, "supabase/test-data/seed.sql"), /__PREFIX__|__DIR__/)
  assert.match(read(dir, "supabase/migrations/000000000000_init.sql"), /CREATE TABLE IF NOT EXISTS public\._env/)
  for (const f of ["README.md", "checklist.md", "checklist.html", "runs/.gitkeep"]) assert.ok(existsSync(join(dir, "work/qa", f)), f)
  assert.match(read(dir, "work/qa/checklist.md"), /0 scenario\(s\) in 0 capability\(ies\)/)
})

test("002/AC-1 projects without Supabase never get test data, even when asked", () => {
  for (const kind of ["blank", "site"]) {
    const dir = tmp()
    cli("init", dir, "--yes", "--kind", kind, "--name", "nosb", "--git", "pr", "--test-data", "true")
    assert.equal(cfg(dir).qa.testData, false, kind)
    assert.equal(cfg(dir).qa.checklist, true, kind)
    assert.ok(!existsSync(join(dir, "supabase/test-data")), kind)
  }
  const existing = tmp()
  mkdirSync(existing, { recursive: true })
  writeFileSync(join(existing, "package.json"), JSON.stringify({ name: "x", dependencies: { "@supabase/supabase-js": "^2" } }))
  cli("init", existing, "--yes", "--kind", "existing", "--name", "withsb", "--git", "pr")
  assert.equal(cfg(existing).qa.testData, true, "existing project using supabase-js is detected")
})

test("002/AC-2 changing the answers keeps existing files; a custom prefix fills the templates", () => {
  const dir = tmp()
  cli("init", dir, "--yes", "--name", "shop", "--apps", "app", "--git", "pr", "--test-prefix", "QA_")
  assert.match(read(dir, "supabase/test-data/purge.sql"), /starts_with\(codigo, 'QA_'\)/)
  writeFileSync(join(dir, "supabase/test-data/seed.sql"), "-- my fixtures\n")
  cli("init", dir, "--yes", "--qa-checklist", "false", "--test-data", "false")
  assert.equal(cfg(dir).qa.checklist, false)
  assert.equal(cfg(dir).qa.testData, false)
  assert.equal(cfg(dir).qa.testPrefix, "QA_", "prefix kept")
  assert.equal(read(dir, "supabase/test-data/seed.sql"), "-- my fixtures\n", "seed untouched")
  assert.ok(existsSync(join(dir, "work/qa/checklist.md")), "work/qa untouched")
})

test("002/AC-10 upgrade of a project set up before QA: defaults added, existing files untouched", () => {
  const dir = tmp()
  cli("init", dir, "--yes", "--name", "old", "--apps", "app", "--git", "pr")
  const c = cfg(dir)
  delete c.qa
  writeFileSync(join(dir, "agent-kit.json"), JSON.stringify(c, null, 2))
  writeFileSync(join(dir, "supabase/test-data/seed.sql"), "-- kept\n")
  const out = cli("upgrade", dir, "--yes")
  assert.match(out, /QA/)
  assert.equal(cfg(dir).qa.checklist, true)
  assert.equal(read(dir, "supabase/test-data/seed.sql"), "-- kept\n")
})
