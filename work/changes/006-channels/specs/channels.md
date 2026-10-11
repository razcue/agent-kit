# Delta — channels

## Purpose
Where agent-kit is published — documentation website, docs MCP server, Claude Code plugin marketplace, npm CLI — and how each channel points to the others.

## ADDED Requirements

### channels.R1 — Every channel names the others
The documentation website, the repository README, the npm package, the plugin README and the CLI help shall each give the documentation URL, the MCP endpoint, the plugin install command and the npx command, all taken from `cli/lib/channels.mjs`.

#### channels.R1.S1 — All sources list all channels @many
- Given the docs "Channels" page (EN and ES), the repository README, the plugin README and the CLI help
- When each is read
- Then each contains the documentation URL, the MCP endpoint, the plugin install command and the npx command

#### channels.R1.S2 — No stale placeholder @exception
- Given the documentation and READMEs
- When they are searched for `<your-vercel-deployment>`
- Then nothing is found

### channels.R2 — The website root works
When a visitor opens the GitHub Pages root, the website shall redirect to `/es/` if the browser prefers Spanish and to `/en/` otherwise.

#### channels.R2.S1 — Root page generated @simple
- Given a generated site without `index.html`
- When the post-build step runs with the base `/agent-kit/`
- Then `index.html` exists and sends the visitor to `/agent-kit/en/` without JavaScript

#### channels.R2.S2 — Spanish browsers land in Spanish @boundary
- Given browser languages `es-ES, en`
- When the root page picks a locale
- Then it is `es`; for `fr, de` it is `en`

### channels.R3 — The plugin uses the docs MCP server
Where the plugin is enabled, the plugin shall declare the `agent-kit-docs` MCP server at its https endpoint and disclose in its README what is sent to it.

#### channels.R3.S1 — Declared over https @interface
- Given `plugin/.mcp.json`
- When it is read
- Then it declares `agent-kit-docs` with type `http` and the endpoint from `cli/lib/channels.mjs`, and the plugin README mentions the endpoint

#### channels.R3.S2 — Live server answers @one
- Given the deployed MCP endpoint
- When an MCP client calls `list-pages` for `en`
- Then it returns the documentation pages

### channels.R4 — npm package metadata
The npm package shall set `homepage` to the documentation URL and set `repository`, `bugs` and `keywords`.

#### channels.R4.S1 — Metadata set @simple
- Given `package.json`
- When it is read
- Then `homepage` is the documentation URL, `bugs` points to the repository's issues, and `keywords` is not empty
