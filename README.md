# agent-kit

Minimal agent-driven development kit for **Claude Code**: one CLI that sets up a
project from fixed questions, one plugin with a small set of skills and hooks,
and a scoped, shareable knowledge base. Optional scaffold: a Nuxt 4 +
shadcn-vue + Supabase monorepo (website, app, docs).

```
agent-kit/
├── .claude-plugin/marketplace.json   this repo is a plugin marketplace
├── plugin/                           the Claude Code plugin (versioned)
│   ├── skills/        start · adopt · spec · feature · tdd · scripts · knowledge · decide · retro · commit · stack-nuxt-supabase · preflight
│   ├── agents/        reviewer (read-only)
│   ├── hooks/         SessionStart → profile, resume, knowledge + script index · PreToolUse(Bash) → git guard
│   │                  PostToolUse(Write) → stray-script reminder · Stop → checkpoint
│   ├── scripts/       knowledge · scripts · tdd · work · preflight · context · usage · hooks (.mjs, no deps)
│   ├── knowledge/     GLOBAL knowledge: stack/ · meta/ · ux/
│   └── library/       GLOBAL reusable scripts
├── cli/                              npx @razcue/agent-kit …
└── templates/
    ├── base/        AGENTS.md skeleton, .knowledge/, work/
    ├── monorepo/    apps/{web,app,docs} · packages/{ui,shared} · supabase/migrations
    ├── site/        one Nuxt + Nuxt Content site (Markdown pages, static)
    └── ci/          GitHub Actions: npm run check + preflight
```

## Use

```bash
# new project (asks: name, setup [app monorepo | content site | existing], apps, technical level,
# language, method SDD / SDD + TDD, git flow)
npx @razcue/agent-kit init my-project

# existing repo: adds the agent layer only (keeps your AGENTS.md, appends a managed block)
cd my-repo && npx @razcue/agent-kit init

# change answers later: re-run init (it only touches the agent layer)
npx @razcue/agent-kit init --git read-only --yes

# health check · tokens loaded per session · usage signals · work
npx @razcue/agent-kit doctor [--fix]    # --fix regenerates indexes, knowledge log and work board
npx @razcue/agent-kit context            # + skills Claude Code can't see
npx @razcue/agent-kit usage --days 30
npx @razcue/agent-kit work status|board|trace [spec] | new feature|spec <slug>
npx @razcue/agent-kit preflight [base]
```

Non-interactive: `--name --kind monorepo|site|existing --apps web,app,docs --level technical|non-technical --lang en|es --method sdd-tdd|sdd --commits conventional|none --git pr|trunk|read-only --main <branch> --marketplace github:<owner/repo>|<path> --yes`.

Then open `claude` in the project and trust the folder: `.claude/settings.json`
declares this marketplace and enables `agent-kit@agent-kit`, so Claude Code offers
to install it. Manual: `/plugin marketplace add razcue/agent-kit` →
`/plugin install agent-kit@agent-kit`.

## What a project gets

| File | Purpose |
|---|---|
| `agent-kit.json` | Answers: technical level, reply language, method, git flow, main branch; `testIgnore` globs; optional `testCommand`. Read by the hooks every session. |
| `AGENTS.md` (+ `CLAUDE.md` → `@AGENTS.md`) | Short project rules + a managed agent-kit block. Keep it ≤ 300 lines. |
| `.claude/settings.json` | Plugin enabled + git permission rules for the chosen flow (merged, your rules kept). |
| `.knowledge/` | Project knowledge: `business`, `env`, `decisions`, `ux`, `stack`, `local` (gitignored). |
| `work/` | `features/` (fast-track) and `specs/` (spec-driven) work files. |
| `scripts/` | Kept, documented scripts; `README.md` index is generated. |
| `.agent-kit/` | Gitignored: `scratch/` throwaway scripts (still searchable), `runs/` full logs. |

## How it works

