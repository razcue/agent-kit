---
status: done # in-progress | done
---

# Turn off Docus's AI assistant on the Vercel deployment

- [x] Living spec: `website.R7` also says no AI assistant; scenario `website.R7.S3`
  - evidence: `specs.mjs lint website` → 0 errors
- [x] Test first: `test/site.test.mjs` "website.R7.S3 …" checks `docus.assistant.enabled: false`
  - evidence: red, then green after the config line
- [x] `site/nuxt.config.ts`: `docus: { assistant: { enabled: false } }`
  - evidence: server build with `VERCEL_OIDC_TOKEN` set (Vercel's condition) → `POST /__docus__/assistant` 404, no "Ask AI" on the page, MCP `tools/list` → get-page, list-pages
- [x] CHANGELOG 0.14.3 (EN + ES)
