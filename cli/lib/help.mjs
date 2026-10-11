// The CLI help text: printed by `agent-kit help` and turned into the website's CLI reference (scripts/release/docs.mjs).
export const HELP = `agent-kit — minimal agent-driven development kit for Claude Code

  agent-kit init [dir]     ask the setup questions and write the project (re-runnable)
      --name <kebab>  --kind monorepo|site|existing|blank  --stack none|nuxt-supabase|nuxt-content-site  --apps web,app,docs
      --level technical|non-technical  --lang en|es  --method sdd-tdd|sdd  --commits conventional|none  --git pr|trunk|read-only
      --main <branch>  --marketplace github:<owner/repo>|<local path>  --yes (defaults, no prompts)
      --supabase-mcp <project-ref>   read-only Supabase MCP server in .mcp.json
      --qa-checklist true|false  --test-data true|false (Supabase only)  --test-prefix TEST_  --test-data-dir supabase/test-data
  agent-kit upgrade [dir] [--yes]   new questions only + re-apply the agent layer + what's new
  agent-kit propose "<title>" [--kind skill|hook|…] [--body …]   send an improvement idea to the kit
  agent-kit uninstall [dir] [--dry-run]   remove what agent-kit added (backed up; your content stays)
  agent-kit setup [--home <agent-kit clone>]   make global knowledge writable on this machine
  agent-kit doctor [dir] [--fix]   check a project's agent setup (--fix regenerates indexes and the board)
  agent-kit knowledge <paths|find|index|check> ...   knowledge base tools
  agent-kit scripts <find|list|run|test|new|index|check> ...   script registry
  agent-kit tdd <status|run> ...   TDD status and related-test runs
  agent-kit work <status|board|trace|new> ...   active work, board, scenario trace of a change
  agent-kit specs <lint|next|merge|trace|list> ...   living specs: notation lint, next id, merge a change, trace
  agent-kit qa <sync|run|status|gaps> ...   QA checklist from the living specs, QA runs, test-data fixture gaps
  agent-kit preflight [base]   pre-merge checklist (exit 1 = block)
  agent-kit context [dir] [--budget N]   tokens loaded every session + invisible skills
  agent-kit usage [--days N]   usage signals for a retro
  agent-kit commit draft [--staged] | check "<message>"   Conventional Commit helpers
`
