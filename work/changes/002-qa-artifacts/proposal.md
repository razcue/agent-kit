---
id: 002-qa-artifacts
status: done # draft | approved | done | dropped
depends: 001-living-specs
merged: 2026-10-11
---

# QA dimension: living checklist and test data

## Why
Specs prove each scenario with a test or a check, but nothing lets a human QA the whole product: no list of everything it does and no realistic data to try it on. Since living specs (spec 001) state the whole behaviour, the QA checklist and the test data can be derived from them and evolve with every change. Generic for any project using the kit; test data only where a database is configured (Supabase for now).

## What changes
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

## Capabilities
- `qa` — new: the QA checklist, QA runs and the Supabase test data. Acceptance criteria are scenarios in `specs/qa.md` (converted from the original `AC-n` list).

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
