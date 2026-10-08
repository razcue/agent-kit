---
name: retro
description: Retrospective that turns experience into durable setup — repeated corrections become knowledge or hook rules, reused scratch scripts get promoted, unused things get pruned. Use when the user says "retro", "what did we learn", "improve the setup", after finishing a spec, or about once a month.
---

# Retro

Goal: fewer repeated corrections and less context next time. Propose, don't apply, until the user agrees.

## 1. Gather evidence (cheap first)
- `node <scripts>/usage.mjs --days 30` — runs and failures, scripts never used, scratch scripts to promote or delete, orphan knowledge, work status.
- `node <scripts>/context.mjs` — tokens loaded every session and skills Claude Code can't see.
- `git log --oneline --since="30 days ago"` and the `work/` files finished in that window.
- This conversation: every time the user corrected you ("no", "don't", "always", "from now on", "again…"), and every check that failed more than once.

## 2. Classify each finding
| Finding | Becomes |
|---|---|
| A fact or convention the agent kept missing | knowledge entry (`knowledge` skill), right scope |
| A choice with lasting impact | decision (`decide` skill) |
| A rule that can be checked by a machine | a preflight check, a hook or a permission rule — prefer this to prose |
| A scratch script used ≥ 2 times | promoted script (`scripts` skill, with test) |
| A skill or knowledge entry nobody uses / context over budget | prune, shorten the summary, or move details out of AGENTS.md |
| An improvement to agent-kit itself (any project would benefit) | global `meta` knowledge, or a note for the agent-kit repo |

## 3. Propose
A short numbered list: finding → proposed change → where it lands → why (one line each). Biggest saving first.

## 4. Apply what the user accepts
Use the matching skill for each item; finish with `knowledge.mjs index`, `scripts.mjs index` and `check`. Report what changed in one line per item.
