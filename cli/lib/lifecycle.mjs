// Pure helpers for upgrade / uninstall / optional MCP — kept apart so they can be tested.
import { compareVersions } from "../../plugin/scripts/config.mjs"
import { GIT_RULES } from "./init.mjs"

export { compareVersions }

const BLOCK = /\n*<!-- agent-kit:start -->[\s\S]*?<!-- agent-kit:end -->\n*/

/** CHANGELOG sections with from < version ≤ to, newest first. */
export function changesSince(changelog, from, to) {
  return changelog
    .split(/^(?=## \d+\.\d+\.\d+)/m)
    .filter((s) => s.startsWith("## "))
    .filter((s) => {
      const v = s.match(/^## (\d+\.\d+\.\d+)/)[1]
      return compareVersions(v, from) > 0 && compareVersions(v, to) <= 0
    })
    .map((s) => s.trim())
}

/** AGENTS.md without the managed block (null when there was none). */
export function removeBlock(text) {
  if (!BLOCK.test(text)) return null
  const next = text.replace(BLOCK, "\n\n").replace(/\n{3,}/g, "\n\n").trim()
  return next ? `${next}\n` : ""
}

/** .claude/settings.json without what agent-kit added (null = nothing left). */
export function stripSettings(settings) {
  const s = structuredClone(settings ?? {})
  if (s.extraKnownMarketplaces) delete s.extraKnownMarketplaces["agent-kit"]
  if (s.enabledPlugins) delete s.enabledPlugins["agent-kit@agent-kit"]
  const managed = new Set(Object.values(GIT_RULES).flatMap((r) => [...(r.deny ?? []), ...(r.ask ?? [])]))
  if (s.permissions)
    for (const kind of ["deny", "ask"]) {
      if (!s.permissions[kind]) continue
      s.permissions[kind] = s.permissions[kind].filter((r) => !managed.has(r))
      if (!s.permissions[kind].length) delete s.permissions[kind]
    }
  for (const key of ["extraKnownMarketplaces", "enabledPlugins", "permissions"])
    if (s[key] && !Object.keys(s[key]).length) delete s[key]
  return Object.keys(s).length ? s : null
}

export const SUPABASE_REF = /^[a-z0-9]{20}$/

/** .mcp.json with a read-only, project-scoped Supabase server (hosted, OAuth on first use). */
export function withSupabaseMcp(mcp, projectRef) {
  if (!SUPABASE_REF.test(projectRef)) throw new Error("Supabase project ref: the 20-character id in the dashboard URL")
  return {
    ...mcp,
    mcpServers: {
      ...mcp?.mcpServers,
      supabase: { type: "http", url: `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=true` },
    },
  }
}
