---
capability: plugin
---

# Plugin

## Purpose
The agent-kit plugin as it is distributed: its manifest, README and license, and what it runs on the user's machine.

## Requirements

### plugin.R1 — Listing metadata
The plugin folder shall contain a README of at least 40 words outside code blocks, a license and a square PNG icon at `.claude-plugin/icon.png`, and `plugin.json` shall set `name`, `displayName`, `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords` and `privacyPolicyUrl`.

#### plugin.R1.S1 — Manifest complete @simple
- Given `plugin/.claude-plugin/plugin.json`
- When its fields are read
- Then every listed field is set, `homepage`, `repository` and `privacyPolicyUrl` are URLs, and the marketplace entry has the same name, version and description

#### plugin.R1.S2 — README long enough without code @boundary
- Given `plugin/README.md`
- When its words outside fenced code blocks are counted
- Then there are at least 40, and `plugin/LICENSE` exists

#### plugin.R1.S3 — Square icon in range @boundary
- Given `plugin/.claude-plugin/icon.png`
- When its PNG header is read
- Then it is square, 512 to 2048 px on each side, and under 2 MB

#### plugin.R1.S4 — Privacy page published @interface
- Given the `privacyPolicyUrl` in `plugin.json`
- When the docs site is built
- Then the page exists in English and Spanish

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

### plugin.R4 — Environment stays local
The plugin README shall state that the scripts pass the user's environment only to the local tools they start and that nothing from it reaches the MCP server or any other service.

#### plugin.R4.S1 — Disclosed @simple
- Given `plugin/README.md`
- When it is read
- Then it says the environment reaches only local tools (git, commitlint, the project's tests) and never the MCP server

#### plugin.R4.S2 — Guard without a download pattern @exception
- Given `plugin/scripts/git-guard.mjs`
- When its source is scanned
- Then it contains no download-like word (`fetch`, `pull`, `clone`, `curl`, `wget`), still treats `git fetch` as read-only, and still blocks `git pull` and `git clone` in a read-only project
