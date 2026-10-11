---
id: 005-directory-listing
status: done # draft | approved | in-progress | done | dropped
merged: 2026-10-11
---

# Ready the plugin for Anthropic's directory

## Why
The user wants agent-kit listed in Anthropic's plugin directory (claude.ai/directory/manage). Its pre-submission checklist blocks a plugin folder without a README (≥ 40 words) or a license, and any package launcher (`npx …`) without an exact version. `plugin/` has neither file, `scripts.mjs` runs `npx --yes tsx` and `npx vitest` unpinned, and the docs inside the plugin say `npx @razcue/agent-kit` unpinned. The manifest also lacks `displayName`, `homepage`, `repository` and `keywords`, and its description still says "AC traceability".

## What changes
- In: `plugin/README.md` and `plugin/LICENSE`; a complete `plugin.json` (and the marketplace entry); `.ts` scripts and vitest run from the project's own `node_modules/.bin` when present, else through an exactly pinned `npx`; every `@razcue/agent-kit` command inside the plugin carries the plugin's version, rewritten by `bump.mjs` on release; version 0.14.1.
- Out: moving the plugin to the repository root (it would avoid the reviewer hold on Node hook scripts in a subfolder; a hold isn't a rejection); the npm publish itself (the user runs it).

## Capabilities
- `plugin` — new: the plugin as it is distributed — manifest, README, license, pinned launchers.

## Open questions
- [x] Q1 Name `agent-kit` → kept: a generic-word name may be held for a reviewer, not blocked.

## Links
- Checklist: https://claude.com/docs/plugins/pre-submission-checklist
