---
name: scripts
description: Decide, find, build, document, test and run scripts so they are reused instead of rewritten. Use before writing ANY script or helper program (test helpers, data checks, generators, "write a script that…"), before re-creating an earlier ad-hoc script, and when keeping or documenting scripts. Searches existing scripts and skills first.
---

# Scripts

Tool: `node scripts.mjs <command>` (scripts folder in the session context). Kept scripts live in `scripts/<area>/`, throwaway ones in `.agent-kit/scratch/` (gitignored), cross-project ones in the agent-kit library.

## 1. Necessity — is a script needed?
- **No**: one shell command, `grep`, an existing CLI or a `package.json` script answers it; or it's a one-time file edit.
- **Yes**: logic with branches or loops; output too big for the context (the script summarizes); it will run again (tests, checks, data fixes); the result must be repeatable.
State the decision in one line.

## 2. Search — does it already exist?
`scripts.mjs find <words>` searches project scripts, scratch, the global library **and skills**. A fitting script → run it. A fitting skill → use it. Adapting an existing script beats writing a new one.

## 3. Build
- Throwaway (exploring or testing something once): `scripts.mjs new <area>/<name>.mjs --summary "…" --scratch`.
- Kept (the user asked for it, or it's needed a second time): `scripts.mjs new <area>/<name>.<mjs|ts|sh|py|sql> --summary "…" [--usage "…"]` → header + test stub + index update.
- Cross-project: `--library` (needs a writable agent-kit clone).
- Prefer `.mjs` (no dependencies). Logic in an exported pure function; the CLI part only parses args and prints. Secrets from env vars, never in the file. Print a compact summary (counts, failures), not raw dumps. Non-zero exit on failure. Idempotent when it writes data.
- Areas are folders: `db`, `data`, `test`, `dev`, `deploy`, `ops`…

## 4. Document
Header in the first lines, any comment style:
`@name` (= file name) · `@summary` (one line: what and why) · `@usage` (exact command with args) · `@tags` · `@test`.
Then `scripts.mjs index` (regenerates `scripts/README.md`) and `scripts.mjs check`. A kept script without `@summary`/`@usage` blocks preflight.

## 5. Test (ZOMBIES)
For kept scripts with logic, fill the generated stub using ZOMBIES (global knowledge `zombies-testing`): only the categories that apply, simplest first. Exceptions = bad args or missing env → clear message and non-zero exit. Turn every `todo` into a real test or delete it. Run `scripts.mjs test <name>`.

## 6. Run
`scripts.mjs run <name> [-- args]` returns the exit code, time and only the lines that matter; the full output is in `.agent-kit/runs/`. Open the log only when the summary isn't enough. Tell the user the result in one or two lines. SQL scripts are applied by the user in the SQL editor, not run.

## 7. Promote and clean
A scratch script needed a second time → move it to `scripts/<area>/`, complete the header and the test (steps 4–5). Delete scratch scripts that are obsolete.
