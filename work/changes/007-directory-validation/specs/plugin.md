# Delta — plugin

## MODIFIED Requirements

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

## ADDED Requirements

### plugin.R4 — Environment stays local
The plugin README shall state that the scripts pass the user's environment only to the local tools they start and that nothing from it reaches the MCP server or any other service.

#### plugin.R4.S1 — Disclosed @simple
- Given `plugin/README.md`
- When it is read
- Then it says the environment reaches only local tools (git, commitlint, the project's tests) and never the MCP server

#### plugin.R4.S2 — Guard without a download pattern @exception
- Given `plugin/scripts/git-guard.mjs`
- When its source is scanned
- Then it contains no download command name (`fetch`, `curl`, `wget`) and still treats `git fetch` as read-only
