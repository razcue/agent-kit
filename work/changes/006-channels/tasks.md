# Tasks — Every channel points to the others

- [x] T1 (channels.R1–R4) test: `test/channels.test.mjs`, root page in `scripts/release/site-base.test.mjs`
  - evidence: red first — `cli/lib/channels.mjs` missing, `pickLocale` missing
- [x] T2 (channels.R2) implement: root page; the older "Many" test now also expects `index.html` (intended)
  - evidence: site-base 6 / 6
- [x] T3 (channels.R1, R3, R4) channels module, help footer, init output, plugin `.mcp.json` + README, repo README, npm metadata, docs pages, llms description
  - evidence: `npm test` → 198 pass; `claude plugin validate --strict ./plugin` ✔
- [x] T4 Pages build in a clean copy
  - evidence: 283 routes, 69 HTML files, 0 broken refs; `index.html` → `/agent-kit/en/` (no JS) or the browser's locale; `llms.txt` names the MCP endpoint

## Verification
| Scenario | Evidence (test or check) | Result |
|----------|--------------------------|--------|
| channels.R3.S2 | live: POST https://razcue-agent-kit.vercel.app/mcp `tools/call list-pages {locale: en}` → 31 pages; `get-page /en/getting-started/installation` → "Installation" | ✅ |
