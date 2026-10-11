import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { fixBasePath, rewrite } from "./site-base.mjs"

// ZOMBIES: Zero, One, Many, Boundaries apply.
describe("site-base", () => {
  const o = "https://razcue.github.io"
  it("website.R1.S2 absolute URLs in text outputs get the base path, once", () => {
    const text = `- [a](${o}/raw/en.md)\n- [b](${o}/llms-full.txt)\n`
    const fixed = rewrite("llms.txt", text, o, "/agent-kit/")
    assert.equal(fixed, `- [a](${o}/agent-kit/raw/en.md)\n- [b](${o}/agent-kit/llms-full.txt)\n`)
    assert.equal(rewrite("llms.txt", fixed, o, "/agent-kit/"), fixed, "Boundaries: already prefixed stays")
  })
  it("website.R1.S2 the hard-coded favicon link and absolute same-origin URLs in HTML get the base path", () => {
    assert.equal(rewrite("x.html", '<link rel="icon" href="/favicon.ico">', o, "/agent-kit/"), '<link rel="icon" href="/agent-kit/favicon.ico">')
    assert.equal(
      rewrite("x.html", `<link rel="canonical" href="${o}/es/cli"><meta property="og:url" content="${o}/agent-kit/es/cli"><a href="https://github.com/x">`, o, "/agent-kit/"),
      `<link rel="canonical" href="${o}/agent-kit/es/cli"><meta property="og:url" content="${o}/agent-kit/es/cli"><a href="https://github.com/x">`,
    )
  })
  it("Zero: base / changes nothing", () => assert.equal(rewrite("llms.txt", `${o}/raw/a.md`, o, "/"), `${o}/raw/a.md`))
  it("Many: walks the output folder and reports changed files", () => {
    const dir = mkdtempSync(join(tmpdir(), "ak-base-"))
    mkdirSync(join(dir, "en"))
    writeFileSync(join(dir, "llms.txt"), `${o}/raw/a.md`)
    writeFileSync(join(dir, "en", "a.html"), '<link href="/favicon.ico">')
    writeFileSync(join(dir, "app.js"), `${o}/x`)
    assert.deepEqual(fixBasePath(dir, o, "/agent-kit/").sort(), ["en/a.html", "llms.txt"])
    assert.equal(readFileSync(join(dir, "app.js"), "utf8"), `${o}/x`, "other files untouched")
  })
})
