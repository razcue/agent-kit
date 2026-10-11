---
seo:
  title: agent-kit — a minimal harness for Claude Code
  description: Answer a few questions, get a project your agent understands. Rules enforced by hooks, a small session context, work that resumes, living specs traced to tests, QA that follows the specs.
---

::u-page-hero
---
orientation: horizontal
ui:
  title: text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]
---
#headline
:repo-stats

#title
Answer a few questions. Get a project your agent [understands]{.text-primary}.

#description
agent-kit sets up a project for agent-driven development with Claude Code: rules enforced by hooks instead of prose, a small context loaded every session, work that resumes where it stopped, living specs traced to tests, and a QA checklist that follows the specs.

#links
  :::u-button
  ---
  size: xl
  to: /en/getting-started/installation
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/razcue/agent-kit
  variant: outline
  ---
  View on GitHub
  :::

#default
  :::terminal-demo
  ---
  title: ~/shop
  replay: Replay
  lines:
    - { t: cmd, text: "npx @razcue/agent-kit init shop" }
    - { t: q, text: "Setup", a: "New app monorepo" }
    - { t: q, text: "Technical level", a: "Technical" }
    - { t: q, text: "Development method", a: "SDD + TDD" }
    - { t: q, text: "Git flow for the agent", a: "Branches + pull requests" }
    - { t: q, text: "QA checklist · Supabase test data", a: "Yes · Yes" }
    - { t: gap }
    - { t: ok, text: "apps/web · apps/app · apps/docs · packages/ui · packages/shared" }
    - { t: ok, text: "AGENTS.md · agent-kit.json · .claude/settings.json" }
    - { t: ok, text: ".knowledge/ · work/specs/ · work/qa/ · supabase/test-data/" }
    - { t: ok, text: "plugin agent-kit@agent-kit enabled" }
    - { t: gap }
    - { t: out, text: "Next: cd shop && npm install && claude" }
  ---
  :::
::

::u-page-section
#title
Less context, more work

#description
What the agent reads before your first question, measured with `agent-kit context`.

#default
  :::context-meter
  ---
  without: 22974
  with: 3631
  without-label: A real production project, rules in AGENTS.md + memory
  with-label: A new agent-kit monorepo, everything included
  saved-label: less context every session
  source: Both measured with agent-kit context, including the same personal ~/CLAUDE.md. agent-kit's own session context is about 1,300 tokens; doctor fails a project above 8,000.
  ---
  :::

  :::compare-rows
  ---
  without-title: On your own
  with-title: With agent-kit
  rows:
    - topic: Rules
      without: A line in AGENTS.md the agent may forget or ignore.
      with: Hooks and checks — the git guard blocks what your git flow forbids, live-tested every release.
    - topic: New session
      without: You explain again where you were and what was next.
      with: It starts with the last checkpoint and each piece of work's next task.
    - topic: Requirements
      without: Scattered across chats and tickets; nobody knows the current truth.
      with: Living specs — EARS requirements with Given / When / Then scenarios, ids never reused.
    - topic: Proof
      without: “Looks done.”
      with: Every scenario traced to a test or a check; preflight blocks a change that isn't.
    - topic: Scripts
      without: Rewritten in /tmp every time, lost the next day.
      with: Searched first, kept with a header and a test, run with a compact result.
    - topic: QA
      without: Clicking around from memory.
      with: A checklist generated from the living specs, dated runs, seed / purge test data.
    - topic: Setup
      without: Hand-written AGENTS.md, settings, hooks and conventions.
      with: One command, about ten questions, nothing inferred.
  ---
  :::
::

::u-page-section
---
orientation: horizontal
---
#title
Rules that are enforced, not requested

#description
"Never commit on main" in a Markdown file is a suggestion. agent-kit's git guard reads your git flow and blocks the command before it runs — even through `bash -c`, `eval` and aliases — and tells the agent what to do instead.

