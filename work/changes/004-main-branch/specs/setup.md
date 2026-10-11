# Delta — setup

## Purpose
How `agent-kit init` and `agent-kit upgrade` set a project up: questions, detected facts, the files they write.

## ADDED Requirements

### setup.R1 — Main branch detection
When `init` runs without `--main` in a git repository, the CLI shall set `mainBranch` to origin's HEAD branch or to the only branch named main, master, trunk, production or prod, and ask for it when neither identifies one branch.

#### setup.R1.S1 — Only master exists @simple
- Given a repository whose only branch is `master`
- When `agent-kit init --yes` runs
- Then `agent-kit.json` has `"mainBranch": "master"`

#### setup.R1.S2 — Origin HEAD decides @one
- Given origin's HEAD points to `production` and both `main` and `production` exist
- When the main branch is detected
- Then it is `production`, without a question

#### setup.R1.S3 — Two candidates, not sure @many
- Given branches `main` and `master`, no origin HEAD, the current branch `master`
- When the main branch is detected
- Then the result is `master` marked not sure, so an interactive `init` asks "Main (production) branch" with `master` as the default

#### setup.R1.S4 — Not a git repository @zero
- Given a folder that is not a git repository
- When `agent-kit init --yes` runs
- Then `mainBranch` is `main`

#### setup.R1.S5 — The flag wins @interface
- Given a repository whose only branch is `master`
- When `agent-kit init --yes --main develop` runs
- Then `mainBranch` is `develop`

#### setup.R1.S6 — No usual name @boundary
- Given a repository whose only branch is `develop`
- When the main branch is detected
- Then the result is `develop` marked not sure

### setup.R2 — Configured branch re-checked on upgrade
If the configured `mainBranch` exists neither as a local nor as a remote branch, then `upgrade` shall replace it with the detected branch when detection is sure, ask for it in an interactive run, and keep it with a warning in a `--yes` run.

#### setup.R2.S1 — Wrong branch corrected @exception
- Given `"mainBranch": "main"` in a repository whose only branch is `master`
- When `agent-kit upgrade --yes` runs
- Then `mainBranch` becomes `master` and the output says so

#### setup.R2.S2 — Existing branch kept @boundary
- Given `"mainBranch": "master"` and the branch `master` exists
- When `agent-kit upgrade --yes` runs
- Then `mainBranch` stays `master` and nothing about it is printed

### setup.R3 — Unasked fields survive a re-run
When `init` or `upgrade` rewrites `agent-kit.json`, the CLI shall keep every field it doesn't ask about, such as `testCommand` and `contextBudget`.

#### setup.R3.S1 — Hand-set fields kept @boundary
- Given `agent-kit.json` with `"testCommand": "node --test"` and `"contextBudget": 6000`
- When `agent-kit upgrade --yes` runs
- Then both fields are still there with the same values
