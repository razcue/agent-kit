# Tasks — Ready the plugin for Anthropic's directory

- [x] T1 (plugin.R1, plugin.R2, plugin.R3) test: `test/plugin-listing.test.mjs`
  - evidence: red first — `pinCliVersion` not exported
- [x] T2 (plugin.R2, plugin.R3) implement: `runnerFor`, `vitestCommand`, `pinCliVersion`, `pinPluginCli`; pinned docs; notice without launcher
  - evidence: 3 of 5 pass (R1 pending files)
- [x] T3 (plugin.R1) README, LICENSE, manifest, marketplace entry
  - evidence: 5 / 5; `claude plugin validate --strict ./plugin` → ✔ (suggested install line added)
- [x] T4 release 0.14.1 (CHANGELOG EN + ES, `bump.mjs` re-pinned 4 commands)
  - evidence: `npm test` → 192 pass (after restoring `site/vercel.json`, which had a stray line appended outside this work)

## Verification
| Scenario | Evidence (test or check) | Result |
|----------|--------------------------|--------|