- **Profile, not inference.** Technical level, language and git flow are answered once
  in the CLI. The SessionStart hook turns them into instructions (plain-language voice
  for non-technical users), and the git guard enforces the flow: `read-only` blocks
  every git write, `pr` blocks commits/pushes on main, all flows block force-push,
  `reset --hard`, `clean -f`, `branch -D`.
- **Three lanes.** Answer (read-only) · Fast-track (`feature`: ≤3 files, no
  schema/permission/money change) · Spec (`spec`: spec → user approval → test-first
  tasks → every acceptance criterion verified → `preflight` → `reviewer`).
- **Two methods.** `sdd`: every acceptance criterion proven by a test or a reproducible
  check. `sdd-tdd`: tests first (`tdd` skill: red → green → refactor, cases chosen with
  ZOMBIES); `tdd.mjs status` shows changed logic without tests, `tdd.mjs run` runs only
  the related tests, and `preflight` blocks untested logic (paths in `testIgnore` excepted).
- **Scripts are reused, not rebuilt.** The `scripts` skill: necessity → search (scripts
  *and* skills) → build (`scripts.mjs new`, header + ZOMBIES test stub) → document
  (`@summary`, `@usage`, generated index) → test → run. `scripts.mjs run` returns the exit
  code and only the relevant lines; the full log stays in `.agent-kit/runs/`. Preflight
  blocks kept scripts without a header.
- **Sessions resume.** A Stop hook saves `.agent-kit/checkpoint.json` after every turn
  (branch, uncommitted files, active work); the next session starts with "where we left
  off" and each active work file's next task.
- **Every acceptance criterion is traced.** Tests that prove one name it `NNN/AC-n`
  (spec number); criteria proven otherwise get a ✅ row in `tasks.md`. `work.mjs trace`
  shows gaps; preflight blocks a `done` spec with any.
- **Context has a budget.** `agent-kit context` measures what loads every session and
  `doctor` fails above `contextBudget` (default 8000 tokens).
- **Non-technical users** get the `site` scaffold, plain-language voice and the `start`
  skill: plain questions → first spec in their words → build, with "how to see it" after
  each change.
- **The setup learns.** The `retro` skill turns repeated corrections into knowledge, hook
  rules or promoted scripts, using `agent-kit usage` and `context` as evidence.
- **Knowledge has a history.** Each `knowledge.mjs index` appends added/changed/removed
  entries to `log.md` next to `index.md` (the Open Knowledge Format layout).
- **Knowledge is cheap to load.** One concept per file with a one-line `summary`.
  Only summaries are injected at session start (~1k tokens for the seed set); agents
  open files on demand or search with `knowledge.mjs find`. Indexes and validation are
  scripts, not tokens.

### Knowledge scopes

| Scope | Lives in | Shared through |
|---|---|---|
| business, env, decisions, ux, stack (project) | `<project>/.knowledge/` | the project repo |
| local (machine-only) | `<project>/.knowledge/local/` | nothing (gitignored) |
| stack, meta, ux (global) | `agent-kit/plugin/knowledge/` | this repo (and the plugin) |

Global knowledge is **writable** only from a local clone registered with
`node cli/index.mjs setup` (writes `~/.config/agent-kit/config.json`); otherwise
agents read the copy bundled with the installed plugin and write to the project.

```bash
node plugin/scripts/knowledge.mjs find migrations     # search (project + global)
node plugin/scripts/scripts.mjs find seed              # scripts + skills
node plugin/scripts/tdd.mjs status                     # changed logic vs tests
npm run knowledge:index && npm run knowledge:check     # global indexes + validation
```

## Website

`site/` is the project site (plain HTML + CSS, English and Spanish, `llms.txt`), deployed
to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that touches it:
**https://razcue.github.io/agent-kit/**. One-time setup: repository Settings → Pages →
Source: *GitHub Actions*. Preview locally by opening `site/index.html`.

## For non-technical users

[`docs/guia-sitio-web.md`](docs/guia-sitio-web.md) (Spanish): how to build and change a
content site by talking to Claude — setup command, how sessions go with the `start`
skill, previewing, what can't be broken, publishing.

## Upgrading, removing

