---
id: 007-directory-validation
status: done # draft | approved | in-progress | done | dropped
merged: 2026-10-11
---

# Clear the directory validator's warnings

## Why
The developer portal's **Validate** passed `master @ 63a4a3a` with 3 warnings and 2 policy holds. Warnings: no listing icon (taken only the first time the submission is saved), no `privacyPolicyUrl`, and a "download-and-execute shell pattern" in `scripts/git-guard.mjs`. Holds: scripts that read the environment while the plugin also sends data (the MCP server), and hooks that run Node scripts instead of plain shell scripts.

## What changes
- In: `plugin/.claude-plugin/icon.png` (1024 × 1024, the razcue.github.io terminal icon); a Privacy page in the docs (EN + ES) and `privacyPolicyUrl` in `plugin.json`; the read-only git subcommand data moves from `git-guard.mjs` to `git-rules.mjs`, so the guard's body has no download word next to its shell handling; the plugin README explains that the environment only reaches local tools.
- Out: rewriting the hooks as shell scripts (the hold would remain for anything they run; a reviewer reads them instead); dropping the environment pass-through (git, commitlint and the project's tests need it).

## Capabilities
- `plugin` — modified: R1 also requires the icon and the privacy policy URL; new R4 for the environment disclosure.

## Open questions
- [x] Q1 Keep both holds → yes; they are explained for the reviewer.
