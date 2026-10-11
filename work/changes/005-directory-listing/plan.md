# Plan — Ready the plugin for Anthropic's directory

## Changes
| Area | File | Change |
|------|------|--------|
| Plugin | `plugin/README.md`, `plugin/LICENSE` | listing text; discloses what every hook reads, runs and writes; install line |
| Plugin | `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | displayName, homepage, repository, license, keywords, current description |
| Scripts | `plugin/scripts/scripts.mjs` | `runnerFor` / `vitestCommand`: local binaries, else exactly pinned npx |
| Scripts | `plugin/scripts/session-start.mjs` | upgrade notice names package + version, no launcher |
| Release | `scripts/release/bump.mjs` | `pinCliVersion` / `pinPluginCli` re-pin `@razcue/agent-kit@x.y.z` in the plugin |
| Docs | adopt / knowledge skills, architecture knowledge | `npx @razcue/agent-kit@0.14.1 …` |

## Decisions
- The plugin stays in `plugin/` (a subfolder): Node hook scripts there are held for a reviewer, which is a hold, not a block; moving it would change every install path.

## Risks
- The portal applies rules the CLI can't check (name, brand, policy) — run its **Validate** before submitting.
