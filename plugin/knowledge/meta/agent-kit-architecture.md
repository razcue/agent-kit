---
name: agent-kit-architecture
title: agent-kit = plugin + CLI + knowledge
type: decision
status: active
tags: [architecture, tooling, claude-code]
summary: Behaviour (skills, hooks, agent) ships as a versioned Claude Code plugin from the agent-kit marketplace; the npx CLI only asks fixed questions and writes project files; knowledge and scripts are plain files in git, handled by zero-dependency Node scripts.
date: 2026-10-07
---

## Context
Copying skills into every repo makes them drift; letting an agent infer setup choices (technical level, method, git flow) makes them inconsistent; a large always-loaded AGENTS.md wastes tokens; helper scripts get rewritten because nothing makes them findable.

## Decision
- Plugin: 12 skills (start, adopt, spec, feature, tdd, scripts, knowledge, decide, retro, commit, stack-nuxt-supabase, preflight), 1 read-only reviewer agent, 4 hooks (session context + resume, git guard, stray-script reminder, end-of-turn checkpoint). Every release is smoke-tested live in headless Claude Code (`scripts/e2e/live.mjs`). Updated with `/plugin update`.
- CLI (`npx @razcue/agent-kit init`): fixed questions (setup kind, technical level, language, method SDD / SDD + TDD, commit convention, git flow), writes `agent-kit.json` (with `kitVersion`), an AGENTS.md block, `.claude/settings.json`, `.knowledge/`, `scripts/`, `work/`, and optionally the app monorepo or content-site scaffold plus CI. Re-runnable; backs up every file it changes. `upgrade` asks only new questions; `uninstall` removes only what the kit added.
- Deterministic work (indexes, search, preflight, TDD status, AC trace, compact runs, context and usage reports) is done by scripts, not tokens. New capabilities are added as scripts or hooks first; a new skill only when judgment is needed, since every skill's description loads in every session. Rules are enforced by hooks/settings/preflight where possible, not prose.
- Claude Code only, for now.

## Consequences
Updating the kit is one plugin update; projects keep only their own facts. Adding another assistant later means mapping the plugin pieces to its formats.
