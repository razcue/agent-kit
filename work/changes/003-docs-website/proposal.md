---
id: 003-docs-website
status: done # draft | approved | in-progress | done | dropped
merged: 2026-10-11
---

# Documentation website on Docus (full docs, i18n)

## Why
The site is one hand-written HTML landing page per language (`site/index.html`, `site/es/index.html`). It explains the idea but documents almost nothing: installation flags, every command, every skill, upgrade, the spec / QA workflows and `agent-kit.json` live only in the README, CHANGELOG and skill files. Two hand-kept languages already drift. Users (and agents reading `llms.txt`) need the whole thing, in their language, and the docs must not go stale as the kit changes.

## What changes
- In:
  - `site/` becomes a **Docus v5** project (Nuxt 4 + Nuxt Content + Nuxt UI, the same stack as the monorepo template's `apps/docs`), generated to static files and deployed to GitHub Pages by the existing workflow (with a build step).
  - **i18n**: every page and UI string in **English and Spanish** (`content/en/`, `content/es/`, same tree), language switcher, `/en/…` and `/es/…` routes; adding a locale = one folder + one line of config.
  - **Full documentation** — landing page (current content, ported) plus:
    - Getting started: what agent-kit is, requirements, install (`init`: every kind, question and flag), plugin install, first session, `doctor`, `upgrade`, `uninstall`.
    - Concepts: lanes and methods, living specs and notation (EARS / Given-When-Then / ZOMBIES), changes and merge, traceability, QA and test data, knowledge scopes, scripts registry, hooks and guardrails, session context and budget, how the kit improves itself.
    - Guides (workflows, step by step): new app monorepo, content site for non-technical users, adopting an existing project, a spec-lane change end to end, a fast-track change, the TDD loop, a QA pass, seeding / purging test data, releasing and upgrading projects, proposing improvements to the kit.
    - Reference: every CLI command and flag, `agent-kit.json` fields, every skill (plugin + stack), hooks, each script's commands (`specs`, `qa`, `work`, `knowledge`, `scripts`, `tdd`, `preflight`, `commit`, `context`, `usage`), templates, the `work/` layout, the changelog.
  - **Generated reference, so it can't drift**: `scripts/release/docs.mjs` writes the reference pages (CLI help, skill frontmatter, setup questions, hooks, CHANGELOG) from the source; a test fails when they are stale or when a command / skill / flag has no page.
  - **Translations tracked**: each translated page records the hash of its English source; the check lists stale translations.
  - Built-in from Docus: search, dark mode, `llms.txt` + `llms-full.txt` (replaces the hand-written one), Docus's default look.
  - **MCP server on Vercel**: the same Docus app built as a server (`nuxt build`) on Vercel exposes Docus's MCP server (`/mcp`: `list-pages`, `get-page`) so agents can query the docs; GitHub Pages stays the public static site. The kit ships the config; the user links the Vercel project.
  - The Spanish non-technical guide (`docs/guia-sitio-web.md`) moves into the site as a guide, with an English version.
- Out:
  - Docus's AI assistant (needs an LLM API key and a server).
  - Locales beyond EN / ES for now.
  - A custom domain (stays https://razcue.github.io/agent-kit/ unless decided).

## Capabilities
- `website` — new: the documentation site, its languages and its freshness checks.

## Open questions
- [x] Q1 Languages → English and Spanish now.
- [x] Q2 Hosting → static GitHub Pages for the website; Vercel for the MCP server.
- [x] Q3 Spanish reference → hand translations, tracked by the hash of the generated English page.
- [x] Q4 Look → Docus's default.
- [x] Q5 → the guide moves into the site, with an English version.

## Links
- Knowledge: [[agent-kit-architecture]]
- Docus: https://docus.dev (v5, i18n template `npx create-docus my-docs -t i18n`)
