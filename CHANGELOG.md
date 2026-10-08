# Changelog

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