```bash
npx @razcue/agent-kit upgrade          # new questions only, re-apply, show what's new
npx @razcue/agent-kit uninstall --dry-run   # then without --dry-run
```
`uninstall` removes the AGENTS.md block, agent-kit's settings entries and
`agent-kit.json` (backed up in `.agent-kit/backups/`); your `.knowledge/`, `work/`,
`scripts/` and commit tooling stay.

## App starter

The `app` workspace ships with auth through the BFF: login with a DB-backed throttle
(per login and IP), session restore, route guard with safe redirects, logout that
revokes server-side, and a login page. Apply `supabase/migrations/` in order. With
`--supabase-mcp <project-ref>` agents also get a read-only, project-scoped Supabase
MCP server (`.mcp.json`) to check the live schema.

## Commits

With "Commit messages: Conventional Commits" (the default), `init` adds commitlint +
husky to `package.json`, a `commitlint.config.mjs` (header ≤ 72) and a
`.husky/commit-msg` hook; `npm install` activates it. Agents use the `commit` skill
(preflight → message → `agent-kit commit check` → commit within the git flow), the git
guard validates `git commit -m` messages before they run and blocks `--no-verify`.

## Adopting an existing project

`agent-kit context --sections` ranks every heading of the CLAUDE.md/AGENTS.md chain by
tokens. The `adopt` skill then moves sections out one at a time — procedures into
project skills, area rules into folder `CLAUDE.md` files, facts and decisions into
`.knowledge/`, derivable or stale text deleted after confirmation — and re-measures
after each move.

## Debugging hooks

Set `AGENT_KIT_HOOK_LOG=/tmp/agent-kit-hooks.log` before starting `claude`: every
agent-kit hook appends one line (event, path or command) when it runs.

## Keep the kit evolving (weekly routine)

Run `/schedule` in Claude Code and create a weekly cloud routine on this repo with:

> Read the Claude Code changelog and docs changes since the last run (hooks, skills,
> plugins, settings) and the latest posts on agent-driven development. Compare with this
> repo (plugin/, cli/, templates/). Propose at most 5 concrete changes as a markdown
> list in `work/features/NNN-kit-update.md` (status: in-progress), each with the source
> link, the file to change and why it lowers tokens or improves reliability. Don't edit
> code.

Then review the proposals in a normal session (`feature` or `spec` lane).

## Develop the kit

```bash
git clone git@github.com:razcue/agent-kit.git && cd agent-kit
node cli/index.mjs setup                # global knowledge writable from this clone
npm test                                # unit + lint tests (node:test)
node scripts/e2e/live.mjs               # live smoke test in real Claude Code (haiku, ~$0.01)
node scripts/e2e/triggers.mjs           # does each skill trigger on a realistic prompt? (--model sonnet)
node scripts/e2e/auth.mjs --app <built app>   # auth flow vs a fake Supabase (9 checks)
```
In Claude Code, `/plugin marketplace add ~/WebstormProjects/agent-kit` uses the
clone directly, and `/plugin update agent-kit@agent-kit` picks up changes. Release:
add a `## x.y.z` section to `CHANGELOG.md`, run `node scripts/release/bump.mjs x.y.z`
(updates package.json, plugin.json and marketplace.json together), `npm test`, then
`npm publish --access public`. Projects upgrade with `npx @razcue/agent-kit init`
(their `kitVersion` is checked by `doctor`; every changed file is backed up in
`.agent-kit/backups/`).

## Scaffold notes

- `packages/ui` is a Nuxt layer (shadcn-vue components, Tailwind v4 theme, `@ui` alias);
  add components with `cd packages/ui && npx shadcn-vue@latest add <name>`.
- `apps/docs` uses Docus (Nuxt UI based); it doesn't extend `packages/ui` and has no
  `typecheck` script (Docus 5.14's own sources fail `vue-tsc`). Set `NUXT_SITE_URL`.
- `supabase/migrations/000000000000_init.sql` creates `_migrations` and locks the
  Data API to `service_role`.
