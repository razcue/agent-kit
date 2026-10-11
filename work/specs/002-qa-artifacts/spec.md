---
id: 002-qa-artifacts
status: done # draft | approved | done | dropped
depends: 001-living-specs
---

# QA dimension: living checklist and test data

## Problem
Specs prove each scenario with a test or a check, but nothing lets a human QA the whole product: no list of everything it does and no realistic data to try it on. Since living specs (spec 001) state the whole behaviour, the QA checklist and the test data can be derived from them and evolve with every change. Generic for any project using the kit; test data only where a database is configured (Supabase for now).

## Scope
- In:
  - **Config** (`agent-kit.json`, asked at `init`, changeable by re-running init or `upgrade`, flags `--qa-checklist`, `--test-data`): `qa: { checklist: true, testData: true }`. Both default to `true`; `testData` only takes effect when the project uses Supabase (otherwise it is stored `false` and not asked).
  - **`work/qa/`** (next to `work/specs/`):
    - `checklist.md` — generated from the living specs: one item per scenario (`auth.R1.S2`), grouped by capability → requirement, showing the EARS sentence, the Given/When/Then steps, the ZOMBIES tag and the fixture that provides its data. A view, never hand-edited.
    - `runs/YYYY-MM-DD[-n].md` — a QA pass: every scenario unticked, a result (`pass` / `fail` / `blocked` / `n/a`) and a note per item, plus the scenario text's hash at the time of the run.
    - `checklist.html` — offline, self-contained page of the same items: tick, note, export the run as Markdown in the run-file format.
  - **`plugin/scripts/qa.mjs`** (no deps): `sync` (regenerate checklist.md/html), `run` (new run file), `status` (latest result per scenario; `re-check` when its text changed since that result, `never run` otherwise), `gaps` (scenarios needing data with no fixture, fixtures pointing to unknown scenarios).
  - **Test data** (`qa.testData` on + Supabase) in `supabase/test-data/`:
    - `env.sql` — creates `public._env` (one row: `dev | test | staging | production`) — present in every DB environment, value set per environment.
    - `seed.sql` / `purge.sql` — one transaction each; start with the guard (refuse unless `_env` exists and is not `production`); create data through the app's RPCs; every row marked (`TEST_` code prefix or the marker the project documents); dates relative to `current_date`; purge deletes only marked rows, children first; seed is re-runnable (purge-then-seed).
    - Fixtures are sections tagged with the scenarios they serve and their ZOMBIES category: `-- @fixture auth.R1.S2 @boundary`. ZOMBIES applies to the data: zero (an entity with no children), one, many, boundaries (limits, period edges), interface (every role/scope), exceptions (inactive, cancelled, invalid states).
    - `README.md` — how to apply in the SQL Editor (the only supported path), what each fixture covers.
  - **Supabase CLI / psql**: when available locally, the skills show the command that runs only `seed.sql` / `purge.sql` against the chosen DB and ask before running it; they never use commands that reset the whole database. Commands verified against the Supabase CLI docs.
  - **Skills**: `spec` — after approval, plan the fixtures for the change's scenarios (ZOMBIES), add tasks "extend seed/purge for <ids>" when it touches schema/RPCs or needs data; on close, `qa.mjs sync`. `feature` — a behaviour change re-syncs the checklist. `preflight` reads `qa.mjs gaps`.
  - **Preflight**: warning for scenarios without a fixture (when they need data), for migrations changed without seed/purge changes, and for a checklist out of sync with the living specs.
  - **Templates**: monorepo app with Supabase ships `supabase/test-data/` skeleton and `env.sql` folded into the init migration; `stack-nuxt-supabase` gets `references/test-data.md`. Any project gets `work/qa/` when `qa.checklist` is on.
- Out:
  - Running the checklist with a browser agent (Playwright MCP / Playwright agents) — later; the checklist keeps the shape of a Playwright test plan (scenario = steps + expected result).
  - Databases other than Supabase.
  - Generating seed SQL by script: fixtures need judgment, the agent writes them following the reference.
  - Applying SQL without the user (SQL Editor by hand, or a command the user approves).

## Acceptance criteria
- **AC-1** Given `init` on a project that uses Supabase, When the user accepts the defaults, Then `agent-kit.json` has `qa: { checklist: true, testData: true }`; on a project without Supabase `testData` is `false` and not asked.
- **AC-2** Given `init --qa-checklist false` or a re-run of `init` changing the answer, When it finishes, Then `agent-kit.json` reflects the new value and existing `work/qa/` and `supabase/test-data/` files are left untouched.
- **AC-3** Given living specs with 2 capabilities and 5 scenarios, When `qa.mjs sync` runs, Then `checklist.md` lists the 5 scenario IDs grouped by capability with steps and ZOMBIES tag, and a second run changes nothing.
- **AC-4** Given a fixture tagged `-- @fixture auth.R1.S2 @boundary` in `seed.sql`, When `sync` runs, Then the item `auth.R1.S2` shows that fixture; `qa.mjs gaps` lists scenarios without fixtures and fixtures naming unknown scenarios.
- **AC-5** Given `qa.mjs run`, When it finishes, Then `work/qa/runs/<today>.md` lists every scenario unticked with its text hash, and a second run the same day gets the suffix `-2`.
- **AC-6** Given a run where `auth.R1.S2` passed, When the scenario's text changes in the living spec, Then `qa.mjs status` shows `auth.R1.S2 re-check`; an unrun scenario shows `never run`.
- **AC-7** Given `checklist.html` opened offline, When items are ticked and noted, Then "Export" produces Markdown that `qa.mjs status` reads like a run file.
- **AC-8** Given `qa.testData: true` on Supabase, When `init`/`upgrade` runs, Then `supabase/test-data/{env,seed,purge}.sql` + README exist (never overwritten), seed/purge each run in one transaction and begin with the `_env` guard.
- **AC-9** Given `_env` missing or set to `production`, When seed.sql or purge.sql runs, Then it raises an error before changing any row.
- **AC-10** Given `qa.testData: false` or no Supabase, When the `spec` skill plans a schema change, Then no test-data task is added and no SQL file is created.
- **AC-11** Given migrations changed in the diff without seed/purge changes (testData on), or a checklist out of sync, When `preflight` runs, Then it warns and names the files.

## Open questions
- [x] Q1 Location → `work/qa/`, next to `work/specs/`.
- [x] Q2 Checklist form → configurable at install, default on; Markdown is the source, HTML generated from it.
- [x] Q3 Non-production detection → `_env` table in every DB environment.
- [x] Q4 Apply path → SQL Editor; skills offer the CLI/psql command for seed/purge only and ask before running it.
- [x] Q5 Defaults → configurable at install, both `true`.
- [x] Q6 → no project-specific adoption; generic solution only.
- [x] Q7 Marker → preset `TEST_` code prefix, stored in config (`qa.testPrefix`), changeable by re-running init.

## Links
- Depends on: [[001-living-specs]]
- Knowledge: [[idempotent-migrations]], [[zombies-testing]]
