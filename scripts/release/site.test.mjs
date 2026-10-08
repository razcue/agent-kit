import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { SITE_FILES, figures, syncText } from "./site.mjs"

const ROOT = fileURLToPath(new URL("../../", import.meta.url))

// ZOMBIES: One, Many, Interface apply.
describe("site figures", () => {
  it("One: replaces a version span", () => assert.equal(syncText('v<span data-ak="version">0.1.0</span>', { version: "1.2.3", skills: 9 }), 'v<span data-ak="version">1.2.3</span>'))
  it("Many: every skills span and the llms.txt phrase", () =>
    assert.equal(syncText('<span data-ak="skills">3</span>/<span data-ak="skills">3</span> plugin with 3 skills', { version: "1.0.0", skills: 12 }), '<span data-ak="skills">12</span>/<span data-ak="skills">12</span> plugin with 12 skills'))
  it("Interface: the published site states the real figures", () => {
    const f = figures(ROOT)
    for (const file of SITE_FILES) {
      const text = readFileSync(ROOT + file, "utf8")
      assert.equal(syncText(text, f), text, `${file} is stale — run node scripts/release/site.mjs`)
    }
  })
})
