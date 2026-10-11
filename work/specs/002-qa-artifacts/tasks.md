# Tasks — QA dimension: living checklist and test data

- [x] T1 (AC-3..AC-7) test: `test/qa.test.mjs` — checklist, fixtures, runs, status/re-check, html export
  - evidence: red first — ERR_MODULE_NOT_FOUND qa.mjs
- [x] T2 (AC-3..AC-7) implement: `plugin/scripts/qa.mjs` (`sync`, `run`, `status`, `gaps`, `checklist.html`)
  - evidence: `node --test test/qa.test.mjs` → 6 pass; embedded page script parses, `</script>` escaped
- [x] T3 (AC-11) test + implement: `qaPreflight` + preflight warnings
  - evidence: `npm test` → 149 pass (test fixture fixed: the project needed its living specs)
- [x] T4 (AC-8, AC-9) templates `templates/qa/supabase-test-data/{env,seed,purge}.sql, README.md`, `templates/qa/work-qa/README.md`; `_env` in the monorepo init migration
  - evidence: structural test (BEGIN → guard first → COMMIT; starts_with, no LIKE; env.sql sets no value) → pass. Live SQL run not possible here (no Postgres server, Docker down)
- [x] T5 (AC-1, AC-2, AC-8, AC-10) test: `test/qa-init.test.mjs` (defaults, Supabase detection, changed answers, upgrade)
  - evidence: red first — 4 fail
- [x] T6 (AC-1, AC-2, AC-8, AC-10) implement: `init` questions + flags (`--qa-checklist`, `--test-data`, `--test-prefix`, `--test-data-dir`), `usesSupabase`, `upgrade` QA questions
  - evidence: `npm test` → 154 pass
- [x] T7 (AC-10) session context `qaLine`; `specs.mjs merge` refreshes the checklist; `agent-kit qa`; `doctor --fix` syncs
- [x] T8 skills: `spec` (fixtures + seed/purge task), `feature` (sync), stack skill `references/test-data.md` (Supabase CLI `db query -f` verified with CLI 2.118 `--help`)
- [x] T9 docs: README, site EN/ES (`#specs`), llms.txt, CHANGELOG 0.13.0, version bump
  - evidence: `npm test` → 155 pass (site test: same sections in both languages)
- [x] T10 release checks: monorepo scaffold `npm install` / `check` / `build` → exit 0 (11 tests); `live.mjs` PASS; `spec-flow.mjs --lane both` ✓✓; triggers haiku 15/16 (feature flaky), sonnet 4/4 on the changed skills

## Verification
| AC | Evidence (test or check) | Result |
|----|--------------------------|--------|
