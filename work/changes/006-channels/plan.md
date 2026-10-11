# Plan — Every channel points to the others

## Changes
| Area | File | Change |
|------|------|--------|
| CLI | `cli/lib/channels.mjs` (new), `cli/lib/help.mjs`, `cli/lib/init.mjs` | channel URLs and commands in one place; help footer; `init` "Next" names docs + MCP |
| Release | `scripts/release/docs.mjs` | reads the help from the module (it now interpolates the channels) |
| Site build | `scripts/release/site-base.mjs` | `pickLocale` + `rootPage`: a root `index.html` on Pages |
| Plugin | `plugin/.mcp.json` (new), `plugin/README.md` | declares `agent-kit-docs`; channels table; discloses what reaches the MCP server |
| Repo / npm | `README.md`, `package.json` | channels table; `homepage`, `repository`, `bugs`, `keywords` |
| Docs | `1.getting-started/5.channels.md` (EN + ES), "Docs for agents" (EN + ES), `site/nuxt.config.ts` (`llms.description`) | channels explained; real MCP URL; MCP endpoint in llms.txt |

## Decisions
- The plugin declares the docs MCP server, so agents with the plugin can read the docs without setup; the README states it sends only page paths / locales.
- URLs live in one module so a custom domain later is one edit plus the docs text the channels test checks.

## Risks
- A plugin with a remote MCP server: Anthropic suggests submitting the server as a connector too (optional).
