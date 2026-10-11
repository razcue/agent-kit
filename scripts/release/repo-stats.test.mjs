import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { toStats } from "./repo-stats.mjs"

// ZOMBIES: Zero, One, Interface, Exceptions apply.
describe("repo-stats", () => {
  it("One: stars, forks and 14-day clones", () =>
    assert.deepEqual(toStats({ stargazers_count: 12, forks_count: 3 }, { count: 40, uniques: 9 }, "2026-10-11T00:00:00Z"), { stars: 12, forks: 3, clones: 40, clonesUnique: 9, updated: "2026-10-11T00:00:00Z" }))
  it("Zero: no clones data (no token) → no clone fields", () =>
    assert.deepEqual(toStats({ stargazers_count: 0, forks_count: 0 }, null, "t"), { stars: 0, forks: 0, updated: "t" }))
  it("Exceptions: an API error body yields only the timestamp", () =>
    assert.deepEqual(toStats({ message: "API rate limit exceeded" }, { message: "Must have push access" }, "t"), { updated: "t" }))
})
