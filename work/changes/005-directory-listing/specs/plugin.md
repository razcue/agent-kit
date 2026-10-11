# Delta — plugin

## Purpose
The agent-kit plugin as it is distributed: its manifest, README and license, and what it runs on the user's machine.

## ADDED Requirements

### plugin.R1 — Listing metadata
The plugin folder shall contain a README of at least 40 words outside code blocks and a license, and `plugin.json` shall set `name`, `displayName`, `description`, `version`, `author`, `homepage`, `repository`, `license` and `keywords`.

#### plugin.R1.S1 — Manifest complete @simple
- Given `plugin/.claude-plugin/plugin.json`
- When its fields are read
- Then every listed field is set, `homepage` and `repository` are URLs, and the marketplace entry has the same name, version and description

#### plugin.R1.S2 — README long enough without code @boundary
- Given `plugin/README.md`
- When its words outside fenced code blocks are counted
- Then there are at least 40, and `plugin/LICENSE` exists

### plugin.R2 — Pinned launchers
The plugin shall run no package launcher without an exact version.

#### plugin.R2.S1 — No unpinned launcher in the plugin @exception
- Given every file in the plugin folder
- When it is scanned for `npx`, `bunx`, `uvx` and `pnpm dlx` commands
- Then each names its package with an exact version

#### plugin.R2.S2 — The project's own tools first @one
- Given a project with `node_modules/.bin/tsx` and `node_modules/.bin/vitest`
- When a `.ts` script or a vitest test is run
- Then the local binary runs; without it, `npx --yes tsx@4.23.15` or `npx --yes vitest@5.0.3`

### plugin.R3 — The CLI version follows the plugin
When `bump.mjs` sets a version, the release script shall write it into every `@razcue/agent-kit@<version>` command in the plugin folder.

#### plugin.R3.S1 — Commands re-pinned on release @one
- Given a plugin file containing `npx @razcue/agent-kit@0.14.0 upgrade`
- When the version is bumped to 0.14.1
- Then the file says `npx @razcue/agent-kit@0.14.1 upgrade`
