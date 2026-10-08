---
name: tdd
description: Use BEFORE writing or changing logic when the user asks for TDD, "test first" or tests, or the project method is SDD + TDD. Red → green → refactor one behaviour at a time, test cases chosen with ZOMBIES, related tests run compactly with tdd.mjs. Also when preflight reports logic without tests.
---

# TDD

Tools (scripts folder in the session context):
- `node tdd.mjs status` — changed logic files and their tests (`✗ no test` = to do).
- `node tdd.mjs run [test files]` — runs only the tests related to your changes (or the files given); prints exit code + failures, full log in `.agent-kit/runs/`. `--all` runs the suite.

## Loop — one behaviour at a time
1. **List the cases** with ZOMBIES (global knowledge `zombies-testing`): write the test names first, simplest first, only the categories that apply.
2. **Red** — write one test, run it, and confirm it fails **for the expected reason** (the assertion, not an import or typo). Note `red: <test> — <why it fails>`.
3. **Green** — the smallest change that passes. Run again.
4. **Refactor** only on green; run again.
5. Next case. A bug fix starts with a test that reproduces the bug.

## Where tests go (Nuxt + Supabase stack)
- Logic lives in `packages/shared` (pure TS, no Nuxt/Vue): `x.test.ts` next to `x.ts`, Vitest.
- Server routes stay thin (validate → RPC → return); they are in `testIgnore`. Move any real logic to `shared` or to the RPC.
- RPC / SQL rules: verify with a kept script (`scripts` skill) or a reproducible SQL check; record it as evidence.
- Vue components: extract logic to a function or composable and test that.
- Scripts: `name.test.mjs` next to the script.

## Rules
- Never weaken, skip or delete a test to reach green. If a test is wrong, say why, then fix it.
- Test behaviour through public functions, with real domain values (money with 3 decimals, limits from DB constraints).
- Test names read as rules: `rounds 0.0005 up to 0.001`, not `test1`. A test that proves a spec criterion starts with it: `004/AC-2 rejects a duplicate code`.
- Evidence for a task = test file + the `tdd.mjs run` result line.
- Done when `tdd.mjs status` shows no `✗ no test` for logic you changed.
