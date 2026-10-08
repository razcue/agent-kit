---
name: promote-reused-scripts
title: A script needed twice gets kept and documented
type: rule
status: active
tags: [scripts, tokens, workflow]
summary: Throwaway scripts go in .agent-kit/scratch/ (gitignored, searchable); the second time one is needed it moves to scripts/<area>/ with a header (@summary, @usage), a ZOMBIES test and an index line; cross-project ones go to the agent-kit library.
---

Agents rebuild the same helper again and again when nothing makes the first one findable, and scripts kept in git without a header are as good as lost. A kept script costs zero tokens until run, and with `scripts.mjs run` only its summary enters the context.

The `scripts` skill applies this: necessity → search (scripts and skills) → build → document → test ([[zombies-testing]]) → run. Preflight blocks a kept script without `@summary`/`@usage`. Scripts never contain secrets — read them from env.
