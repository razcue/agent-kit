// Public website: prerendered to static HTML (`npm run generate`).
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  extends: ["@__NAME__/ui"],
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "__NAME__",
      meta: [{ name: "description", content: "__NAME__" }],
    },
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ["/"] },
  },
})
