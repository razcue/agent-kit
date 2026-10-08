---
name: commit
description: Use BEFORE any git commit — whenever the user says "commit", "commit message", "save this work", or a spec/feature is done. Runs preflight, reviews what goes in, writes a Conventional Commit message (type(scope) subject, English), validates it with commitlint, then commits within the project's git flow (or hands the user the exact command when git is read-only).
---

# Commit

Scripts folder: in the session context (`commit.mjs`, `preflight.mjs`).

## 1. Preflight
Run `node <scripts>/preflight.mjs`. Any **violation** → stop, report it, fix only if the user agrees. Mention warnings in one line.

## 2. What goes in
- `git status --short` and `node <scripts>/commit.mjs draft [--staged]` (files grouped by suggested scope, plus a type hint).
- One logical change per commit. If unrelated areas changed, propose separate commits (one per scope) and which files go in each.
- Never commit secrets, `.env*`, `.agent-kit/` or `.knowledge/local/`.

## 3. Write the message
```
type(scope): subject

Body: why the change was needed and what it changes, wrapped at 100.

BREAKING CHANGE: what breaks and how to migrate   ← only when it applies
Refs: #123                                        ← optional
```
- **type**: `feat` new behaviour · `fix` bug fix · `refactor` no behaviour change · `perf` · `test` · `docs` · `style` (formatting) · `build` (deps, packaging) · `ci` · `chore` · `revert`.
- **scope**: the area (`app`, `shared`, `ui`, `db`, `docs`, `scripts`…, as `commit.mjs draft` suggests); omit it when the change spans the project.
- **subject**: English, imperative, lower-case start, no final period, header ≤ 72 characters — `add invoice export`, not `Added invoice export.`
- **body**: only when the why isn't obvious from the subject; concise. Reference the spec when there is one (`Spec: work/specs/004-…`).
- Add the trailers your session instructions require (e.g. `Co-Authored-By`).

## 4. Validate
`node <scripts>/commit.mjs check "<full message>"` — uses the project's commitlint when installed, otherwise the same rules built in. Fix until it prints ✓.

## 5. Commit — by git flow (session context)
- **read-only**: don't run git. Give the user the exact commands, e.g. `! git add <files> && git commit -m "<header>" -m "<body>"`.
- **pr**: make sure you are on a feature branch (the guard blocks commits on main); `git add <files>` then `git commit -m "<header>" [-m "<body>"]`.
- **trunk**: same, on the main branch.
- Never `--no-verify`, never `--amend` a pushed commit. If the commit-msg hook rejects the message, fix the message — don't bypass the hook.

Report: the commit hash and header, or the command the user must run.
