# agent-kit

A minimal harness for agent-driven development with Claude Code. It gives every request a lane (answer, fast-track or spec), keeps living specs as the source of truth — EARS requirements with Given/When/Then scenarios tagged by ZOMBIES category, each traced to a test — and enforces your rules with hooks instead of prose. Sessions resume where the last one stopped, scripts are reused instead of rewritten, and a QA checklist follows the specs.

## Channels

| Channel | Where | Use |
|---|---|---|
| Documentation | https://razcue.github.io/agent-kit/ (English and Spanish) | Read everything: installation, concepts, guides, reference |
| Docs for agents (MCP) | https://razcue-agent-kit.vercel.app/mcp | This plugin declares it as `agent-kit-docs`, so Claude can look things up in the docs |
| Claude Code plugin | `/plugin install agent-kit --marketplace razcue/agent-kit` | This plugin, from the repository's marketplace |
| npm CLI | `npx @razcue/agent-kit@0.14.3 init my-project` | Sets up a project for the plugin |

The documentation also publishes `llms.txt` and `llms-full.txt`.

## What it adds

- **11 skills**, loaded only when a task needs them: `start`, `spec`, `feature`, `tdd`, `scripts`, `knowledge`, `decide`, `commit`, `preflight`, `retro`, `adopt`.
- **A read-only `reviewer` agent** that reviews a diff against its change and its scenarios.
- **4 hooks** (Claude Code only):
  - `SessionStart` reads `agent-kit.json`, the project's `.knowledge/`, `work/` and `scripts/` folders and the last checkpoint, and adds a short project context to the session.
  - `PreToolUse` (Bash) checks git commands against the git flow in `agent-kit.json` and blocks the ones it forbids, such as a commit on the main branch or a force-push.
  - `PostToolUse` (Write) reminds the agent to keep and document a script it wrote somewhere it would be lost.
  - `Stop` writes `.agent-kit/checkpoint.json` (branch, changed files, active work) so the next session can resume.
- **The `agent-kit-docs` MCP server** (remote, https), with two read-only tools: `list-pages` and `get-page`.
- **Zero-dependency Node scripts** (`plugin/scripts/`) for specs, QA, work tracking, knowledge, TDD, preflight and commits.

The hooks are silent in projects without an `agent-kit.json`.

## What it runs and sends

Everything runs locally, except one remote MCP server. The plugin collects no data. When Claude calls the `agent-kit-docs` tools, the request goes to https://razcue-agent-kit.vercel.app/mcp (hosted on Vercel) and carries only the page path or the locale being looked up — never project files or conversation content. The scripts pass your environment only to the local tools they start (git, commitlint, your project's tests); it never reaches the MCP server or any other service. The scripts make no network requests; they read the project's files, run read-only `git` commands (`rev-parse`, `diff`, `status`, `log`, `for-each-ref`), and write only inside the project (`.agent-kit/`, `work/`, `.knowledge/`, `scripts/`). When the agent runs a project script or its tests through the script registry, it uses `node`, `bash`, or the project's own `tsx` / `vitest` — falling back to `npx --yes tsx@4.23.15` or `npx --yes vitest@5.0.3`, which download those exact versions from the npm registry.

## Install

In a Claude Code session (2.1.275 or later):

```text
/plugin install agent-kit --marketplace razcue/agent-kit
```

From your shell: `claude plugin install agent-kit --marketplace razcue/agent-kit`. Or add it from Anthropic's directory on claude.ai once it is listed there.

## Set up a project

The companion CLI asks a few fixed questions and writes `agent-kit.json`, a managed block in `AGENTS.md`, settings, knowledge and work folders:

```bash
npx @razcue/agent-kit@0.14.3 init my-project
```

Then open Claude Code in the project. Without that file, the skills still load but the hooks stay silent.

## Privacy

No accounts, analytics or telemetry. Full policy: https://razcue.github.io/agent-kit/en/reference/privacy

## License

MIT — see [LICENSE](LICENSE).
