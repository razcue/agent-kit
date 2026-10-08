import assert from "node:assert/strict"
import { test } from "node:test"
import { gitCalls, verdict } from "../plugin/scripts/git-guard.mjs"
import { addedLines, analyze } from "../plugin/scripts/preflight.mjs"
import { parseFrontmatter } from "../plugin/scripts/knowledge.mjs"
import { GIT_RULES, mergeSettings, upsertBlock } from "../cli/lib/init.mjs"

const PROT = ["main", "master"]
const v = (cmd, flow) => gitCalls(cmd, "/tmp").map((c) => verdict(c, flow, PROT)).find(Boolean) ?? null

test("git-guard: read-only flow allows reads, blocks writes", () => {
  for (const ok of ["git status", "git log --oneline -5", "git diff HEAD", "git branch", "git branch -a", "git stash list", "git -C /x show HEAD", "git config --get user.name"])
    assert.equal(v(ok, "read-only"), null, ok)
  for (const bad of ["git commit -m x", "git add .", "cd sub && git push", "FOO=1 git stash", "git branch feat/x", "git -c a=b checkout main", "npm test; git reset HEAD~1"])
    assert.match(v(bad, "read-only") ?? "", /read-only/, bad)
})

test("git-guard: destructive commands blocked in every flow", () => {
  for (const flow of ["pr", "trunk"]) {
    assert.match(v("git push --force origin feat", flow), /Force-push/)
    assert.match(v("git push origin +feat", flow), /Force-push/)
    assert.match(v("git reset --hard HEAD~1", flow), /reset --hard/)
    assert.match(v("git clean -fd", flow), /clean -f/)
    assert.match(v("git branch -D old", flow), /Force-deleting/)
    assert.equal(v("git push --force-with-lease origin feat", flow), null)
  }
})

test("git-guard: pr flow blocks pushes to protected branches", () => {
  assert.match(v("git push origin main", "pr"), /never push to the main branch/)
  assert.match(v("git push origin HEAD:master", "pr"), /never push/)
  assert.equal(v("git push origin feat/x", "trunk"), null)
})

test("git-guard: tokenizer handles quotes and chains", () => {
  const calls = gitCalls(`echo hi && git commit -m "a && b" ; git status`, "/tmp")
  assert.deepEqual(calls.map((c) => c.sub), ["commit", "status"])
})

test("preflight: added lines carry new-file line numbers", () => {
  const diff = ["+++ b/a.ts", "@@ -1,0 +5,2 @@", "+const x = 1", "+console.log(x)"].join("\n")
  assert.deepEqual(addedLines(diff).get("a.ts"), [{ line: 5, text: "const x = 1" }, { line: 6, text: "console.log(x)" }])
})

test("preflight: violations, migrations, env, deps, debug", () => {
  const status = new Map([["supabase/migrations/2_new.sql", "A"], ["supabase/migrations/1_old.sql", "M"]])
  const added = new Map([
    ["supabase/migrations/2_new.sql", [{ line: 3, text: "GRANT SELECT ON t TO authenticated;" }]],
    ["apps/app/server/x.ts", [{ line: 1, text: "const k = process.env.STRIPE_KEY" }, { line: 2, text: "console.log(k)" }]],
    ["package.json", [{ line: 9, text: '    "zod": "^4.4.3",' }]],
    [".env.example", [{ line: 1, text: "NUXT_NEW_THING=" }, { line: 2, text: "SERVICE_ROLE_KEY=abcdefghijklmnopqrstuvwxyz123456" }]],
  ])
  const r = analyze({ status, added })
  assert.equal(r.database.length, 1)
  assert.equal(r.violations.filter((x) => /existing migration/.test(x)).length, 1)
  assert.ok(r.violations.some((x) => /anon\/authenticated/.test(x)))
  assert.ok(r.violations.some((x) => /possible secret/.test(x)))
  assert.ok(r.configuration.some((x) => /STRIPE_KEY/.test(x)))
  assert.ok(r.configuration.some((x) => /NUXT_NEW_THING/.test(x)))
  assert.ok(r.dependencies.some((x) => /zod/.test(x)))
  assert.equal(r.warnings.length, 1)
})

