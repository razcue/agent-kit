# Tasks — Documentation website on Docus (full docs, i18n)

- [x] T1 (website.R2.S2, R3.S1, R3.S2, R4.S1, R4.S2, R4.S3, R5.S1, R5.S2) test: `scripts/release/docs.test.mjs`
  - evidence: red first — module missing; then 11 pass
- [x] T2 implement: `scripts/release/docs.mjs` (`sync`, `check`, `stamp`), `cli/lib/help.mjs` (+ `test/help.test.mjs`, `test/index.test.mjs`)
  - evidence: `npm test` → 174 pass
- [x] T3 (website.R1.S1, R1.S2, R1.S3) site skeleton: Docus 5 + `@nuxtjs/i18n` (en, es), `generate:pages` (base `/agent-kit/`), `scripts/release/site-base.mjs` (+ test), pages workflow
  - evidence: `npm run generate:pages` → 275 routes, exit 0; link check over 66 HTML files → 0 broken refs; Docus 5.14 base-path gaps found and handled (agent-discovery needs an origin; llms / canonical / favicon fixed post-build; robots.txt off under a base path)
- [x] T4 (website.R5.S1) content EN: landing, getting started (4), concepts (9), guides (11), reference (6 generated + templates)
- [x] T5 (website.R2.S1, R2.S3) content ES: every page translated and stamped
  - evidence: `docs.mjs check` → ✓ complete and current in every locale
- [x] T6 (website.R6.S1, R6.S2) `llms.sections` limited to `landing_en` + `docs_en`
  - evidence: `llms.txt` / `llms-full.txt` in the build, 0 `/es/` references; links carry `/agent-kit/`
- [x] T7 (website.R7.S1, R7.S2) `site/vercel.json`, `mcp.name`
  - evidence: `nuxt build` + `node .output/server/index.mjs` → MCP `initialize` (serverInfo agent-kit-docs), `tools/list` = get-page, list-pages; `list-pages {locale: en}` → 31 pages; `get-page /es/concepts/notation` → the page. Static build logs "mcp-toolkit not compatible with nuxt generate" (no /mcp). Vercel project not linked yet (user).
- [x] T8 release wiring (bump → docs sync), README, AGENTS.md, CHANGELOG 0.14.0, version 0.14.0
  - evidence: `bump.mjs 0.14.0` → ok; `npm test` → 174 pass

## Verification
| Scenario | Evidence (test or check) | Result |
|----------|--------------------------|--------|
| website.R2.S1 | build check: every page exists at the same path under `/agent-kit/en/` and `/agent-kit/es/`; pages carry `hreflang` alternates to the other locale; Docus's language switcher (not clicked in a browser here) | ✅ |
| website.R2.S3 | build check: `es/reference/cli.html` shows "En esta página", "Buscar…", "Editar esta página", "Copiar página" | ✅ |
| website.R6.S1 | build check: `.output/public/llms.txt` and `llms-full.txt` generated, links under `https://razcue.github.io/agent-kit/` | ✅ |
| website.R6.S2 | build check: `grep -c /es/ llms-full.txt` → 0; sections Overview + Documentation (English collections only) | ✅ |
| website.R7.S1 | local server build: MCP `list-pages` → 31 English pages with title, path, description (Vercel deployment pending) | ✅ |
