// Help / wiki site: Docus (Nuxt Content + Nuxt UI). Pages are Markdown in content/.
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  extends: ["docus"],
  // Sitemap and OG images need the public URL; set NUXT_SITE_URL per environment.
  site: {
    name: "__NAME__ docs",
    url: process.env.NUXT_SITE_URL || "http://localhost:3002",
  },
})
