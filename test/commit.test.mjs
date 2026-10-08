import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { lint, scopeOf, suggestType } from "../plugin/scripts/commit.mjs"
import { commitMessage, gitCalls, verdict } from "../plugin/scripts/git-guard.mjs"
import { QUESTIONS, agentsBlock, withCommitTooling } from "../cli/lib/init.mjs"

// ZOMBIES for the built-in Conventional Commits rules.
describe("commit lint", () => {
  it("Zero: an empty message is invalid", () => assert.deepEqual(lint(""), ["message is empty"]))
  it("One: a minimal valid header", () => assert.deepEqual(lint("fix: handle empty invoice"), []))
  it("Many: scope, breaking marker, body and footer", () =>
    assert.deepEqual(lint("feat(app)!: drop legacy export\n\nOld CSV format removed.\n\nBREAKING CHANGE: use /api/export"), []))
  it("Boundaries: header of exactly 72 passes, 73 fails", () => {
    const at = (n) => `fix: ${"a".repeat(n - 5)}`
    assert.deepEqual(lint(at(72)), [])
    assert.match(lint(at(73))[0], /73 characters/)
  })
  it("Boundaries: any capital first letter is sentence-case (acronyms too)", () => {
    assert.match(lint("feat(api): API keys rotate monthly").join(), /lower-case/)
    assert.deepEqual(lint("feat(api): rotate API keys monthly"), [])
  })
  it("Interface: comment lines (from the editor) are ignored", () => assert.deepEqual(lint("fix: x\n# Please enter the commit message"), []))
  it("Exceptions: every rule reports a readable problem", () => {
    assert.match(lint("Added stuff").join(), /type\(scope\): subject/)
    assert.match(lint("Feat: x").join(), /lower-case/)
    assert.match(lint("feature: x").join(), /must be one of/)
    assert.match(lint("fix: done.").join(), /period/)
    assert.match(lint(`fix: x\n\n${"b".repeat(101)}`).join(), /longer than 100/)
  })
})

// Verdicts recorded from @commitlint/cli 21.2.3 + config-conventional (header-max-length 72).
const COMMITLINT_VERDICTS = [
  ["fix: a", true], ["Fix: a", false], ["fix: A thing", false], ["fix: API keys rotate", false],
  ["fix(app)!: drop x", true], ["feat:missing space", false], ["fix: x.", false], ["docs: update README", true],
  ["chore(deps): bump vite to 7", true], ["fix: x\nbody", true], ["fix: x\n\nbody", true], ["wip: stuff", false],
  ["revert: feat: x", true], [`fix: ${"a".repeat(70)}`, false], ["FIX: x", false], ["feat(ui): ADD BUTTON NOW", false],
]

describe("commit lint: parity with real commitlint", () => {
  for (const [message, valid] of COMMITLINT_VERDICTS)
    it(`${JSON.stringify(message).slice(0, 40)} → ${valid ? "valid" : "invalid"}`, () => assert.equal(lint(message).length === 0, valid, lint(message).join("; ")))
})

describe("commit draft hints", () => {
  it("scope from the path", () => {
    assert.equal(scopeOf("apps/app/server/api/x.ts"), "app")
    assert.equal(scopeOf("packages/shared/src/a.ts"), "shared")
    assert.equal(scopeOf("supabase/migrations/1_x.sql"), "db")
    assert.equal(scopeOf("content/about.md"), "content")
    assert.equal(scopeOf("README.md"), null)
  })
  it("type only when the files decide it", () => {
    assert.equal(suggestType(["a.test.ts", "b.spec.ts"]), "test")
    assert.equal(suggestType([".github/workflows/check.yml"]), "ci")
    assert.equal(suggestType(["package.json", "package-lock.json"]), "build")
    assert.equal(suggestType(["README.md", ".knowledge/business/x.md"]), "docs")
    assert.equal(suggestType(["src/a.ts", "src/a.test.ts"]), null)
    assert.equal(suggestType([]), null)
  })
})

describe("git guard: commits", () => {
  const conv = (cmd) => verdict(gitCalls(cmd, "/tmp")[0], "trunk", ["main"], () => "feat/x", { commitConvention: "conventional", rawCommand: cmd })
  it("validates -m messages in conventional projects", () => {
    assert.match(conv('git commit -m "Updated things."') ?? "", /not a valid Conventional Commit/)
    assert.equal(conv('git commit -m "fix(app): handle empty list"'), null)
    assert.equal(conv('git commit -am "fix: y"'), null)
    assert.match(conv('git commit -am "Fix y"') ?? "", /not a valid/)
  })
  it("skips messages it can't see (heredoc, $(), -F, editor)", () => {
    assert.equal(commitMessage(["-m", "x"], 'git commit -m "$(cat <<EOF\nBad.\nEOF\n)"'), null)
    assert.equal(commitMessage(["-F", "msg.txt"]), null)
    assert.equal(commitMessage([]), null)
  })
  it("joins several -m as paragraphs", () => assert.equal(commitMessage(["-m", "fix: a", "-m", "why"]), "fix: a\n\nwhy"))
  it("blocks --no-verify and -n in every flow", () => {
    for (const flow of ["pr", "trunk"])
      for (const cmd of ['git commit --no-verify -m "fix: a"', 'git commit -n -m "fix: a"', "git push --no-verify"])
        assert.match(verdict(gitCalls(cmd, "/tmp")[0], flow, ["main"], () => "feat/x") ?? "", /no-verify/, `${flow}: ${cmd}`)
  })
  it("free-form projects don't check the message", () =>
    assert.equal(verdict(gitCalls('git commit -m "whatever"', "/tmp")[0], "trunk", ["main"], () => "feat/x", { commitConvention: "none" }), null))
})

describe("init: commit tooling", () => {
  it("adds commitlint + husky and a prepare script", () => {
    const p = withCommitTooling({ name: "x" })
    assert.deepEqual(Object.keys(p.devDependencies), ["@commitlint/cli", "@commitlint/config-conventional", "husky"])
    assert.equal(p.scripts.prepare, "husky")
  })
  it("keeps existing prepare and versions; idempotent", () => {
    const p = withCommitTooling({ scripts: { prepare: "nuxt prepare" }, devDependencies: { husky: "^8.0.0" } })
    assert.equal(p.scripts.prepare, "nuxt prepare && husky")
    assert.equal(p.devDependencies.husky, "^8.0.0")
    assert.deepEqual(withCommitTooling(p), p)
  })
  it("question and AGENTS line", () => {
    assert.deepEqual(QUESTIONS.commitConvention.map((o) => o.value), ["conventional", "none"])
    const cfg = { technicalLevel: "technical", language: "en", methodology: "sdd", gitFlow: "pr", commitConvention: "conventional" }
    assert.match(agentsBlock(cfg), /Conventional Commits.*`commit` skill/)
    assert.doesNotMatch(agentsBlock({ ...cfg, commitConvention: "none" }), /Conventional/)
  })
})
