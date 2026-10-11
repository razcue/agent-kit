import assert from "node:assert/strict"
import { test } from "node:test"
import { driftNotice } from "../plugin/scripts/session-start.mjs"

test("session-start: drift notice only when the plugin is newer; names the package and version, no launcher", () => {
  const notice = driftNotice("0.5.0", "0.7.0")
  assert.match(notice, /0\.7\.0 is newer than this project's setup \(0\.5\.0\).*`upgrade`.*@razcue\/agent-kit version 0\.7\.0/)
  assert.doesNotMatch(notice, /\bnpx\b/, "a hook script prints no package launcher")
  assert.equal(driftNotice("0.7.0", "0.7.0"), null)
  assert.equal(driftNotice("0.8.0", "0.7.0"), null)
  assert.equal(driftNotice(undefined, "0.7.0"), null)
})
