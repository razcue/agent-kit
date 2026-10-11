# Plan — Documentation website on Docus (full docs, i18n)

## Changes
| Area | File | Change |
|------|------|--------|
| Site | `site/` → Docus 5 project: `package.json`, `nuxt.config.ts` (docus layer, `@nuxtjs/i18n` en/es, site url, MCP on), `app.config.ts`, `content/{en,es}/` | replaces the plain HTML pages, `assets/`, hand-written `llms.txt` |
| Content | `content/<locale>/index.md` landing; `1.getting-started/`, `2.concepts/`, `3.guides/`, `4.reference/` | full docs; the non-technical guide moves from `docs/guia-sitio-web.md` (+ English version) |
| Script | `scripts/release/docs.mjs` (+ test) | `sync` writes generated English reference pages from the source; `check` → missing / stale translations (source hash), stale generated pages, undocumented CLI commands; `stamp <es pages>` records the English hash after translating |
| CLI | `cli/lib/help.mjs` | the help text, importable (cli/index.mjs runs on import) |
| Release | `scripts/release/bump.mjs` | runs `docs.mjs sync` instead of `site.mjs` (removed with its test) |
| Tests | `test/site.test.mjs` | rewritten: Docus config, both locales, `docs.mjs check` clean |
| CI | `.github/workflows/pages.yml` | Node 22, `npm ci` + `nuxt generate` in `site/` with `NUXT_APP_BASE_URL=/agent-kit/`, upload `.output/public` |
| Vercel | `site/vercel.json` + docs page | server build, MCP at `/mcp`; the user links the project (root directory `site`) |
| Docs | README, AGENTS.md, CHANGELOG | new site layout and commands |

## Decisions
- Generated reference = the source of truth for facts (commands, flags, skills, hooks, config); hand pages explain and link to it.
- Translations are hand-written and tracked by the English page's hash (`sourceHash` frontmatter); `docs.mjs check` fails on missing or stale ones, so `npm test` enforces both languages.
- `site/` keeps its own dependencies; the npm package (`files`) doesn't include it — the kit stays zero-dependency.

## Risks
- Docus/i18n behaviour under a base path (`/agent-kit/`) → verify with a real `nuxt generate` and a link check on the output.
- Large translation surface → the stale check makes drift visible instead of silent.
- MCP server needs Vercel — can't be verified live from here; config + build verified locally (`nuxt build`, `/mcp` route present).