#links
  :::u-button
  ---
  color: neutral
  variant: outline
  to: /en/concepts/guardrails
  trailing-icon: i-lucide-arrow-right
  ---
  Guardrails
  :::

#default
  :::terminal-demo
  ---
  title: agent · shop (main)
  replay: Replay
  lines:
    - { t: cmd, text: 'git commit -m "feat: add invoices"' }
    - { t: err, text: "[agent-kit git-guard] Git flow is branches + pull requests:" }
    - { t: out, text: "  don't `git commit` on main. Create a feature branch first" }
    - { t: out, text: "  (`git switch -c feat/<name>`)." }
    - { t: gap }
    - { t: cmd, text: "git switch -c feat/invoices" }
    - { t: ok, text: "Switched to a new branch 'feat/invoices'" }
  ---
  :::
::

::u-page-section
#title
Living specs that merge, not rot

#description
A change carries a delta. When it is verified, one command merges it into the living spec: the new requirement lands, the removed one is retired for good, and its scenario is already proven by a test and listed for QA.

#default
  :::spec-merge
  ---
  delta-label: Change 004 — delta spec
  spec-label: Living spec
  retired-label: retired
  test-label: Test
  qa-label: QA checklist
  ---
  :::
::

::u-page-section
#title
How it works

#features
  :::u-page-feature
  ---
  icon: i-lucide-list-checks
  to: /en/getting-started/installation
  ---
  #title
  Answer fixed questions

  #description
  Setup kind, technical level, language, method (SDD or SDD + TDD), commits, git flow, QA. Nothing is inferred.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-layers
  to: /en/getting-started/project-layout
  ---
  #title
  Get the agent layer

  #description
  A short AGENTS.md block, agent-kit.json, enforced settings, knowledge, work files, scripts — and the plugin with its skills and hooks.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-route
  to: /en/concepts/lanes-and-methods
  ---
  #title
  Work in lanes

  #description
  Answer, fast-track or spec. Complex work becomes a change with EARS requirements and Given/When/Then scenarios that merge into the living specs.
  :::
::

::u-page-section
#title
What you get

#features
  :::u-page-feature
  ---
  icon: i-lucide-book-open-check
  to: /en/concepts/living-specs
  ---
  #title
  Living specs, one notation

  #description
  EARS requirements, Given/When/Then scenarios as acceptance tests, ZOMBIES to pick the cases — merged by a script, ids never reused.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-clipboard-check
  to: /en/concepts/qa-and-test-data
  ---
  #title
  QA that follows the specs

  #description
  A checklist generated from the living specs, dated QA runs, and Supabase test data that refuses to run on production.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-sparkles
  to: /en/reference/skills
  ---
  #title
  Skills loaded only when needed

  #description
  Eleven plugin skills plus one stack skill per template; descriptions are tested to trigger on real requests and stay quiet otherwise.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-shield
  to: /en/concepts/guardrails
  ---
  #title
  Guardrails that are enforced

  #description
  Git guard, preflight before a merge, commit checks, a stray-script reminder — silent outside agent-kit projects.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-brain
  to: /en/concepts/knowledge
  ---
  #title
  Knowledge that stays cheap

  #description
  One concept per file, only one-line summaries load; project, machine and global scopes.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bot
  to: /en/guides/docs-for-agents
  ---
  #title
  Docs for agents too

  #description
  llms.txt, llms-full.txt and an MCP server, so your agent can read these docs while it works.
  :::
::

::u-page-c-t-a
---
title: Start with one command
description: Node ≥ 20.11 and Claude Code. No runtime dependencies are added to your project.
variant: subtle
links:
  - label: Read the installation guide
    to: /en/getting-started/installation
    trailingIcon: i-lucide-arrow-right
  - label: Adopt an existing project
    to: /en/guides/adopt-existing-project
    color: neutral
    variant: outline
---
```bash [Terminal]
npx @razcue/agent-kit init my-project
```
::
