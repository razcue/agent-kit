# Tasks — Living specs and standard notation (EARS + BDD/ATDD + ZOMBIES)

- [x] T1 (AC-1, AC-2) test: `test/specs.test.mjs` — EARS patterns, scenario shape, ZOMBIES tag, duplicate/foreign IDs
  - evidence: red first — `node --test test/specs.test.mjs` → ERR_MODULE_NOT_FOUND specs.mjs
- [x] T2 (AC-1, AC-2) implement: `plugin/scripts/specs.mjs` parse + `lint`
  - evidence: `node --test test/specs.test.mjs` → 14 pass
- [x] T3 (AC-3, AC-4) test: merge ADDED/MODIFIED/REMOVED, retire ids, idempotent, conflicts write nothing
- [x] T4 (AC-3, AC-4) implement: `mergeDelta` / `mergeChange`
  - evidence: same run, 14 pass; sample merge output reviewed (retired: [auth.R1, auth.R2.S2])
- [x] T5 (AC-5) test: `next` over living, retired and pending-delta ids
- [x] T6 (AC-5) implement: `nextId`
- [x] T7 (AC-6) test: scenario trace by test name and ✅ rows (`test/specs.test.mjs`, `test/work-changes.test.mjs`)
- [x] T8 (AC-6) implement: `traceScenarios`, `list`; `work.mjs` collects `work/changes/` + legacy `work/specs/NNN-*`, `new change` (`spec` alias)
  - evidence: `npm test` → 137 pass
- [x] T9 (AC-7) test: preflight — unmerged/uncovered done change = violation; living gaps and lint = warnings
- [x] T10 (AC-7) implement: `workGaps` + `analyze` (`plugin/scripts/preflight.mjs`)
- [x] T11 (AC-8) test: legacy layout move + `NNN/AC-n` trace; CLI `upgrade` integration
- [x] T12 (AC-8) implement: `migrateWorkLayout`, called by `cli/lib/upgrade.mjs`
  - evidence: `node --test test/work-changes.test.mjs` → 7 pass
- [x] T13 (AC-9, AC-10) skills `spec` (+ `templates/{proposal,delta,plan,tasks}.md`, `references/notation.md`), `feature`, `start`, `tdd`, `adopt`, `commit`, reviewer agent; knowledge `ears-requirements`, `gherkin-scenarios`, `work-lanes`
  - evidence: `npm run knowledge:check` → 0 errors; plugin lint tests pass
- [x] T14 (AC-9, AC-10) e2e: `scripts/e2e/spec-flow.mjs --lane spec|feature`
  - evidence: `node scripts/e2e/spec-flow.mjs --lane spec --model haiku` → ✓ change 001-invoices, 2 deltas, lint clean, all 7 ZOMBIES tags used; `--lane feature` → ✓ "Log out" in code and living spec
- [x] T15 session context (`specsSummary`, lanes, notation), AGENTS.md block, `work/README.md` (managed), CLI `specs` command
  - evidence: `npm test` → 142 pass; site / README updated with spec 002 (one docs pass)

## Verification
| AC | Evidence (test or check) | Result |
|----|--------------------------|--------|
| AC-9 | live: `node scripts/e2e/spec-flow.mjs --lane spec --model haiku` → ✓ (proposal + lint-clean EARS / Given-When-Then / ZOMBIES deltas) | ✅ |
| AC-10 | live: `node scripts/e2e/spec-flow.mjs --lane feature --model haiku` → ✓ (living spec renamed, lint clean) | ✅ |
