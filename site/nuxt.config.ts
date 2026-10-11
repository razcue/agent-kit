// agent-kit documentation: Docus 5 (Nuxt Content + Nuxt UI), English + Spanish.
// GitHub Pages: `nuxt generate` with NUXT_APP_BASE_URL=/agent-kit/ (static, no /mcp).
// Vercel: `nuxt build` (server) — serves Docus's MCP server at /mcp.
export default defineNuxtConfig({
  extends: ["docus"],
  modules: ["@nuxtjs/i18n"],
  compatibilityDate: "2025-07-15",
  site: {
    name: "agent-kit",
    // An origin only: the base path comes from NUXT_APP_BASE_URL (/agent-kit/ on GitHub Pages).
    url: process.env.NUXT_SITE_URL || "https://razcue.github.io",
  },
  // Docus's MCP server (/mcp) — served by the Vercel deployment; the static build has none.
  mcp: { name: "agent-kit-docs" },
  // llms.txt / llms-full.txt: the English pages only, each once (the Spanish ones mirror them).
  llms: {
    domain: process.env.NUXT_SITE_URL || "https://razcue.github.io",
    title: "agent-kit",
    description: "A minimal harness for agent-driven development with Claude Code: an npx CLI (npx @razcue/agent-kit init) that sets up a project from fixed questions, and a plugin (/plugin install agent-kit --marketplace razcue/agent-kit) with skills, hooks, living specs, QA and scoped knowledge. MCP server for these docs: https://razcue-agent-kit.vercel.app/mcp",
    sections: [
      { title: "Overview", contentCollection: "landing_en" },
      { title: "Documentation", contentCollection: "docs_en" },
    ],
  },
  // robots.txt only makes sense at a domain root, not under GitHub Pages' /agent-kit/.
  robots: { robotsTxt: !process.env.NUXT_APP_BASE_URL || process.env.NUXT_APP_BASE_URL === "/" },
  i18n: {
    // hreflang / canonical links: origin + the GitHub Pages base path.
    baseUrl: (process.env.NUXT_SITE_URL || "https://razcue.github.io") + (process.env.NUXT_APP_BASE_URL || "/").replace(/\/$/, ""),
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English" },
      { code: "es", name: "Español" },
    ],
  },
})
