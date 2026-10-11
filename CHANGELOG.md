# Changelog

## 0.14.1 — 2026-10-11
- **Ready for Anthropic's plugin directory**: `plugin/README.md` (what each hook reads, runs and writes; no network, no data collected) and `plugin/LICENSE`; `plugin.json` gets `displayName`, `homepage`, `repository`, `license`, `keywords` and an up-to-date description (also in the marketplace entry).
- **Every channel points to the others** — documentation (https://razcue.github.io/agent-kit/), docs MCP server (https://razcue-agent-kit.vercel.app/mcp), Claude Code plugin (`/plugin install agent-kit --marketplace razcue/agent-kit`) and npm CLI (`npx @razcue/agent-kit init`): one source of truth in `cli/lib/channels.mjs`; a "Channels" docs page (EN + ES); the plugin declares the MCP server as `agent-kit-docs` (`plugin/.mcp.json`; its README says what is sent: only the page path or locale); README, npm metadata (`homepage`, `bugs`, `keywords`), CLI help and `init` output name the docs and the MCP server; `llms.txt` names the MCP endpoint; the Pages root redirects to `/en/` or `/es/` by browser language (it returned 404).
- **Pinned launchers**: `.ts` scripts and vitest run with the project's own `node_modules/.bin` binaries, else `npx --yes tsx@4.23.15` / `vitest@5.0.3` — never a floating version. Every `npx @razcue/agent-kit@<version>` command inside the plugin carries the plugin's version, and `bump.mjs` re-pins them on release. The upgrade notice names the package and version instead of a launcher.

## 0.14.0 — 2026-10-11
- **Documentation website on Docus 5**: `site/` is now a Docus project (Nuxt 4 + Nuxt Content + Nuxt UI) in **English and Spanish** — landing, getting started, concepts, guides and reference: installation, every setup kind, upgrade, uninstall, lanes, living specs and notation, QA and test data, knowledge, scripts, guardrails, session context, self-improvement, and step-by-step workflows. Search, dark mode, `llms.txt` / `llms-full.txt` built in. The Spanish guide for non-technical users moved into the site, with an English version.
- **Reference generated from the source**: `scripts/release/docs.mjs sync` writes the CLI, configuration, skills, hooks, scripts and changelog pages; `docs.mjs check` (run by `npm test`) fails on stale generated pages, missing or stale translations (each Spanish page records its English page's hash; `docs.mjs stamp` after translating) and CLI commands not explained outside the reference.
- **Deploy**: GitHub Pages builds the static site (`npm run generate:pages` in `site/`, base path `/agent-kit/`); the same app on Vercel (`site/vercel.json`) serves Docus's MCP server at `/mcp` for agents. `scripts/release/site-base.mjs` adds the base path where Docus 5.14 leaves it out (`llms*.txt`, `sitemap.md`, favicon).
- Look of https://razcue.github.io: its light / dark palette mapped onto Nuxt UI's tokens (`site/app/app.css`), its terminal icon as favicon and header logo; the footer keeps one GitHub link plus the author's website, the theme toggle stays in the header. The homepage shows GitHub stars and forks (live, with `stats.json` from `scripts/release/repo-stats.mjs` as fallback) and clones of the last 14 days when the `TRAFFIC_TOKEN` secret is set; the Pages site rebuilds daily.
- **Homepage**: an animated terminal hero (`init` typing itself), a measured comparison — about 23k tokens loaded every session by a real project vs about 3.6k by a new agent-kit monorepo (84% less, both from `agent-kit context`) — with rows comparing work with and without the kit, the git guard blocking a commit on main, and a delta merging into a living spec (requirement lands, old id retired, test and QA item shown). CSS animations that play once in view and stay still with reduced motion.
- **Main branch detected at setup**: `init` reads it from git (origin's HEAD, or the only main / master / trunk / production / prod branch) and asks when not sure; `upgrade` replaces a configured branch that doesn't exist. `init` / `upgrade` keep `agent-kit.json` fields they don't ask about (`testCommand`, `contextBudget`).
- The kit runs its own workflow: 001 and 002 converted to proposals + EARS / Given-When-Then delta specs and merged; living specs `specs`, `qa`, `setup`, `website`; every kit test that proves a scenario is named by its id; the kit's branch is `master` (Pages trigger, edit links).
- CLI help moved to `cli/lib/help.mjs`; the `--commits` flag is listed under `init`.

## 0.13.0 — 2026-10-10
- **Spec-anchored SDD with living specs**: `work/specs/<capability>/spec.md` is the source of truth for current behaviour. Spec-lane work is a **change** in `work/changes/NNN-slug/` — `proposal.md` (first artifact), delta specs `specs/<capability>.md` (ADDED / MODIFIED / REMOVED requirements), `plan.md`, `tasks.md`. `specs.mjs merge NNN` applies the deltas all or nothing, retires removed ids (never reused) and marks the proposal `merged:`. Fast-track edits the living spec in place.
- **One standard notation**: requirements in **EARS** (`### cap.R1 — name` + `When …, the <system> shall …`), **Given/When/Then** scenarios (BDD) as the acceptance tests (ATDD), one **ZOMBIES** tag each (`#### cap.R1.S1 — name @boundary`). `specs.mjs lint|next|merge|trace|list` (also `agent-kit specs …`); skill reference `spec/references/notation.md`; global knowledge `ears-requirements`, `gherkin-scenarios`.
- **Scenario traceability**: tests start their name with the scenario id; preflight blocks a done change with uncovered scenarios or not merged, warns on living-spec gaps and notation errors. Changes from ≤ 0.12 keep their `NNN/AC-n` traces.
- **QA dimension** (asked at setup, default on, change by re-running init): `work/qa/checklist.md` + offline `checklist.html` generated from the living specs (one item per scenario, its steps, ZOMBIES tag and fixture); dated QA runs (`qa.mjs run`), `qa.mjs status` with **re-check** when a scenario changed after passing; `qa.mjs gaps`. `specs.mjs merge` refreshes the checklist.
- **Supabase test data** (`--test-data`, Supabase projects only): `supabase/test-data/{env,seed,purge}.sql` + README — one transaction each, the `_env` guard first (refuses unless dev / test / staging; `_env` belongs in every environment and is in the monorepo init migration), rows marked with `qa.testPrefix` (`TEST_`), fixtures tagged `-- @fixture <ids> @<zombies>`. Applied in the SQL Editor; skills may offer `supabase db query --linked -f …` / psql and run it only after approval — never `db reset`. Preflight warns when migrations change without seed/purge changes. Stack skill reference `test-data.md`.
- **Upgrade**: `agent-kit upgrade` moves `work/specs/NNN-*` to `work/changes/`, asks the new QA questions, and refreshes `work/README.md`.
- E2E: `scripts/e2e/spec-flow.mjs --lane spec|feature` — a complex request opens a change with lint-clean deltas; a fast-track tweak keeps its living spec true.

## 0.12.0 — 2026-10-08
- **A stack skill per template, in the project only**: `stack-nuxt-supabase` moved out of the plugin and `stack-nuxt-content-site` is new; `init` installs the template's skill into `.claude/skills/`, so unrelated projects pay no tokens for it. `upgrade` refreshes it (backed up), `doctor` checks it's current, `uninstall` removes it.
- **Blank projects**: `--kind blank` (or "Blank project") — agent layer only, no template, with a minimal `package.json`; existing and blank projects can opt into a stack skill (`--stack none|nuxt-supabase|nuxt-content-site`).
- **`agent-kit propose "<title>"`**: projects send improvement ideas to the kit — into the clone's `work/proposals/` inbox, or as a ready `gh issue create` command; the `retro` skill uses it.
- **Evolve**: `scripts/evolve/scout.mjs` (new Claude Code version, new hook events in the docs, template dependencies a major behind, vs a reviewed baseline) and `scripts/evolve/ROUTINE.md` (weekly cloud routine: scout + web research on skills, harnesses and workflows → at most 5 proposals).
- Trigger eval covers both stack skills (each in its template's project).

## 0.11.0 — 2026-10-08
- **Session context budget**: rendered under 9,500 characters (Claude Code caps hook context at 10,000 and cuts the rest silently); when needed it collapses global knowledge groups, then the scripts list, then project groups, and clips summaries to 160 characters. `knowledge check` warns about longer summaries.
- **Template CI** (`.github/workflows/templates.yml`): scaffolds the app monorepo and the content site, installs, checks, builds, and runs the auth e2e — on template changes and weekly.
- **Site figures stay true**: `scripts/release/site.mjs` syncs the version and skill count into both languages and `llms.txt`; `bump.mjs` runs it; a test fails when the site is stale.

## 0.10.0 — 2026-10-08
- **Project website** (`site/`): single page in English and Spanish — problem, how it works, lanes and methods, the 12 skills, guardrails, knowledge, scaffolds, verification, get started; light/dark, mobile, copy buttons, `llms.txt`. Deployed to GitHub Pages by `.github/workflows/pages.yml`. Site test: links, anchors, assets, same sections in both languages.

## 0.9.0 — 2026-10-08
- **Auth e2e** `scripts/e2e/auth.mjs`: the built app server + real supabase-js against a fake Supabase (Auth + RPC) — wrong password 401, short login + email domain, `app_metadata` name, `/me`, server-side logout revocation, throttle 429 after 5 failures (9/9).
- **Git guard**: configured aliases are resolved (`git ci` → `git commit`, shell aliases too); inline `-c alias.…` is blocked; branch detection works in a fresh repo with no commits (a first commit onto main in `pr` flow was not caught).
- **Spanish guide for non-technical users**: `docs/guia-sitio-web.md`.

## 0.8.0 — 2026-10-08
- **Version-drift notice**: when the installed plugin is newer than the project's `kitVersion`, the session suggests `agent-kit upgrade` once.
- **Knowledge `log.md`** (OKF): every index run appends what was added, changed or removed, newest first.
- **`agent-kit doctor --fix`**: regenerates knowledge indexes (+ log), the scripts index and the work board, then checks.
- **Negative trigger evals**: unrelated questions must load no agent-kit skill — 3/3 on haiku and sonnet (no over-triggering).
- **Hook latency budget** in the lint tests (< 1.5 s each; measured 72–101 ms).

## 0.7.0 — 2026-10-08
- **Fix**: frontmatter values kept YAML inline comments (`status: draft # draft | approved…`), so work files created from the templates were never seen as active (resume, board, AC trace) and commented knowledge examples failed `check`.
- **Git guard hardening**: quote-aware command splitting; git hidden in `bash/sh -c`, `eval`, `xargs`, `$( )`, backticks, `nohup`, `timeout` is checked too.
- **`work.mjs new feature|spec <slug>`** (`agent-kit work new …`): next free number, files from the templates, board updated; `feature`, `spec` and `start` use it.
- **Skill trigger eval** `scripts/e2e/triggers.mjs`: one realistic prompt per skill in a scaffolded monorepo; descriptions of `feature`, `tdd`, `commit`, `adopt`, `stack-nuxt-supabase` rewritten to "Use BEFORE…" — 12/12 skills trigger on haiku and sonnet after the changes (borderline ones re-run twice per model).
- The kit adopts itself: `agent-kit.json`, a 48-line AGENTS.md for kit work, commitlint + husky, `.knowledge/`.

## 0.6.0 — 2026-10-08
- **Auth starter** in the app template: BFF `POST /api/auth/login` (DB-backed throttle per login and IP, migration `000000000001_login_throttle.sql`), `GET /api/auth/me`, `POST /api/auth/logout`; Pinia `useAuthStore` (session restore, setSession, logout), global route guard with safe redirects, login page; `Input`/`Label` in the UI layer.
- **`agent-kit upgrade`**: asks only questions the project hasn't answered, re-applies the agent layer, prints the CHANGELOG since the project's `kitVersion`.
- **`agent-kit uninstall [--dry-run]`**: removes the AGENTS.md block, agent-kit settings entries and `agent-kit.json` (backed up); project content stays.
- **Optional read-only Supabase MCP** (`--supabase-mcp <ref>`, asked for new app projects): hosted server, project-scoped, `read_only=true`; `doctor` flags a non-read-only one.
- Kit CI (Node 20 and 22: tests + pack check).

## 0.5.0 — 2026-10-08
- **`commit` skill**: preflight → review → Conventional Commit message (English, `type(scope): subject`, ≤ 72) → validate → commit by git flow (read-only projects get the exact command).
- **Setup question "Commit messages"** (`--commits conventional|none`, default conventional): adds `@commitlint/cli`, `@commitlint/config-conventional`, `husky` and a `prepare` script to package.json, `commitlint.config.mjs` and `.husky/commit-msg`; `npm install` activates the hook.
- **`commit.mjs`** (`agent-kit commit draft|check`): files → scope/type hints; message check via the project's commitlint, or built-in rules pinned to commitlint's verdicts by a parity test.
- **Git guard**: validates `git commit -m …` messages in conventional projects before they run; blocks `--no-verify` / `-n` everywhere.
- **`doctor`**: commitlint configured, hook file present, hooks active (`core.hooksPath`).
- `init` no longer backs up files it created earlier in the same run.

## 0.4.0 — 2026-10-08
- **Verified live in Claude Code** (2.1.294): `scripts/e2e/live.mjs` runs a headless session with `--plugin-dir` and a cheap model, and checks plugin + skills load, SessionStart context, git guard, stray-script reminder and checkpoint (~$0.01 per run).
- **Fix**: the Stop checkpoint hook is now synchronous — async hooks were dropped when a headless run exited (found by the live test).
- **`adopt` skill** + `agent-kit context --sections`: move a large AGENTS.md/CLAUDE.md and auto-memory onto agent-kit section by section (skill, folder CLAUDE.md, knowledge or delete), measuring tokens after each move.
- **Hook tracing**: `AGENT_KIT_HOOK_LOG=<file>` makes every hook append one line when it runs.
- **Plugin lint tests**: skill names/description budget, total listing ≤ 1500 tokens, hook commands exist, hooks silent outside agent-kit projects, versions agree.

## 0.3.0 — 2026-10-08
- **Resume across sessions**: Stop hook (async) saves `.agent-kit/checkpoint.json`; session start shows where the last session ended and the active work with its next task. `work.mjs status|board`.
- **Acceptance-criteria traceability**: tests name `NNN/AC-n`; `work.mjs trace`; preflight blocks a `done` spec with an uncovered AC, warns for `approved`.
- **Context report**: `agent-kit context` estimates the tokens loaded every session (CLAUDE.md chain + imports, memory, agent-kit context, skill listings) and lists skills Claude Code can't see; `doctor` checks the budget (`contextBudget`, default 8000).
- **Stray-script reminder**: PostToolUse(Write) hook points to the `scripts` skill when a script is written outside `scripts/`/scratch.
- **Content site**: `--kind site` scaffold (Nuxt + Nuxt Content, Markdown pages, static) and the `start` skill (guided kickoff in plain language).
- **Retro**: `retro` skill + `agent-kit usage` (runs, failures, unused scripts, scratch to promote, orphan knowledge).
- Also: `knowledge related <name>` (links + backlinks), `kitVersion` in agent-kit.json checked by `doctor`, backups of every file `init` changes, GitHub Actions `check` workflow in scaffolds, `agent-kit preflight|work|context|usage` commands.

## 0.2.0 — 2026-10-07
- Method question: SDD or SDD + TDD; `tdd` skill, `tdd.mjs status|run`, preflight blocks untested logic.
- `scripts` skill + `scripts.mjs` registry (find/run/test/new/index/check), ZOMBIES test stubs, `.agent-kit/scratch/`.

## 0.1.0 — 2026-10-07
- Plugin (spec, feature, knowledge, decide, stack-nuxt-supabase, preflight; reviewer agent; session + git-guard hooks), `init/setup/doctor` CLI, Nuxt + Supabase monorepo scaffold, global knowledge.
