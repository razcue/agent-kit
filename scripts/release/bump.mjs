#!/usr/bin/env node
// @name: bump
// @summary: Sets the kit version in package.json, the plugin manifest and the marketplace entry at once, syncs the website figures, and checks CHANGELOG.md has a section for it.
// @usage: node scripts/release/bump.mjs <major.minor.patch>
// @tags: [release]
// @test: bump.test.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { syncSite } from "./site.mjs"

export const FILES = ["package.json", "plugin/.claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]

/** Replaces every `"version": "x.y.z"` in a JSON text. */
export function setVersion(text, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`not a semver version: "${version}"`)
  const next = text.replace(/("version":\s*")\d+\.\d+\.\d+(")/g, `$1${version}$2`)
  if (next === text && !text.includes(`"version": "${version}"`)) throw new Error("no version field found")
  return next
}

export const hasChangelogEntry = (changelog, version) => new RegExp(`^## ${version.replaceAll(".", "\\.")}\\b`, "m").test(changelog)

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const [version] = process.argv.slice(2)
    for (const f of FILES) writeFileSync(f, setVersion(readFileSync(f, "utf8"), version))
    console.log(`version ${version} → ${FILES.join(", ")}`)
    const site = syncSite()
    if (site.length) console.log(`site figures → ${site.join(", ")}`)
    if (!hasChangelogEntry(readFileSync("CHANGELOG.md", "utf8"), version)) {
      console.error(`CHANGELOG.md has no "## ${version}" section yet`)
      process.exit(1)
    }
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
