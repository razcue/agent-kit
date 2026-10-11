---
name: knowledge
description: Read and write the scoped knowledge base — business concepts, environment facts, stack conventions, UI/UX rules, cross-project meta rules. Use before working in an unfamiliar area ("how do we…", "what is…"), and whenever a lasting fact, rule or convention comes up that a future session must know ("remember…", "from now on…", "the rule is…").
---

# Knowledge

One concept per Markdown file, linked with `[[name]]`. The session context lists every active entry and the path of `knowledge.mjs`.

## Read
1. Pick entries from the session index; if none fits, run `node <knowledge.mjs> find <words>` (add `--body` to search text).
2. Open only the files you need. Don't load whole scopes.

## Write
1. **Search first.** If an entry covers it, update that file — never create a near-duplicate.
2. **Choose the scope:**

   | The fact is about… | Scope | Where |
   |---|---|---|
   | this business: concepts, rules, formulas, vocabulary | `business` | project |
   | environments: URLs, services, deploy, data locations (no secrets) | `env` | project |
   | something true only on this machine | `local` | project, gitignored |
   | a project-specific UI/UX rule | `ux` | project |
   | how this project uses the stack, beyond the global rules | `stack` | project |
   | a project decision | `decisions` | use the `decide` skill |
   | the stack in any project (Nuxt, Supabase, shadcn-vue…) | `stack` | global |
   | UI/UX conventions for every project | `ux` | global |
   | architecture, workflow, cross-project decisions | `meta` | global |

   Global entries go to the agent-kit clone. If `knowledge.mjs paths` says global is not writable, write the entry in the project and tell the user to run `npx @razcue/agent-kit@0.14.2 setup` in their agent-kit clone to make global writable.
3. **Write the file** `<scope>/<name>.md` (kebab-case `name` = file name):
   ```markdown
   ---
   name: money-three-decimals
   title: Money uses 3 decimals
   type: rule # concept | rule | decision | howto | reference
   status: active # active | proposed | superseded | deprecated
   tags: [money, format]
   summary: One line — what an agent must know without opening the file.
   ---

   The rule or concept, with the reason. ≤ 40 lines. Link related entries: [[other-name]].
   ```
4. Run `node <knowledge.mjs> index` (add `--global` for global writes) then `check`. Fix errors.

## Rules
- The `summary` line is what loads every session: make it self-sufficient.
- State the **why**; a rule without its reason gets misapplied.
- No secrets, tokens or passwords anywhere in knowledge.
- Don't copy what the code or git history already says; record what is not derivable.
- Never delete a decision — mark it `superseded` and link the replacement.
