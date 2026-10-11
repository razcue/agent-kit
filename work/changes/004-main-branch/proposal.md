---
id: 004-main-branch
status: done # draft | approved | in-progress | done | dropped
merged: 2026-10-11
---

# Detect the main (production) branch at setup

## Why
`mainBranch` defaults to `main` without looking at the repository. The kit's own repo uses `master`, so its preflight base, the website's Pages trigger and the "Edit this page" links all pointed at a branch that doesn't exist. The git guard, preflight and CI all depend on this answer, so setup must find it or ask.

## What changes
- In: `init` detects the main branch (origin's HEAD, else the only `main` / `master` / `trunk` / `production` / `prod` branch) and asks when not sure; `--main` still wins. `upgrade` re-checks a configured branch that exists neither locally nor on the remote. The kit's own config, Pages workflow and site links move to `master`.
- Out: renaming branches; detecting a production branch that has none of the usual names (the question covers it).

## Capabilities
- `setup` — new: how `init` / `upgrade` set a project up (this change adds its main-branch requirements).

## Open questions
- [x] Q1 The kit repo's branch → `master` (the user's answer); the config follows the repository, no rename.

## Links
- Knowledge: [[work-lanes]]
