import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hasChangelogEntry, setVersion } from "./bump.mjs"

// ZOMBIES: One, Many, Boundaries, Exceptions apply.
describe("bump", () => {
  it("One: replaces the version field", () => assert.equal(setVersion('{ "version": "0.1.0" }', "0.2.0"), '{ "version": "0.2.0" }'))
  it("Many: replaces every version field (marketplace has nested ones)", () =>
    assert.equal(setVersion('{"version": "1.0.0", "p": [{"version": "1.0.0"}]}', "1.1.0"), '{"version": "1.1.0", "p": [{"version": "1.1.0"}]}'))
  it("Boundaries: same version is accepted", () => assert.equal(setVersion('{"version": "1.0.0"}', "1.0.0"), '{"version": "1.0.0"}'))
  it("Exceptions: rejects a non-semver version", () => assert.throws(() => setVersion('{"version": "1.0.0"}', "v2"), /not a semver/))
  it("Exceptions: rejects a file without a version", () => assert.throws(() => setVersion("{}", "1.0.0"), /no version field/))
  it("finds the changelog section, not a prefix match", () => {
    assert.equal(hasChangelogEntry("## 0.3.0 — x", "0.3.0"), true)
    assert.equal(hasChangelogEntry("## 0.3.10", "0.3.1"), false)
  })
})
