---
name: preflight
description: Pre-merge check of the current branch — migrations to apply or wrongly edited, new env vars, new dependencies, possible secrets, debug leftovers, grants to anon/authenticated, undocumented scripts, and (SDD + TDD) changed logic without a test. Use before a PR or merge, when a spec/feature is closing, or when the user asks "what do I need to do to ship this?".
---

# Preflight

1. Run `node <scripts>/preflight.mjs [base-branch]` (scripts path: next to `knowledge.mjs` in the session context). Default base: `mainBranch` from `agent-kit.json`, else `main`.
2. Report its output grouped as it prints. For each **violation**, say why it matters in one line.
3. Do not fix anything unless the user asks; then fix violations first.
4. End with the user's to-do list for shipping: migrations to apply (in order), env vars to set per environment, and the git steps allowed by the project's git flow.

Exit code 1 means BLOCK.
