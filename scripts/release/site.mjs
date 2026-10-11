#!/usr/bin/env node
// @name: site
// @summary: Syncs the kit version and skill count into the website (data-ak spans in both languages, llms.txt) so the site never states stale figures.
// @usage: node scripts/release/site.mjs   (bump.mjs runs it too)
// @tags: [release, site]
// @test: site.test.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = fileURLToPath(new URL("../../", import.meta.url))
export const SITE_FILES = ["site/index.html", "site/es/index.html", "site/llms.txt"]

/** The real figures: package version and number of plugin skills. */
export function figures(root = ROOT) {
  return {
    version: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
    skills: readdirSync(join(root, "plugin", "skills")).length,
    allSkills: readdirSync(join(root, "plugin", "skills")).length + readdirSync(join(root, "templates", "skills")).length,
  }
}

/** Pure: writes figures into `data-ak` spans (HTML) or "with N skills" (llms.txt). */
export function syncText(text, { version, skills, allSkills = skills }) {
  return text
    .replace(/(data-ak="version">)[^<]*(<)/g, `$1${version}$2`)
    .replace(/(data-ak="skills">)[^<]*(<)/g, `$1${skills}$2`)
    .replace(/(data-ak="all-skills">)[^<]*(<)/g, `$1${allSkills}$2`)
    .replace(/(plugin with )\d+( skills)/g, `$1${skills}$2`)
}

export function syncSite(root = ROOT, f = figures(root)) {
  const changed = []
  for (const file of SITE_FILES) {
    const path = join(root, file)
    const before = readFileSync(path, "utf8")
    const after = syncText(before, f)
    if (after !== before) {
      writeFileSync(path, after)
      changed.push(file)
    }
  }
  return changed
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const changed = syncSite()
  console.log(changed.length ? `updated ${changed.join(", ")}` : "site figures already current")
}
