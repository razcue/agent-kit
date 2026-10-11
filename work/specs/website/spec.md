---
capability: website
---

# Website

## Purpose
The agent-kit documentation website: what it covers, in which languages, and how it stays true to the kit.

## Requirements

### website.R1 — Static Docus site
When the site workflow runs, the build shall generate the Docus site in `site/` to static files and publish them to GitHub Pages under the repository's base path.

#### website.R1.S1 — Pages build @simple
- Given a push to the main branch that changes `site/`
- When the pages workflow runs
- Then the generated site is published at https://razcue.github.io/agent-kit/

#### website.R1.S2 — Assets under the base path @interface
- Given the site is served from `/agent-kit/`
- When a visitor opens any page
- Then every link, image, script and stylesheet resolves under `/agent-kit/`

#### website.R1.S3 — Broken build is not published @exception
- Given a change that makes `nuxt generate` fail
- When the pages workflow runs
- Then the workflow fails and the published site stays as it was

### website.R2 — Every page in every language
Where a locale is configured, the website shall serve every page in that locale at the same path, with a language switcher and localized interface strings.

#### website.R2.S1 — Switch language keeps the page @simple
- Given a visitor on `/en/reference/cli`
- When they choose Español in the language switcher
- Then they land on `/es/reference/cli`

#### website.R2.S2 — Missing translation fails the check @exception
- Given `content/en/guides/qa-pass.md` without `content/es/guides/qa-pass.md`
- When the docs check runs
- Then it fails and names the missing Spanish page

#### website.R2.S3 — Interface strings localized @many
- Given the Spanish site
- When a visitor uses navigation, search and the table of contents
- Then every interface label is in Spanish

### website.R3 — Stale translations are reported
When an English page changes after its translation was written, the docs check shall report that translation as stale.

#### website.R3.S1 — Edited source flags its translation @boundary
- Given `content/es/concepts/lanes.md` recorded the hash of the English page
- When one sentence of `content/en/concepts/lanes.md` changes
- Then the docs check lists `es/concepts/lanes.md` as stale

#### website.R3.S2 — Untouched source passes @zero
- Given no English page changed since its translation
- When the docs check runs
- Then it reports no stale translation

### website.R4 — Reference generated from the source
When `docs.mjs sync` runs, the release script shall regenerate the reference pages for CLI commands and flags, setup questions and `agent-kit.json` fields, skills, hooks and the changelog from the kit's source, and a second run shall change nothing.

#### website.R4.S1 — New skill gets its page @one
- Given a new skill folder `plugin/skills/foo/` with a description
- When `docs.mjs sync` runs
- Then the English skills reference has an entry for `foo` with that description
- And the docs check reports the Spanish skills page as stale until it is translated

#### website.R4.S2 — Idempotent @simple
- Given the reference pages are current
- When `docs.mjs sync` runs again
- Then no file changes

#### website.R4.S3 — Stale reference fails the tests @exception
- Given a CLI flag added to the help text without running `docs.mjs sync`
- When `npm test` runs
- Then the docs test fails and names the stale reference page

### website.R5 — Complete coverage
The documentation shall cover installation, every setup kind, upgrade, uninstall, every workflow listed in the proposal, and have a reference entry for every CLI command, skill, hook and script command.

#### website.R5.S1 — Every CLI command documented @many
- Given the commands listed in the CLI help
- When the docs check runs
- Then each command has a reference entry and at least one page that explains when to use it

#### website.R5.S2 — Undocumented command fails @exception
- Given a new CLI command without a reference entry
- When the docs check runs
- Then it fails and names the command

### website.R6 — Machine-readable docs
The website shall publish `llms.txt` and `llms-full.txt` generated from the English content.

#### website.R6.S1 — llms files published @simple
- Given a successful build
- When an agent fetches `/agent-kit/llms.txt` and `/agent-kit/llms-full.txt`
- Then it gets the index and the full English documentation

#### website.R6.S2 — Spanish pages stay out of llms-full @boundary
- Given every page exists in English and Spanish
- When `llms-full.txt` is generated
- Then it holds each page once, in English

### website.R7 — MCP server on Vercel
Where the site is deployed to Vercel, the deployment shall serve Docus's MCP server at `/mcp`, so agents can list and read the documentation pages.

#### website.R7.S1 — Agent lists pages @simple
- Given the site deployed to Vercel from `site/`
- When an MCP client calls `list-pages` on `/mcp`
- Then it gets every documentation page with title, path and description

#### website.R7.S2 — Static build has no MCP route @interface
- Given the GitHub Pages build (`nuxt generate`)
- When it finishes
- Then the static output contains no `/mcp` endpoint and the docs say where the MCP server lives
