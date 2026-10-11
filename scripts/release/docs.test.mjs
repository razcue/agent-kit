import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { checkDocs, generatedPages, parseHelp, pageHash, readSource, stamp, syncDocs } from "./docs.mjs"

const put = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}
const HELP = `agent-kit — test

  agent-kit init [dir]     ask the setup questions
      --name <kebab>  --yes
  agent-kit doctor [dir] [--fix]   check a project
`
const SOURCE = {
  help: HELP,
  questions: { kind: [{ value: "blank", label: "Blank project", hint: "agent layer only" }] },
  skills: [{ name: "spec", description: "Spec lane.", origin: "plugin", files: ["references/notation.md"] }],
  hooks: [{ event: "SessionStart", matcher: "", script: "session-start.mjs", summary: "Injects the profile." }],
  scripts: [{ name: "specs", summary: "Living specs.", usage: ["node specs.mjs lint [cap|NNN]"] }],
  changelog: "# Changelog\n\n## 0.1.0 — 2026-01-01\n- first\n",
}

/** A site with the generated pages, one hand page per locale, translations stamped. */
function site(source = SOURCE) {
  const root = mkdtempSync(join(tmpdir(), "ak-docs-"))
  put(root, "site/content/en/index.md", "# agent-kit\n\nRun `agent-kit init` then `agent-kit doctor`.\n")
  syncDocs(root, source)
  for (const rel of Object.keys(generatedPages(source))) put(root, rel.replace("/en/", "/es/"), "---\ntitle: ES\n---\n")
  put(root, "site/content/es/index.md", "# agent-kit\n")
  stamp(root, ["all"])
  return root
}

// ZOMBIES: Zero, One, Many, Boundaries, Interface, Exceptions apply.
describe("docs", () => {
  it("Interface: help lines become commands with usage, summary and flag lines", () => {
    assert.deepEqual(parseHelp(HELP), [
      { cmd: "init", usage: "agent-kit init [dir]", summary: "ask the setup questions", details: ["--name <kebab>  --yes"] },
      { cmd: "doctor", usage: "agent-kit doctor [dir] [--fix]", summary: "check a project", details: [] },
    ])
  })

  it("website.R4.S1 a new skill gets its entry in the skills reference; the Spanish page goes stale until translated", () => {
    const root = site()
    const more = { ...SOURCE, skills: [...SOURCE.skills, { name: "foo", description: "Does foo things.", origin: "plugin", files: [] }] }
    assert.match(generatedPages(more)["site/content/en/4.reference/3.skills.md"], /## foo\n\nDoes foo things\./)
    syncDocs(root, more)
    assert.deepEqual(checkDocs(root, more).stale, ["site/content/es/4.reference/3.skills.md"])
  })

  it("website.R4.S2 sync is idempotent", () => {
    const root = site()
    assert.deepEqual(syncDocs(root, SOURCE), [])
  })

  it("website.R4.S3 a generated page older than its source is reported", () => {
    const root = site()
    const changed = { ...SOURCE, help: HELP.replace("--name <kebab>  --yes", "--name <kebab>  --yes  --new-flag") }
    assert.deepEqual(checkDocs(root, changed).generated, ["site/content/en/4.reference/1.cli.md"])
  })

  it("website.R2.S2 a missing translation is named", () => {
    const root = site()
    put(root, "site/content/en/3.guides/1.qa-pass.md", "# QA pass\n")
    assert.deepEqual(checkDocs(root, SOURCE).missing, ["site/content/es/3.guides/1.qa-pass.md"])
  })

  it("website.R3.S1 an edited English page flags its translation", () => {
    const root = site()
    put(root, "site/content/en/index.md", "# agent-kit\n\nRun `agent-kit init`, then `agent-kit doctor`.\n")
    assert.deepEqual(checkDocs(root, SOURCE).stale, ["site/content/es/index.md"])
    stamp(root, ["site/content/es/index.md"])
    assert.deepEqual(checkDocs(root, SOURCE).stale, [])
  })

  it("website.R3.S2 no change since translation → nothing stale; whole check clean", () => {
    const r = checkDocs(site(), SOURCE)
    assert.deepEqual(r, { missing: [], stale: [], orphans: [], generated: [], undocumented: [], ok: true })
  })

  it("website.R5.S1 every CLI command is explained outside the reference", () => {
    assert.deepEqual(checkDocs(site(), SOURCE).undocumented, [])
  })

  it("website.R5.S2 a command only in the reference is undocumented", () => {
    const more = { ...SOURCE, help: `${HELP}  agent-kit qa <sync|run>   QA checklist\n` }
    const root = site(more)
    assert.deepEqual(checkDocs(root, more).undocumented, ["qa"])
  })

  it("Boundaries: the hash ignores line endings and trailing space; Spanish pages without English are orphans", () => {
    assert.equal(pageHash("a\r\nb  \n"), pageHash("a\nb\n"))
    const root = site()
    put(root, "site/content/es/extra.md", "# extra\n")
    assert.deepEqual(checkDocs(root, SOURCE).orphans, ["site/content/es/extra.md"])
  })

  it("Many: the real kit source yields every reference page", () => {
    const pages = Object.keys(generatedPages(readSource()))
    assert.deepEqual(pages, [
      "site/content/en/4.reference/1.cli.md",
      "site/content/en/4.reference/2.configuration.md",
      "site/content/en/4.reference/3.skills.md",
      "site/content/en/4.reference/4.hooks.md",
      "site/content/en/4.reference/5.scripts.md",
      "site/content/en/4.reference/6.changelog.md",
    ])
    const src = readSource()
    assert.ok(src.skills.some((s) => s.name === "stack-nuxt-supabase" && s.origin === "template"))
    assert.ok(parseHelp(src.help).some((c) => c.cmd === "specs"))
    assert.ok(readFileSync(new URL("./docs.mjs", import.meta.url), "utf8").includes("@summary"))
  })
})
