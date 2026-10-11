import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { checkDocs, LOCALES } from "../scripts/release/docs.mjs"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const read = (p) => readFileSync(join(ROOT, p), "utf8")

test("site: a Docus project with every locale configured and present", () => {
  const pkg = JSON.parse(read("site/package.json"))
  assert.ok(pkg.dependencies.docus && pkg.dependencies["@nuxtjs/i18n"])
  const config = read("site/nuxt.config.ts")
  assert.match(config, /extends: \["docus"\]/)
  for (const code of LOCALES) {
    assert.match(config, new RegExp(`code: "${code}"`), `locale ${code} configured`)
    assert.ok(existsSync(join(ROOT, `site/content/${code}/index.md`)), `content/${code}/index.md`)
  }
})

test("website.R2.S2 website.R3.S2 website.R4.S3 website.R5.S1 docs complete, translated and current", () => {
  const r = checkDocs()
  assert.deepEqual({ generated: r.generated, missing: r.missing, stale: r.stale, orphans: r.orphans, undocumented: r.undocumented }, { generated: [], missing: [], stale: [], orphans: [], undocumented: [] }, "run `node scripts/release/docs.mjs check` for details")
})

test("website.R1.S1 website.R1.S3 pages workflow builds the static site under /agent-kit/ and publishes only a successful build", () => {
  const wf = read(".github/workflows/pages.yml")
  assert.match(wf, /working-directory: site/)
  assert.match(wf, /npm run generate:pages/)
  assert.match(wf, /path: site\/\.output\/public/)
  assert.match(JSON.parse(read("site/package.json")).scripts["generate:pages"], /NUXT_APP_BASE_URL=\/agent-kit\/ nuxt generate && node \.\.\/scripts\/release\/site-base\.mjs/)
})

test("website.R7.S2 the Vercel config builds the server (MCP), the static build has none", () => {
  const vercel = JSON.parse(read("site/vercel.json"))
  assert.equal(vercel.buildCommand, "nuxt build")
  assert.doesNotMatch(read("site/nuxt.config.ts"), /mcp:\s*\{\s*enabled:\s*false/)
})

test("site: the pages build writes stats.json (stars, forks; clones with TRAFFIC_TOKEN) and refreshes daily", () => {
  const wf = read(".github/workflows/pages.yml")
  assert.match(wf, /node \.\.\/scripts\/release\/repo-stats\.mjs public\/stats\.json/)
  assert.match(wf, /TRAFFIC_TOKEN: \$\{\{ secrets\.TRAFFIC_TOKEN \}\}/)
  assert.match(wf, /cron:/)
})

test("website.R7.S3 Docus's AI assistant is explicitly off, even on Vercel", () => {
  assert.match(read("site/nuxt.config.ts"), /docus:\s*\{\s*assistant:\s*\{\s*enabled:\s*false/)
})
