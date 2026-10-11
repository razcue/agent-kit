# Plan — QA dimension: living checklist and test data

## Changes
| Area | File | Change |
|------|------|--------|
| Script | `plugin/scripts/qa.mjs` (+ `qa.test.mjs`) | `sync` (checklist.md + checklist.html), `run`, `status`, `gaps`; reads living specs via `specs.mjs`, fixtures from `-- @fixture` tags |
| Script | `plugin/scripts/preflight.mjs` | QA warnings (fixture gaps, migrations without seed/purge change, checklist out of sync) |
| Script | `plugin/scripts/config.mjs` | `qa` defaults + `usesSupabase` |
| CLI | `cli/lib/init.mjs`, `upgrade.mjs` | QA questions + flags; create `work/qa/`, `supabase/test-data/` (never overwrite) |
| Templates | `templates/base/work/qa/README.md`; `templates/qa/supabase-test-data/{env,seed,purge}.sql, README.md`; monorepo init migration gets `_env` | skeletons with the guard + transaction + marker convention |
| Skills | `spec`, `feature`; `templates/skills/stack-nuxt-supabase/references/test-data.md` | fixture planning (ZOMBIES on data), sync on close, CLI/psql command offered with confirmation |
| Docs | site EN/ES, README, CHANGELOG | QA dimension |

## Decisions
- Checklist is a generated view of the living specs; human results live only in run files → no merge of hand edits, history kept per run.
- Scenario text hash in each run → "re-check" when a spec changes after a pass.
- Test data goes through app RPCs (keeps invariants) and is removable by marker; `_env` guard in every environment.
- SQL Editor is the supported apply path; CLI/psql only as an offered, confirmed command for seed/purge (never a full reset).

## Risks
- Fixture tags drift from scenarios → `qa.mjs gaps` + preflight warning.
- Purge misses a new table → preflight warns when migrations change without purge changes; README documents children-first order.
- Supabase CLI command details → verify against current docs during implementation (kit rule).
