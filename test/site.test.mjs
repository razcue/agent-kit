import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, normalize } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const SITE = fileURLToPath(new URL("../site/", import.meta.url))
const PAGES = ["index.html", "es/index.html"]
const read = (p) => readFileSync(join(SITE, p), "utf8")

test("site: every internal link, anchor, stylesheet and script resolves", () => {
  for (const page of PAGES) {
    const html = read(page)
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:|mailto:)/.test(ref)) continue
      if (ref.startsWith("#")) assert.ok(ids.has(ref.slice(1)), `${page}: missing anchor ${ref}`)
      else {
        const target = normalize(join(SITE, dirname(page), ref))
        assert.ok(existsSync(target) || existsSync(join(target, "index.html")), `${page}: missing ${ref}`)
      }
    }
  }
})

test("site: both languages have the same sections and link to each other", () => {
  const sections = (html) => [...html.matchAll(/<section[^>]*id="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(sections(read("es/index.html")), sections(read("index.html")))
  assert.match(read("index.html"), /hreflang="es"/)
  assert.match(read("es/index.html"), /hreflang="en"/)
})

test("site: llms.txt and .nojekyll are published", () => {
  assert.match(read("llms.txt"), /^# agent-kit\n\n> /)
  assert.ok(existsSync(join(SITE, ".nojekyll")))
})
