# Weekly evolve routine

Instructions for a scheduled Claude Code cloud routine on this repository (create it
with `/schedule`, weekly). The routine **proposes**; it never edits code, releases or
pushes to main. A person reviews the proposals in a normal session.

## Steps

1. **Deterministic scout** — `node scripts/evolve/scout.mjs --write`
   (new Claude Code version, new hook events, template dependencies a major behind).
2. **Inbox** — read `work/proposals/*.md` with `status: proposed`: proposals sent by
   projects with `agent-kit propose`, and earlier scout reports. Group duplicates.
3. **Trends (web research, cite every source)** — since the last routine run:
   - Claude Code changelog and docs: hooks, skills, plugins, settings, subagents.
   - New or popular Agent Skills and plugins (skills.sh, plugin marketplaces, GitHub):
     is there one that does better what a kit skill does, or fills a gap?
   - Harnesses and workflows (spec-driven, TDD, context engineering, knowledge formats
     such as OKF, harness projects): any idea that would lower tokens or catch errors?
4. **Judge each candidate** against the kit's rules (AGENTS.md): no runtime
   dependencies, script or hook before a new skill, every skill earns its listing
   tokens, Claude Code only. Drop what doesn't pass, say why in one line.
5. **Write at most 5 proposals** to `work/proposals/NNN-<slug>.md` (`status: proposed`):
   problem → proposed change (files) → expected gain (tokens, errors caught) →
   evidence and source links → how to verify (test, live, triggers).
6. **Summary** — a short list of what was proposed and what was rejected.

## After the routine (a person, in a normal session)

Pick a proposal → `feature` or `spec` lane → tests + `scripts/e2e/live.mjs` (+
`triggers.mjs` when a skill changes) → CHANGELOG + `scripts/release/bump.mjs` →
commit, push, `npm publish`. Mark the proposal `done` or `rejected`. When the scout
findings were reviewed, run `node scripts/evolve/scout.mjs --update-baseline`.
