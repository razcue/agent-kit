---
id: 006-channels
status: done # draft | approved | in-progress | done | dropped
merged: 2026-10-11
---

# Every channel points to the others

## Why
agent-kit ships through four channels — the documentation website (GitHub Pages), the docs MCP server (Vercel), the Claude Code plugin marketplace (this repository) and the npm CLI — and soon Anthropic's directory. They work one by one, but don't point to each other: the Pages root returns 404, the "Docs for agents" page still shows a placeholder URL, the plugin can't reach the MCP server, the npm package's `homepage` isn't the docs, and the CLI never mentions the docs or the MCP server. Each channel should lead to the others, so people and agents find and use whichever they need.

## What changes
- In: one source of truth for the channel URLs and commands (`cli/lib/channels.mjs`); the Pages root redirects to `/en/` or `/es/` by browser language; a "Channels" page in the docs (EN + ES) and the real MCP URL in "Docs for agents"; the plugin declares the docs MCP server (`plugin/.mcp.json`) and its README lists every channel and discloses the MCP requests; the repository README (also the npm README) lists every channel; `package.json` `homepage` / `bugs` / `keywords`; the CLI help and `init` output name the docs and the MCP server; `llms.txt` names the MCP endpoint.
- Out: a custom domain (the URLs stay in one module, so it is one edit later); publishing to npm and the directory (the user runs them).

## Capabilities
- `channels` — new: the distribution channels and how each points to the others.

## Open questions
- [x] Q1 MCP endpoint → `https://razcue-agent-kit.vercel.app/mcp` (live, verified: `list-pages` → 31 pages).

## Links
- Changes 003 (website, MCP) and 005 (plugin listing)
