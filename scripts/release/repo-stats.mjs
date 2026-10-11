#!/usr/bin/env node
// @name: repo-stats
// @summary: Writes the website's stats.json at build time: GitHub stars and forks, and clones of the last 14 days when a token with push access is set (GitHub's traffic API needs one). The homepage shows them; stars and forks also refresh live in the browser.
// @usage: GITHUB_TOKEN=… TRAFFIC_TOKEN=… node scripts/release/repo-stats.mjs <out.json> [--repo razcue/agent-kit]
// @tags: [release, site]
// @test: repo-stats.test.mjs
import { writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

/** Pure: repo + clones API bodies → the stats the page shows (fields missing when unknown). */
export function toStats(repo, clones, updated = new Date().toISOString()) {
  const out = {}
  if (Number.isInteger(repo?.stargazers_count)) out.stars = repo.stargazers_count
  if (Number.isInteger(repo?.forks_count)) out.forks = repo.forks_count
  if (Number.isInteger(clones?.count)) {
    out.clones = clones.count
    out.clonesUnique = clones.uniques
  }
  out.updated = updated
  return out
}

async function get(url, token) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    return await res.json()
  } catch {
    return null
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [out, ...rest] = process.argv.slice(2)
  const repo = rest.includes("--repo") ? rest[rest.indexOf("--repo") + 1] : "razcue/agent-kit"
  if (!out) {
    console.error("usage: repo-stats.mjs <out.json> [--repo owner/name]")
    process.exit(2)
  }
  const api = `https://api.github.com/repos/${repo}`
  const traffic = process.env.TRAFFIC_TOKEN
  const stats = toStats(await get(api, process.env.GITHUB_TOKEN), traffic ? await get(`${api}/traffic/clones`, traffic) : null)
  writeFileSync(out, `${JSON.stringify(stats, null, 2)}\n`)
  console.log(`${out}: ${JSON.stringify(stats)}`)
}
