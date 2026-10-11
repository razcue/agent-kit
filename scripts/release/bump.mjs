#!/usr/bin/env node
// @name: bump
// @summary: Sets the kit version in package.json, the plugin manifest and the marketplace entry at once, regenerates the website's reference pages, and checks CHANGELOG.md has a section for it.
// @usage: node scripts/release/bump.mjs <major.minor.patch>
// @tags: [release]
// @test: bump.test.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { checkDocs, syncDocs } from "./docs.mjs"

export const FILES = ["package.json", "plugin/.claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]

/** Replaces every `"version": "x.y.z"` in a JSON text. */
export function setVersion(text, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`not a semver version: "${version}"`)
  const next = text.replace(/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${version}$2`)
  if (next === text && !text.includes(`"version": "${version}"`)) throw new Error("no version field found")
  return next
}

/** Pure: every pinned `@razcue/agent-kit@x.y.z` command gets the new version. */
export const pinCliVersion = (text, version) => text.replace(/@razcue\/agent-kit@\d+\.\d+\.\d+/g, `@razcue/agent-kit@${version}`)

/** Re-pins the CLI commands written inside the plugin folder (skills, knowledge, README, scripts). */
export function pinPluginCli(version, dir = "plugin") {
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
  const changed = []
  for (const f of walk(dir).filter((p) => /\.(md|mjs|json)$/.test(p))) {
    const text = readFileSync(f, "utf8")
    const next = pinCliVersion(text, version)
    if (next !== text) {
      writeFileSync(f, next)
      changed.push(f)
    }
  }
  return changed
}

export const hasChangelogEntry = (changelog, version) => new RegExp(`^## ${version.replaceAll(".", "\\.")}\\b`, "m").test(changelog)

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const [version] = process.argv.slice(2)
    for (const f of FILES) writeFileSync(f, setVersion(readFileSync(f, "utf8"), version))
    console.log(`version ${version} → ${FILES.join(", ")}`)
    const pinned = pinPluginCli(version)
    if (pinned.length) console.log(`CLI commands re-pinned → ${pinned.join(", ")}`)
    const pages = syncDocs()
    if (pages.length) console.log(`docs reference → ${pages.join(", ")}`)
    const stale = checkDocs().stale
    if (stale.length) console.log(`translate, then \`docs.mjs stamp\`: ${stale.join(", ")}`)
    if (!hasChangelogEntry(readFileSync("CHANGELOG.md", "utf8"), version)) {
      console.error(`CHANGELOG.md has no "## ${version}" section yet`)
      process.exit(1)
    }
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
