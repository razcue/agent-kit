import assert from "node:assert/strict"
import { test } from "node:test"
import { KNOWN, READ_ONLY, READ_ONLY_FORMS } from "../plugin/scripts/git-rules.mjs"

// ZOMBIES: One, Interface, Boundaries apply.
test("git-rules: read-only subcommands, and forms that are read-only only with certain arguments", () => {
  for (const sub of ["status", "diff", "log", "fetch"]) assert.ok(READ_ONLY.has(sub), sub)
  for (const sub of ["commit", "push", "reset"]) assert.ok(!READ_ONLY.has(sub), sub)
  assert.equal(READ_ONLY_FORMS.stash(["list"]), true)
  assert.equal(READ_ONLY_FORMS.stash(["pop"]), false)
  assert.equal(READ_ONLY_FORMS.branch(["-D", "x"]), false)
  for (const sub of ["pull", "clone", "commit", "status"]) assert.ok(KNOWN.has(sub), `known: ${sub}`)
})
