# Plan — Detect the main (production) branch at setup

## Changes
| Area | File | Change |
|------|------|--------|
| CLI | `cli/lib/init.mjs` | `pickMainBranch` (pure) + `gitBranches` (read-only git); `init` sets `mainBranch` from `--main`, the saved answer, detection, or a question; `--main` validated; unasked `agent-kit.json` fields kept |
| CLI | `cli/lib/upgrade.mjs` | a configured branch missing locally and on the remote is replaced (detected) or asked; `--yes` keeps it with a warning |
| Kit | `agent-kit.json`, `.github/workflows/pages.yml`, `site/app/app.config.ts`, README, site guides | the kit's branch is `master` |
| Docs | installation question row, `mainBranch` in the configuration reference (EN + ES) | detection described |

## Decisions
- Detection reads git only (`rev-parse`, `symbolic-ref`, `for-each-ref`, `branch --show-current`); it never creates or renames branches.
- A brand-new repository without commits isn't "sure": the current branch is used with `--yes`, and asked interactively.

## Risks
- Several candidate names and no origin HEAD → a question in interactive runs; `--yes` takes the current branch (printed as "guessed — check it").
