# Tasks — Detect the main (production) branch at setup

- [x] T1 (setup.R1, setup.R2) test: `test/setup-branch.test.mjs`
  - evidence: red first — `pickMainBranch` not exported
- [x] T2 (setup.R1, setup.R2) implement: `pickMainBranch`, `gitBranches`, init / upgrade wiring
  - evidence: 7 of 8 pass; the 8th checked too loosely (`/main branch:/` also matches the plan line) — narrowed to the correction message; `npm test` → 186 pass
- [x] T3 (setup.R3) test + implement: unasked fields kept (found by running the kit's upgrade on itself: `testCommand` was dropped)
  - evidence: red → green; `npm test` → 187 pass
- [x] T4 dogfood: `node cli/index.mjs upgrade . --yes` on the kit repo
  - evidence: "main branch: "main" doesn't exist → "master"", 001 / 002 moved to `work/changes/`, AGENTS.md block and `work/README.md` refreshed, `qa` recorded; second run changed nothing
- [x] T5 kit branch → `master` (Pages trigger, edit links, README, guides); docs EN + ES
  - evidence: `docs.mjs check` ✓

## Verification
| Scenario | Evidence (test or check) | Result |
|----------|--------------------------|--------|
