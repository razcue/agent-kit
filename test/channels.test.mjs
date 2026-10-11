import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { CHANNELS } from "../cli/lib/channels.mjs"
import { HELP } from "../cli/lib/help.mjs"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const read = (p) => readFileSync(join(ROOT, p), "utf8")
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const NPX = /npx @razcue\/agent-kit(@\d+\.\d+\.\d+)? init/

test("channels.R1.S1 docs, READMEs and CLI help each name every channel", () => {
  const sources = {
    "docs en": read("site/content/en/1.getting-started/5.channels.md"),
    "docs es": read("site/content/es/1.getting-started/5.channels.md"),
    "README.md": read("README.md"),
    "plugin/README.md": read("plugin/README.md"),
    "CLI help": HELP,
  }
  for (const [name, text] of Object.entries(sources)) {
    assert.ok(text.includes(CHANNELS.docs), `${name}: docs URL`)
    assert.ok(text.includes(CHANNELS.mcp), `${name}: MCP endpoint`)
    assert.ok(text.includes(CHANNELS.pluginInstall), `${name}: plugin install command`)
    assert.match(text, NPX, `${name}: npx command`)
  }
})

test("channels.R1.S2 no stale placeholder anywhere in the docs or READMEs", () => {
  const files = [...walk(join(ROOT, "site/content")), join(ROOT, "README.md"), join(ROOT, "plugin/README.md")]
  assert.deepEqual(files.filter((f) => readFileSync(f, "utf8").includes("<your-vercel-deployment>")).map((f) => f.replace(ROOT, "")), [])
})

test("channels.R3.S1 the plugin declares the docs MCP server over https and discloses it", () => {
  const mcp = JSON.parse(read("plugin/.mcp.json"))
  assert.deepEqual(mcp.mcpServers["agent-kit-docs"], { type: "http", url: CHANNELS.mcp })
  assert.match(CHANNELS.mcp, /^https:\/\//)
  assert.match(read("plugin/README.md"), /agent-kit-docs/)
})

test("channels.R4.S1 npm package metadata points to the docs and the repository", () => {
  const pkg = JSON.parse(read("package.json"))
  assert.equal(pkg.homepage, CHANNELS.docs)
  assert.match(JSON.stringify(pkg.repository), /github\.com\/razcue\/agent-kit/)
  assert.equal(pkg.bugs?.url, `${CHANNELS.repo}/issues`)
  assert.ok(pkg.keywords?.length)
})
