# agent-kit

A minimal agent-driven development kit for Claude Code: an npx CLI (`cli/`) that sets
projects up from fixed questions, a Claude Code plugin (`plugin/`: skills, hooks, a
reviewer agent, zero-dependency scripts, global knowledge) and scaffolds (`templates/`).

## Layout

| Path | What |
|---|---|
| `cli/` | `index.mjs` commands; `lib/` init, upgrade, uninstall, prompts, pure helpers |
| `plugin/skills/` | one folder per skill; `SKILL.md` + optional `references/`, `templates/` |
| `plugin/scripts/` | hooks and tools (`*.mjs`, Node built-ins only); shared by plugin and CLI |
| `plugin/knowledge/` | global knowledge (stack, meta, ux) shipped with the plugin |
| `templates/` | `base`, `monorepo`, `site`, `ci` scaffolds (`__NAME__`, `__LANG__`, `__MAIN__`); `skills/` = one stack skill per template, installed as a project skill |
| `scripts/` | kit maintenance: `release/` (bump, site), `e2e/` (live, triggers, auth), `evolve/` (scout, ROUTINE.md, baseline) |
| `work/proposals/` | inbox: proposals from projects (`agent-kit propose`) and scout reports |
| `test/` | `node:test` suites, incl. plugin lint and site links |
| `site/` | project website (EN + `es/`, plain HTML/CSS, `llms.txt`), GitHub Pages via `.github/workflows/pages.yml` |

## Commands

- `npm test` — unit + lint tests (must stay green; CI runs Node 20 and 22)
- `node scripts/e2e/live.mjs` — live smoke test in real Claude Code (haiku, ~$0.01)
- `node scripts/e2e/triggers.mjs [--model sonnet]` — does each skill trigger on its prompt
- Release: add `## x.y.z` to CHANGELOG.md → `node scripts/release/bump.mjs x.y.z` → tests + live run

## Rules

- No runtime dependencies: plugin scripts and the CLI use Node built-ins only (Node ≥ 20.11).
- Every script exports pure functions and guards `main` with `import.meta.url === pathToFileURL(process.argv[1])` — hooks must never run on import.
- Hooks are silent outside agent-kit projects and never throw; a slow hook is a cost on every turn.
- New capability → a script or hook first; a new skill only when judgment is needed (each description loads every session; the lint test caps them). A new skill also needs a `scripts/e2e/triggers.mjs` case and an entry in `live.mjs` `EXPECTED_SKILLS`.
- Template changes are verified by scaffolding a project, `npm install`, then check/build — unit tests don't cover them.
- Website claims must match what the kit does; update both `site/index.html` and `site/es/index.html` (the site test checks they have the same sections).
- Verify Claude Code behaviour against its docs (code.claude.com/docs/en/*.md) or a live run, never from memory.

<!-- agent-kit:start -->
## Agent setup (agent-kit)

<!-- Managed by `npx @razcue/agent-kit init` — change agent-kit.json answers by re-running it. -->

- Profile (`agent-kit.json`): technical, replies in English, method `sdd-tdd` (tests first: `tdd` skill), git flow `read-only` (enforced by a hook).
- Lanes: **Answer** (read-only) · **Fast-track** (`feature` skill: ≤3 files, no schema/permission/money change) · **Spec** (`spec` skill: everything else, spec approved before code). Work files in `work/`.
- Knowledge: `.knowledge/<scope>/` (business, env, decisions, ux, stack; `local/` is private) plus global stack/meta/ux from agent-kit. Only summaries load at session start; open entries on demand. Record facts with `knowledge`, decisions with `decide`. Don't restate knowledge in this file.
- Scripts: search before writing, document every kept one (`scripts` skill). Kept: `scripts/<area>/` (index in `scripts/README.md`); throwaway: `.agent-kit/scratch/` (gitignored).
- Commits: Conventional Commits (`type(scope): subject`, English, ≤ 72 chars), checked by commitlint — write them with the `commit` skill.
- Resume: each session starts with the last checkpoint and the active work (`work/`); acceptance criteria are traced to tests (`NNN/AC-n` in the test name).
- Before a merge: `preflight` skill. Now and then: `retro` skill to turn repeated corrections into rules.
<!-- agent-kit:end -->
