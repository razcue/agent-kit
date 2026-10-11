# Delta — qa

## Purpose
QA that follows the living specs: a generated checklist, dated QA runs, and Supabase test data (seed / purge) that can't run on production.

## ADDED Requirements

### qa.R1 — QA settings at setup
When `init` runs, the CLI shall store `qa.checklist` and `qa.testData`, both on by default, and turn `qa.testData` on only for projects that use Supabase.

#### qa.R1.S1 — Defaults on a Supabase project @simple
- Given a new app monorepo with the `app` workspace
- When `agent-kit init --yes` runs
- Then `qa` is `{ checklist: true, testData: true, testPrefix: "TEST_", testDataDir: "supabase/test-data" }` and `work/qa/` exists

#### qa.R1.S2 — No Supabase, no test data @exception
- Given a blank project or a content site
- When `init` runs, even with `--test-data true`
- Then `qa.testData` is false and no test-data folder exists; an existing project using `@supabase/supabase-js` is detected

### qa.R2 — Changed answers keep files
When the QA answers change by re-running `init`, the CLI shall store the new values and leave existing `work/qa/` and test-data files untouched.

#### qa.R2.S1 — Answers changed, files kept @boundary
- Given a project with an edited `seed.sql` and the prefix `QA_`
- When `init --qa-checklist false --test-data false` runs
- Then both settings are false, the prefix stays, and `seed.sql` and `work/qa/` are unchanged

### qa.R3 — Checklist from the living specs
When `qa.mjs sync` runs, the CLI shall write `work/qa/checklist.md` and `checklist.html` with one item per living-spec scenario, grouped by capability and requirement, and change nothing on a second run.

#### qa.R3.S1 — One item per scenario, stable @many
- Given living specs with 2 capabilities and 5 scenarios
- When the checklist is generated twice
- Then it lists the 5 scenarios with their steps and ZOMBIES tags, and both outputs are identical

### qa.R4 — Fixtures per scenario
When `qa.mjs sync` or `qa.mjs gaps` runs with test data on, the CLI shall show the seed fixture tagged with each scenario id, and list scenarios without a fixture and fixtures naming unknown scenarios.

#### qa.R4.S1 — Fixtures mapped, gaps both ways @interface
- Given `-- @fixture billing.R1.S1 billing.R1.S2 @boundary` and `-- @fixture ghost.R9.S1 @one` in `seed.sql`
- When the checklist and the gaps are computed
- Then `billing.R1.S1` shows `seed.sql:2`, three scenarios have no fixture, and `ghost.R9.S1` is unknown

### qa.R5 — QA runs
When `qa.mjs run` runs, the CLI shall create `work/qa/runs/<date>.md` with every scenario unticked and its text hash, adding `-2`, `-3`… for more runs on the same day.

#### qa.R5.S1 — Same-day suffix @boundary
- Given a run already started today
- When `qa.mjs run` runs again
- Then the new file is `<today>-2.md`

### qa.R6 — Latest result per scenario
When `qa.mjs status` runs, the CLI shall show each scenario's latest result, `re-check` when its text changed since that result, and `never run` when it has none.

#### qa.R6.S1 — Re-check after a change @boundary
- Given a scenario that passed and whose text then changed
- When `qa.mjs status` runs
- Then it shows `re-check`, an empty later row doesn't erase a result, and an untested scenario shows `never run`

### qa.R7 — Offline checklist page
The checklist page shall work offline and export the recorded results in the run-file format.

#### qa.R7.S1 — Export matches the run file @interface
- Given `checklist.html`
- When results are recorded and exported
- Then the page loads nothing from the network and its export parses like a run file

### qa.R8 — Test-data scaffold
Where test data is on, `init` shall create `env.sql`, `seed.sql`, `purge.sql` and a README in the test-data folder without overwriting existing files, each script in one transaction with the `_env` guard first and rows matched with `starts_with()`.

#### qa.R8.S1 — Scaffolded with the prefix @simple
- Given a new Supabase project
- When `init --yes` runs
- Then the four files exist with `TEST_` filled in and the monorepo init migration creates `_env`

#### qa.R8.S2 — Transaction and guard first @boundary
- Given the seed and purge templates
- When their SQL is read
- Then each starts with `BEGIN;` and the guard, ends with `COMMIT;`, never uses `LIKE` on the prefix, and `env.sql` sets no value

### qa.R9 — Production guard
If `_env` is missing or says `production`, then `seed.sql` and `purge.sql` shall raise an error before changing any row.

#### qa.R9.S1 — Refused outside dev / test / staging @exception
- Given a database without `_env`, or with `_env` set to `production`
- When `seed.sql` or `purge.sql` runs
- Then it raises "test data refused" and nothing changes

### qa.R10 — QA off adds nothing
If QA is off or the project has no Supabase or predates QA, then the kit shall add no QA files, tasks or session line until `upgrade` asks and the answers turn it on.

#### qa.R10.S1 — Session line only when on @zero
- Given QA settings off or missing
- When the session context is built
- Then there is no QA line; with the checklist on there is one, and test data adds its folder and prefix

#### qa.R10.S2 — Project from before QA stays off @boundary
- Given `agent-kit.json` without `qa`
- When the QA settings and preflight checks are read
- Then both checklist and test data are off and nothing is reported

#### qa.R10.S3 — Upgrade asks and keeps files @interface
- Given a project set up before QA, with its own `seed.sql`
- When `agent-kit upgrade --yes` runs
- Then the QA question is reported, the checklist is on, and `seed.sql` is unchanged

### qa.R11 — Preflight on test data
If migrations change without seed or purge changes or the checklist is out of date or a fixture names an unknown scenario, then preflight shall warn and name the files.

#### qa.R11.S1 — Warnings named @exception
- Given a new migration, an out-of-date checklist and a fixture for `ghost.R9.S1`
- When preflight runs
- Then it warns about each; touching `purge.sql` clears the migration warning, and QA off reports nothing
