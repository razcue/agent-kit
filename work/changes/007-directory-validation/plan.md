# Plan — Clear the directory validator's warnings

## Changes
| Area | File | Change |
|------|------|--------|
| Plugin | `plugin/.claude-plugin/icon.png` (new) | 1024 × 1024 PNG of the razcue.github.io terminal icon |
| Plugin | `plugin/.claude-plugin/plugin.json`, `plugin/README.md` | `privacyPolicyUrl`; environment disclosure; Privacy section |
| Scripts | `plugin/scripts/git-rules.mjs` (new), `plugin/scripts/git-guard.mjs` | read-only subcommand data moved out of the guard |
| Docs | `4.reference/8.privacy.md` (EN + ES) | the privacy policy |
| Release | CHANGELOG (EN + ES), 0.14.2 | |

## Decisions
- Both policy holds stay: each has a documented reason and a reviewer reads them; clearing them would mean rewriting the hooks in shell and starving local tools of the environment.

## Risks
- The "download-and-execute" warning is heuristic; the guess (a download word next to shell handling) is confirmed only by re-running **Validate**.
