import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { pinCliVersion } from "../scripts/release/bump.mjs"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const PLUGIN = join(ROOT, "plugin")
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"))
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))

test("plugin.R1.S1 manifest complete; the marketplace entry agrees", () => {
  const m = json("plugin/.claude-plugin/plugin.json")
  for (const k of ["name", "displayName", "description", "version", "author", "homepage", "repository", "license", "keywords"]) assert.ok(m[k], `plugin.json ${k}`)
  assert.match(m.name, /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/)
  for (const k of ["homepage", "repository"]) assert.doesNotThrow(() => new URL(m[k]), k)
  assert.doesNotMatch(m.description, /AC traceability/)
  const entry = json(".claude-plugin/marketplace.json").plugins.find((p) => p.name === m.name)
  assert.equal(entry.version, m.version)
  assert.equal(entry.description, m.description)
})

test("plugin.R1.S2 README has ≥ 40 words outside code blocks; LICENSE exists", () => {
  const prose = readFileSync(join(PLUGIN, "README.md"), "utf8").replace(/```[\s\S]*?```/g, "")
  assert.ok(prose.split(/\s+/).filter((w) => /\w/.test(w)).length >= 40)
  assert.ok(existsSync(join(PLUGIN, "LICENSE")))
})

test("plugin.R2.S1 every package launcher in the plugin names an exact version", () => {
  const launcher = /\b(?:npx|bunx|uvx|pnpm dlx|yarn dlx)\s+(?:--yes\s+|-y\s+)?(@?[\w./-]+(?:@[\w.^~<>=*-]+)?)/g
  const bad = []
  for (const f of walk(PLUGIN).filter((p) => /\.(mjs|js|md|json|sh)$/.test(p) && !p.endsWith(".test.mjs")))
    for (const [whole, pkg] of readFileSync(f, "utf8").matchAll(launcher)) {
      // Only real package names (with a scope or a letter start); exact x.y.z required.
      if (!/^@?[a-z]/.test(pkg)) continue
      if (!/@\d+\.\d+\.\d+$/.test(pkg)) bad.push(`${f.replace(ROOT, "")}: ${whole}`)
    }
  assert.deepEqual(bad, [])
})


test("plugin.R3.S1 bump re-pins the CLI commands inside the plugin", () => {
  assert.equal(pinCliVersion("run `npx @razcue/agent-kit@0.14.0 upgrade` then npx @razcue/agent-kit@0.9.1 doctor", "0.14.1"), "run `npx @razcue/agent-kit@0.14.1 upgrade` then npx @razcue/agent-kit@0.14.1 doctor")
  assert.equal(pinCliVersion("plain @razcue/agent-kit mention", "0.14.1"), "plain @razcue/agent-kit mention", "only pinned commands change")
})
