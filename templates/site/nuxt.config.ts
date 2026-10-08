// Simple content site: every Markdown file in content/ is a page. Built to
// static HTML with `npm run generate`.
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/content"],
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  // Node's built-in SQLite: no native module to compile.
  content: { experimental: { sqliteConnector: "native" } },
  app: {
    head: { htmlAttrs: { lang: "__LANG__" }, title: "__NAME__" },
  },
  nitro: { prerender: { crawlLinks: true, routes: ["/"] } },
})