test("knowledge: frontmatter parsing", () => {
  const { data, body } = parseFrontmatter("---\nname: a\ntags: [x, \"y\"]\nsummary: 'S'\n---\nBody\n")
  assert.deepEqual(data, { name: "a", tags: ["x", "y"], summary: "S" })
  assert.equal(body, "Body\n")
})

test("init: settings merge keeps user rules and swaps managed git rules", () => {
  const current = { permissions: { deny: ["Bash(rm -rf:*)", ...GIT_RULES["read-only"].deny] }, enabledPlugins: { other: true } }
  const s = mergeSettings(current, "pr", { source: "github", repo: "razcue/agent-kit" })
  assert.deepEqual(s.permissions.deny, ["Bash(rm -rf:*)", ...GIT_RULES.pr.deny])
  assert.deepEqual(s.permissions.ask, GIT_RULES.pr.ask)
  assert.equal(s.enabledPlugins.other, true)
  assert.equal(s.enabledPlugins["agent-kit@agent-kit"], true)
})

test("init: AGENTS block is replaced in place, appended otherwise", () => {
  const b1 = "<!-- agent-kit:start -->\nv1\n<!-- agent-kit:end -->"
  const b2 = "<!-- agent-kit:start -->\nv2\n<!-- agent-kit:end -->"
  const once = upsertBlock("# P\n\nrules\n", b1)
  assert.equal(once, `# P\n\nrules\n\n${b1}\n`)
  assert.equal(upsertBlock(`${once}tail\n`, b2), `# P\n\nrules\n\n${b2}\ntail\n`)
})

test("git-guard: git hidden in wrappers is still checked", () => {
  const subs = (cmd) => gitCalls(cmd, "/tmp").map((c) => c.sub)
  assert.deepEqual(subs(`bash -c "git add . ; git commit -m x"`), ["add", "commit"])
  assert.deepEqual(subs(`sh -c 'cd sub && git push'`), ["push"])
  assert.deepEqual(subs("eval git reset --hard"), ["reset"])
  assert.deepEqual(subs("echo $(git commit -m y)"), ["commit"])
  assert.deepEqual(subs("echo `git push`"), ["push"])
  assert.deepEqual(subs("ls | xargs git rm"), ["rm"])
  assert.deepEqual(subs("timeout 10 git push"), ["push"])
  assert.deepEqual(subs("nohup git push"), ["push"])
  assert.deepEqual(gitCalls(`git commit -m "fix: a; b | c"`, "/tmp")[0].args, ["-m", "fix: a; b | c"])
  assert.match(v(`bash -c "git commit -m x"`, "read-only") ?? "", /read-only/)
  assert.match(v("eval git reset --hard", "trunk") ?? "", /reset --hard/)
})

test("frontmatter: YAML inline comments are not part of the value", () => {
  const { data } = parseFrontmatter('---\nstatus: draft # draft | approved | done\ntype: rule # concept | rule\ntags: [a, b] # note\ntitle: "Use # in titles" # c\nurl: https://x.com/#anchor\n---\n')
  assert.deepEqual(data, { status: "draft", type: "rule", tags: ["a", "b"], title: "Use # in titles", url: "https://x.com/#anchor" })
})

test("git-guard: aliases can't hide the real command", async () => {
  const { expandAlias } = await import("../plugin/scripts/git-guard.mjs")
  const aliases = { ci: "commit -v", pub: "push origin main", wip: "!git add -A && git commit -m wip" }
  const lookup = (_dir, name) => aliases[name] ?? null
  const expand = (cmd) => gitCalls(cmd, "/tmp").flatMap((c) => expandAlias(c, lookup))
  assert.deepEqual(expand("git ci -m x").map((c) => [c.sub, c.args]), [["commit", ["-v", "-m", "x"]]])
  assert.deepEqual(expand("git wip").map((c) => c.sub), ["add", "commit"])
  assert.deepEqual(expand("git status").map((c) => c.sub), ["status"])
  assert.match(verdict(expand("git pub")[0], "pr", PROT, () => "feat/x") ?? "", /never push to the main branch/)
  assert.match(v("git -c alias.x=commit x -m y", "trunk") ?? "", /Inline git aliases/)
})
