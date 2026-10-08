---
name: knowledge-scopes
title: Knowledge scopes and where facts go
type: concept
status: active
tags: [knowledge, context, tokens]
summary: Project scopes (business, env, decisions, ux, stack, local) live in .knowledge/; global scopes (stack, meta, ux) live in the agent-kit repo; only one-line summaries load per session.
---

- One concept per file, `[[name]]` links, frontmatter with a self-sufficient `summary`.
- Session start loads the summaries only; agents open files on demand or search with `knowledge.mjs find`.
- `local/` is gitignored for machine-specific facts. Secrets never go in knowledge.
- Global knowledge is shared through git (the agent-kit repo); project knowledge travels with the project repo.
- Layout follows the Open Knowledge Format idea (one concept per file, index per folder), so it stays portable.
