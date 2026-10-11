// `agent-kit init`: fixed questions → agent-kit.json, AGENTS.md block, CLAUDE.md,
// .claude/settings.json, .knowledge/, work/ and (new projects) the monorepo scaffold.
// Re-runnable: an existing agent-kit.json only updates the agent layer.
import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROJECT_FILE, PROJECT_SCOPES, STATE_DIR, readJson } from "../../plugin/scripts/config.mjs"
import { writeIndexes } from "../../plugin/scripts/knowledge.mjs"
import { writeIndex as writeScriptsIndex } from "../../plugin/scripts/scripts.mjs"
import { createPrompter } from "./prompt.mjs"
import { SUPABASE_REF, withSupabaseMcp } from "./lifecycle.mjs"
import { syncQa } from "../../plugin/scripts/qa.mjs"
import { CHANNELS } from "./channels.mjs"

const TEMPLATES = fileURLToPath(new URL("../../templates/", import.meta.url))
export const KIT_VERSION = readJson(fileURLToPath(new URL("../../package.json", import.meta.url))).version
const SCAFFOLDS = new Set(["monorepo", "site"])
/** Stack → its conventions skill, installed as a project skill (.claude/skills/) only where it applies. */
export const STACK_SKILLS = { "nuxt-supabase": "stack-nuxt-supabase", "nuxt-content-site": "stack-nuxt-content-site" }
const SCAFFOLD_STACK = { monorepo: "nuxt-supabase", site: "nuxt-content-site" }

// Visible strings of the site template, for Spanish projects.
const SITE_ES = {
  "content/index.md": (name) =>
    `---\ntitle: Inicio\ndescription: ${name}\n---\n\n# ${name}\n\nBienvenido. Esta es la página de inicio: cámbiala editando \`content/index.md\`.\n`,
  "content/about.md": () =>
    "---\ntitle: Sobre nosotros\ndescription: Quiénes somos.\n---\n\n# Sobre nosotros\n\nCuenta aquí quién eres y qué ofreces.\n",
}
const DEFAULT_MARKETPLACE = "github:razcue/agent-kit"
const BLOCK_START = "<!-- agent-kit:start -->"
const BLOCK_END = "<!-- agent-kit:end -->"

export const QUESTIONS = {
  kind: [
    { value: "monorepo", label: "New app monorepo", hint: "web + app + docs scaffold on Nuxt + Supabase" },
    { value: "site", label: "New content site", hint: "one simple Nuxt site with Markdown pages — easiest" },
    { value: "existing", label: "Existing project", hint: "add the agent layer to this folder's code" },
    { value: "blank", label: "Blank project", hint: "agent layer only, no template — start from nothing" },
  ],
  stack: [
    { value: "none", label: "None", hint: "no stack conventions skill" },
    { value: "nuxt-supabase", label: "Nuxt + Supabase", hint: "stack-nuxt-supabase skill (pages, BFF routes, migrations, RPCs)" },
    { value: "nuxt-content-site", label: "Nuxt Content site", hint: "stack-nuxt-content-site skill (Markdown pages, styling, build)" },
  ],
  apps: [
    { value: "web", label: "web", hint: "public website (Nuxt, prerendered)" },
    { value: "app", label: "app", hint: "main solution (Nuxt SPA + BFF + Supabase)" },
    { value: "docs", label: "docs", hint: "help / wiki site (Docus)" },
  ],
  technicalLevel: [
    { value: "technical", label: "Technical", hint: "concise developer language" },
    { value: "non-technical", label: "Non-technical", hint: "plain language; the agent makes technical decisions" },
  ],
  language: [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
  ],
  methodology: [
    { value: "sdd-tdd", label: "SDD + TDD", hint: "spec first, then tests before code; preflight blocks untested logic" },
    { value: "sdd", label: "SDD", hint: "spec first; every scenario verified by a test or a check" },
  ],
  commitConvention: [
    { value: "conventional", label: "Conventional Commits", hint: "type(scope): subject — checked by commitlint and a git hook" },
    { value: "none", label: "Free-form", hint: "no message checks" },
  ],
  gitFlow: [
    { value: "pr", label: "Branches + pull requests", hint: "agent never commits or pushes on main" },
    { value: "trunk", label: "Trunk", hint: "commits on main; no force-push or hard reset" },
    { value: "read-only", label: "Read-only", hint: "agent never changes git; you run git yourself" },
  ],
}

export const COMMIT_DEPS = { "@commitlint/cli": "^21.2.3", "@commitlint/config-conventional": "^21.2.3", husky: "^9.1.7" }
export const COMMITLINT_CONFIG = `// Conventional Commits: type(scope): subject — checked on every commit by .husky/commit-msg.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
  },
}
`
export const COMMIT_MSG_HOOK = 'npx --no -- commitlint --edit "$1"\n'

/** package.json with commitlint + husky added (existing entries are kept). Pure. */
export function withCommitTooling(pkg) {
  const next = structuredClone(pkg)
  next.devDependencies = { ...next.devDependencies }
  for (const [name, range] of Object.entries(COMMIT_DEPS))
    if (!next.dependencies?.[name] && !next.devDependencies[name]) next.devDependencies[name] = range
  next.devDependencies = Object.fromEntries(Object.entries(next.devDependencies).sort(([a], [b]) => a.localeCompare(b)))
  next.scripts = { ...next.scripts }
  const prepare = next.scripts.prepare
  if (!prepare) next.scripts.prepare = "husky"
  else if (!/\bhusky\b/.test(prepare)) next.scripts.prepare = `${prepare} && husky`
  return next
}

// First permission layer (the git-guard hook is the backstop). Managed: re-running
// init replaces these rules and leaves every other rule alone.
export const GIT_RULES = {
  "read-only": {
    deny: ["add", "commit", "push", "reset", "restore", "checkout", "switch", "rebase", "merge", "cherry-pick", "clean", "revert", "pull"].map(
      (s) => `Bash(git ${s}:*)`,
    ),
  },
  pr: {
    deny: ["Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(git reset --hard:*)"],
    ask: ["Bash(git push:*)"],
  },
  trunk: {
    deny: ["Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(git reset --hard:*)"],
    ask: ["Bash(git push:*)"],
  },
}

const slugBranch = (s) => String(s ?? "").trim().replace(/[^\w./-]+/g, "-")
const valid = (key, value) => QUESTIONS[key].some((o) => o.value === value)

/** Whether the project's database is Supabase (test-data scripts only apply there, for now). */
export function usesSupabase(cfg, dir) {
  if (cfg.kind === "monorepo") return cfg.apps.includes("app")
  if (cfg.kind !== "existing") return false
  if (cfg.stack === "nuxt-supabase" || existsSync(join(dir, "supabase"))) return true
  const pkg = readJson(join(dir, "package.json")) ?? {}
  return ["dependencies", "devDependencies"].some((k) => pkg[k]?.["@supabase/supabase-js"] || pkg[k]?.supabase)
}

const MAIN_NAMES = ["main", "master", "trunk", "production", "prod"]

/** Pure: the main (production) branch from what git reports; `sure` = no need to ask. */
export function pickMainBranch({ originHead, branches, current }) {
  if (originHead) return { branch: originHead, sure: true }
  const known = MAIN_NAMES.filter((b) => branches.includes(b))
  if (known.length === 1) return { branch: known[0], sure: true }
  if (current && known.includes(current)) return { branch: current, sure: false }
  return { branch: known[0] ?? current ?? null, sure: false }
}

/** Read-only git facts for branch detection; empty when `dir` is not a repository. */
export function gitBranches(dir) {
  const git = (...args) => {
    try {
      return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
    } catch {
      return ""
    }
  }
  if (!existsSync(dir) || git("rev-parse", "--is-inside-work-tree") !== "true") return { repo: false, originHead: null, branches: [], current: null }
  const originHead = git("symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD").replace(/^origin\//, "") || null
  const refs = git("for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes").split("\n").filter(Boolean)
  const branches = [...new Set(refs.map((r) => r.replace(/^origin\//, "")).filter((r) => r !== "HEAD" && r !== "origin"))]
  return { repo: true, originHead, branches, current: git("branch", "--show-current") || null }
}

const bool = (flag, value) => {
  if (value === true || value === "true" || value === "yes") return true
  if (value === "false" || value === "no") return false
  throw new Error(`--${flag}: true or false`)
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "my-project"

export function marketplaceSource(spec) {
  if (spec.startsWith("github:")) return { source: "github", repo: spec.slice(7) }
  return { source: "directory", path: resolve(spec) }
}

export function mergeSettings(current, gitFlow, marketplace) {
  const s = structuredClone(current ?? {})
  s.extraKnownMarketplaces = { ...s.extraKnownMarketplaces, "agent-kit": { source: marketplace } }
  s.enabledPlugins = { ...s.enabledPlugins, "agent-kit@agent-kit": true }
  const managed = new Set(Object.values(GIT_RULES).flatMap((r) => [...(r.deny ?? []), ...(r.ask ?? [])]))
  const perms = { ...s.permissions }
  for (const kind of ["deny", "ask"]) {
    const rules = [...(perms[kind] ?? []).filter((r) => !managed.has(r)), ...(GIT_RULES[gitFlow][kind] ?? [])]
    if (rules.length) perms[kind] = rules
    else delete perms[kind]
  }
  if (Object.keys(perms).length) s.permissions = perms
  else delete s.permissions
  return s
}

export function agentsBlock(cfg) {
  return [
    BLOCK_START,
    "## Agent setup (agent-kit)",
    "",
    "<!-- Managed by `npx @razcue/agent-kit init` — change agent-kit.json answers by re-running it. -->",
    "",
    `- Profile (\`agent-kit.json\`): ${cfg.technicalLevel}, replies in ${cfg.language === "es" ? "Spanish" : "English"}, method \`${cfg.methodology}\`${cfg.methodology === "sdd-tdd" ? " (tests first: `tdd` skill)" : ""}, git flow \`${cfg.gitFlow}\` (enforced by a hook).`,
    "- Lanes: **Answer** (read-only) · **Fast-track** (`feature` skill: ≤3 files, no schema/permission/money change) · **Spec** (`spec` skill: everything else, approved before code). Work files in `work/` (map: `work/README.md`).",
    "- Specs: living specs `work/specs/<capability>/spec.md` are the source of truth (EARS + Given/When/Then + ZOMBIES); spec-lane changes merge into them.",
    "- Knowledge: `.knowledge/<scope>/` (business, env, decisions, ux, stack; `local/` is private) plus global stack/meta/ux from agent-kit. Only summaries load at session start; open entries on demand. Record facts with `knowledge`, decisions with `decide`. Don't restate knowledge in this file.",
    "- Scripts: search before writing, document every kept one (`scripts` skill). Kept: `scripts/<area>/` (index in `scripts/README.md`); throwaway: `.agent-kit/scratch/` (gitignored).",
    ...(cfg.commitConvention === "conventional"
      ? ["- Commits: Conventional Commits (`type(scope): subject`, English, ≤ 72 chars), checked by commitlint — write them with the `commit` skill."]
      : []),
    "- Resume: each session starts with the last checkpoint and the active work (`work/`); scenarios are traced to tests (the scenario id starts the test name).",
    "- Before a merge: `preflight` skill. Now and then: `retro` skill to turn repeated corrections into rules.",
    BLOCK_END,
  ].join("\n")
}

export function upsertBlock(text, block) {
  const start = text.indexOf(BLOCK_START)
  const end = text.indexOf(BLOCK_END)
  if (start !== -1 && end > start) return text.slice(0, start) + block + text.slice(end + BLOCK_END.length)
  return `${text.replace(/\s*$/, "")}\n\n${block}\n`
}

function stackSection(cfg) {
  if (cfg.kind === "site")
    return [
      "## Stack",
      "",
      "One Nuxt 4 site with Nuxt Content: every Markdown file in `content/` is a page (`content/about.md` → `/about`). Colours in `app/assets/css/main.css`. Built to static HTML.",
      "",
      "## Commands",
      "",
      "- `npm install` · `npm run dev` (preview at http://localhost:3000) · `npm run generate` (static site in `.output/public`) · `npm run check`",
      "",
      "",
    ].join("\n")
  if (cfg.kind !== "monorepo") return ""
  const purpose = {
    web: "public website (prerendered)",
    app: "main solution: SPA + BFF (`server/api`), Supabase",
    docs: "help / wiki (Docus, Markdown in `content/`)",
  }
  const rows = cfg.apps.map((a) => `| \`apps/${a}\` | ${purpose[a]} | \`npm run dev:${a}\` |`)
  if (cfg.apps.includes("web") || cfg.apps.includes("app"))
    rows.push("| `packages/ui` | Nuxt layer: shadcn-vue components, Tailwind theme | — |")
  rows.push("| `packages/shared` | Zod schemas + utils (no Nuxt/Vue imports) | — |")
  return [
    "## Stack",
    "",
    "Nuxt 4 + shadcn-vue + Tailwind v4" + (cfg.apps.includes("app") ? " + Supabase" : "") + ", npm workspaces. Conventions: `stack-nuxt-supabase` skill.",
    "",
    "| Workspace | Purpose | Dev |",
    "|---|---|---|",
    ...rows,
    "",
    "## Commands",
    "",
    "- `npm install` · `npm run check` (typecheck + tests) · `npm test` · `npm run format`",
    ...(cfg.apps.includes("app") ? ["- Migrations: `supabase/migrations/`, applied in the Supabase SQL Editor."] : []),
    "",
    "",
  ].join("\n")
}

function rootPackage(cfg) {
  const ws = (a) => `@${cfg.name}/${a}`
  return {
    name: cfg.name,
    private: true,
    type: "module",
    workspaces: ["apps/*", "packages/*"],
    scripts: {
      ...Object.fromEntries(cfg.apps.map((a) => [`dev:${a}`, `npm run dev -w ${ws(a)}`])),
      build: "npm run build --workspaces --if-present",
      typecheck: "npm run typecheck --workspaces --if-present",
      test: "vitest run",
      check: "npm run typecheck && npm test",
      format: "prettier --write .",
    },
    devDependencies: {
      prettier: "^3.8.3",
      tsx: "^4.23.13",
      typescript: "^6.0.3",
      vitest: "^5.0.3",
      "vue-tsc": "^3.3.3",
    },
  }
}

class Writer {
  constructor(root) {
    this.root = root
    this.log = []
    // Every file init changes is copied here first, so a re-run can be undone.
    this.backupDir = join(root, STATE_DIR, "backups", new Date().toISOString().replace(/[:.]/g, "-"))
    this.backedUp = 0
    this.created = new Set()
  }
  write(rel, content, { overwrite = true } = {}) {
    const path = join(this.root, rel)
    const exists = existsSync(path)
    if (exists && !overwrite) return this.log.push(`skip    ${rel} (exists)`)
    if (exists && readFileSync(path, "utf8") === content) return this.log.push(`same    ${rel}`)
    if (exists && !this.created.has(rel)) {
      mkdirSync(dirname(join(this.backupDir, rel)), { recursive: true })
      copyFileSync(path, join(this.backupDir, rel))
      this.backedUp++
    }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
    if (!exists) this.created.add(rel)
    this.log.push(`${exists ? "update" : "create"}  ${rel}`)
  }
  copyTree(srcDir, destRel, { skip = () => false, vars = {}, overwrite = false } = {}) {
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      const src = join(srcDir, entry.name)
      const target = entry.name.replace(/^_gitignore$/, ".gitignore").replace(/^_knowledge$/, ".knowledge")
      const rel = destRel ? `${destRel}/${target}` : target
      if (skip(rel)) continue
      if (entry.isDirectory()) this.copyTree(src, rel, { skip, vars, overwrite })
      else {
        let text = readFileSync(src, "utf8")
        for (const [k, v] of Object.entries(vars)) text = text.replaceAll(k, v)
        this.write(rel, text, { overwrite })
      }
    }
  }
}

function parseFlags(flags) {
  const out = {}
  if (flags.name) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(flags.name)) throw new Error("--name: lowercase letters, digits and - only")
    out.name = flags.name
  }
  for (const key of ["kind", "stack", "technicalLevel", "language", "methodology", "commitConvention", "gitFlow"]) {
    const flag = { technicalLevel: "level", language: "lang", methodology: "method", commitConvention: "commits", gitFlow: "git" }[key] ?? key
    if (flags[flag] === undefined) continue
    if (!valid(key, flags[flag]))
      throw new Error(`--${flag}: one of ${QUESTIONS[key].map((o) => o.value).join(", ")}`)
    out[key] = flags[flag]
  }
  if (flags.apps) {
    out.apps = String(flags.apps).split(",").map((s) => s.trim()).filter(Boolean)
    for (const a of out.apps) if (!valid("apps", a)) throw new Error(`--apps: choose from web, app, docs`)
  }
  if (flags.main) {
    if (!/^[\w./-]+$/.test(flags.main)) throw new Error("--main: a branch name, e.g. main or master")
    out.mainBranch = flags.main
  }
  if (flags["qa-checklist"] !== undefined) out.qaChecklist = bool("qa-checklist", flags["qa-checklist"])
  if (flags["test-data"] !== undefined) out.testData = bool("test-data", flags["test-data"])
  if (flags["test-prefix"] !== undefined) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(flags["test-prefix"])) throw new Error("--test-prefix: letters, digits and _ (e.g. TEST_)")
    out.testPrefix = flags["test-prefix"]
  }
  if (flags["test-data-dir"] !== undefined) out.testDataDir = String(flags["test-data-dir"]).replace(/\/+$/, "")
  if (flags["supabase-mcp"]) {
    if (!SUPABASE_REF.test(flags["supabase-mcp"])) throw new Error("--supabase-mcp: the 20-character project ref")
    out.supabaseMcp = flags["supabase-mcp"]
  }
  return out
}

export async function init(target, flags) {
  const dir = resolve(target ?? ".")
  const given = parseFlags(flags)
  const previous = readJson(join(dir, PROJECT_FILE))
  const nonEmpty = existsSync(dir) && readdirSync(dir).some((f) => f !== ".git")
  const defaults = {
    name: previous?.name ?? slug(basename(dir)),
    kind: previous?.kind ?? (nonEmpty ? "existing" : "monorepo"),
    apps: previous?.apps ?? ["web", "app", "docs"],
    technicalLevel: previous?.technicalLevel ?? "technical",
    language: previous?.language ?? "en",
    methodology: previous?.methodology ?? "sdd-tdd",
    commitConvention: previous?.commitConvention ?? "conventional",
    gitFlow: previous?.gitFlow ?? "pr",
    mainBranch: previous?.mainBranch ?? "main",
  }
  const settingsPath = join(dir, ".claude", "settings.json")
  const currentSettings = readJson(settingsPath)
  const marketplaceSpec =
    flags.marketplace ??
    (() => {
      const src = currentSettings?.extraKnownMarketplaces?.["agent-kit"]?.source
      if (src?.source === "github") return `github:${src.repo}`
      if (src?.source === "directory") return src.path
      return DEFAULT_MARKETPLACE
    })()

  const p = flags.yes ? null : createPrompter()
  try {
    const cfg = { $schema: "https://github.com/razcue/agent-kit#agent-kit-json", version: 1 }
    if (previous) console.log(`agent-kit.json found — updating the agent layer of "${previous.name}".\n`)
    cfg.name = previous?.name ?? given.name ?? (p ? slug(await p.text("Project name", defaults.name)) : defaults.name)
    cfg.kind = previous?.kind ?? given.kind ?? (p ? await p.select("Setup", QUESTIONS.kind, defaults.kind) : defaults.kind)
    const scaffold = !previous && SCAFFOLDS.has(cfg.kind)
    if (scaffold && nonEmpty)
      throw new Error(`${dir} is not empty: use an empty folder for a new ${cfg.kind}, or --kind existing`)
    cfg.apps =
      cfg.kind === "monorepo"
        ? previous?.apps ?? given.apps ?? (p ? await p.multi("Apps", QUESTIONS.apps, defaults.apps) : defaults.apps)
        : []
    if (cfg.kind === "monorepo" && !cfg.apps.length) throw new Error("Choose at least one app")
    for (const key of ["technicalLevel", "language", "methodology", "commitConvention", "gitFlow"]) {
      const title = {
        technicalLevel: "Technical level of the person working with the agent",
        language: "Agent reply language",
        methodology: "Development method",
        commitConvention: "Commit messages",
        gitFlow: "Git flow for the agent",
      }[key]
      cfg[key] = given[key] ?? (p ? await p.select(title, QUESTIONS[key], defaults[key]) : defaults[key])
    }
    // The main (production) branch: the flag, the saved answer, what git shows, or ask.
    let branchNote = ""
    if (given.mainBranch || previous?.mainBranch) cfg.mainBranch = given.mainBranch ?? previous.mainBranch
    else {
      const detected = pickMainBranch(gitBranches(dir))
      if (detected.sure) {
        cfg.mainBranch = detected.branch
        branchNote = " (detected)"
      } else if (p) cfg.mainBranch = slugBranch(await p.text("Main (production) branch", detected.branch ?? "main")) || detected.branch || "main"
      else {
        cfg.mainBranch = detected.branch ?? "main"
        branchNote = detected.branch ? " (guessed — check it)" : ""
      }
    }
    // Thin route handlers are not unit-tested; their logic lives in packages/shared or RPCs.
    cfg.testIgnore = previous?.testIgnore ?? (cfg.kind === "monorepo" ? ["apps/*/server/api/"] : [])
    cfg.stack =
      SCAFFOLD_STACK[cfg.kind] ??
      given.stack ??
      (previous?.stack && previous.stack !== "other" ? previous.stack : undefined) ??
      (p && !previous ? await p.select("Stack conventions skill", QUESTIONS.stack, "none") : "none")
    const supabaseDb = usesSupabase(cfg, dir)
    const prevQa = previous?.qa
    const checklist =
      given.qaChecklist ?? (p ? await p.confirm("QA checklist generated from the living specs (work/qa/)?", prevQa?.checklist ?? true) : prevQa?.checklist ?? true)
    const testData =
      supabaseDb &&
      (given.testData ?? (p ? await p.confirm("Supabase test data scripts (seed / purge in supabase/test-data/)?", prevQa?.testData ?? true) : prevQa?.testData ?? true))
    cfg.qa = {
      checklist,
      testData,
      testPrefix: given.testPrefix ?? prevQa?.testPrefix ?? "TEST_",
      testDataDir: given.testDataDir ?? prevQa?.testDataDir ?? "supabase/test-data",
    }
    cfg.kitVersion = KIT_VERSION
    const offerMcp = cfg.kind === "monorepo" ? cfg.apps.includes("app") : cfg.kind === "existing"
    cfg.supabaseMcp = given.supabaseMcp ?? previous?.supabaseMcp
    if (!cfg.supabaseMcp && p && !previous && offerMcp) {
      const ref = (await p.text("Supabase project ref for a read-only MCP server (Enter to skip)", "")) ?? ""
      if (ref && !SUPABASE_REF.test(ref)) throw new Error("Supabase project ref: the 20-character id in the dashboard URL")
      cfg.supabaseMcp = ref || undefined
    }

    console.log(`\nPlan for ${dir}`)
    console.log(
      `  ${scaffold ? (cfg.kind === "site" ? "scaffold content site" : `scaffold monorepo: ${cfg.apps.join(", ")}`) : cfg.kind === "blank" ? "agent layer only (blank project)" : "agent layer only"}${STACK_SKILLS[cfg.stack] ? ` + ${STACK_SKILLS[cfg.stack]} skill` : ""}`,
    )
    console.log(`  profile: ${cfg.technicalLevel}, ${cfg.language}, ${cfg.methodology}, commits ${cfg.commitConvention}, git ${cfg.gitFlow} (main branch: ${cfg.mainBranch}${branchNote})`)
    console.log(`  qa: checklist ${cfg.qa.checklist ? "on" : "off"}, test data ${cfg.qa.testData ? `on (${cfg.qa.testDataDir}, prefix ${cfg.qa.testPrefix})` : "off"}`)
    console.log(`  plugin: agent-kit@agent-kit from ${marketplaceSpec}\n`)
    if (p && !(await p.confirm("Write these files?"))) return 1

    const w = new Writer(dir)
    const vars = { __NAME__: cfg.name, __LANG__: cfg.language, __MAIN__: cfg.mainBranch }
    if (scaffold && cfg.kind === "site") {
      w.copyTree(join(TEMPLATES, "site"), "", { vars })
      if (cfg.language === "es") for (const [rel, text] of Object.entries(SITE_ES)) w.write(rel, text(cfg.name))
    }
    if (scaffold) w.copyTree(join(TEMPLATES, "ci"), "", { vars })
    if (scaffold && cfg.kind === "monorepo") {
      const ui = cfg.apps.includes("web") || cfg.apps.includes("app")
      w.copyTree(join(TEMPLATES, "monorepo"), "", {
        vars,
        skip: (rel) =>
          QUESTIONS.apps.some((a) => rel === `apps/${a.value}` && !cfg.apps.includes(a.value)) ||
          (rel === "packages/ui" && !ui) ||
          (rel === "supabase" && !cfg.apps.includes("app")),
      })
      w.write("package.json", `${JSON.stringify(rootPackage(cfg), null, 2)}\n`, { overwrite: false })
      w.write("README.md", `# ${cfg.name}\n\nSee AGENTS.md for structure and commands.\n`, { overwrite: false })
    }
    w.copyTree(join(TEMPLATES, "base"), "", {
      vars,
      skip: (rel) => rel === "AGENTS.md",
    })
    // Kit-owned map of work/: refreshed so upgrades describe the current layout.
    w.write("work/README.md", readFileSync(join(TEMPLATES, "base", "work", "README.md"), "utf8"))
    // QA: the checklist folder (generated files are written after agent-kit.json) and the
    // test-data skeleton — never overwritten: the fixtures are the project's own.
    if (cfg.qa.checklist) {
      w.write("work/qa/README.md", readFileSync(join(TEMPLATES, "qa", "work-qa", "README.md"), "utf8"))
      w.write("work/qa/runs/.gitkeep", "", { overwrite: false })
    }
    if (cfg.qa.testData)
      w.copyTree(join(TEMPLATES, "qa", "supabase-test-data"), cfg.qa.testDataDir, {
        vars: { ...vars, __PREFIX__: cfg.qa.testPrefix, __DIR__: cfg.qa.testDataDir },
      })
    for (const scope of PROJECT_SCOPES) w.write(`.knowledge/${scope}/.gitkeep`, "", { overwrite: false })

    // The stack's conventions skill, managed by the kit: refreshed on every init/upgrade.
    const stackSkill = STACK_SKILLS[cfg.stack]
    if (stackSkill) w.copyTree(join(TEMPLATES, "skills", stackSkill), `.claude/skills/${stackSkill}`, { overwrite: true })

    // A blank project gets a minimal package.json so tests and commit checks have a home.
    if (cfg.kind === "blank" && !existsSync(join(dir, "package.json")))
      w.write("package.json", `${JSON.stringify({ name: cfg.name, version: "0.0.0", private: true, type: "module", scripts: { test: "node --test" } }, null, 2)}\n`)

    // Fields init doesn't ask about (testCommand, contextBudget, …) are the project's: keep them.
    const kept = Object.fromEntries(Object.entries(previous ?? {}).filter(([k]) => !(k in cfg)))
    w.write(PROJECT_FILE, `${JSON.stringify({ ...cfg, ...kept }, null, 2)}\n`)
    if (cfg.qa.checklist) for (const f of syncQa(dir).written) w.log.push(`qa      ${f}`)

    const agentsPath = join(dir, "AGENTS.md")
    const block = agentsBlock(cfg)
    if (existsSync(agentsPath)) w.write("AGENTS.md", upsertBlock(readFileSync(agentsPath, "utf8"), block))
    else
      w.write(
        "AGENTS.md",
        readFileSync(join(TEMPLATES, "base", "AGENTS.md"), "utf8")
          .replaceAll("__NAME__", cfg.name)
          .replace("__STACK__\n", stackSection(cfg))
          .replace("__BLOCK__", block),
      )

    const claudePath = join(dir, "CLAUDE.md")
    if (!existsSync(claudePath)) w.write("CLAUDE.md", "@AGENTS.md\n")
    else if (!readFileSync(claudePath, "utf8").includes("@AGENTS.md"))
      w.write("CLAUDE.md", `${readFileSync(claudePath, "utf8").replace(/\s*$/, "")}\n\n@AGENTS.md\n`)

    let installNote = ""
    if (cfg.commitConvention === "conventional") {
      const pkgPath = join(dir, "package.json")
      if (existsSync(pkgPath)) {
        w.write("package.json", `${JSON.stringify(withCommitTooling(JSON.parse(readFileSync(pkgPath, "utf8"))), null, 2)}\n`)
        w.write("commitlint.config.mjs", COMMITLINT_CONFIG, { overwrite: false })
        w.write(".husky/commit-msg", COMMIT_MSG_HOOK, { overwrite: false })
        installNote = "npm install activates the commitlint hook (husky). "
      } else
        w.log.push("note    no package.json: commitlint not installed — agents still get the built-in message check")
    }

    if (cfg.supabaseMcp) {
      const mcpPath = join(dir, ".mcp.json")
      const mcp = existsSync(mcpPath) ? JSON.parse(readFileSync(mcpPath, "utf8")) : {}
      w.write(".mcp.json", `${JSON.stringify(withSupabaseMcp(mcp, cfg.supabaseMcp), null, 2)}\n`)
    }

    const settings = mergeSettings(currentSettings, cfg.gitFlow, marketplaceSource(marketplaceSpec))
    w.write(".claude/settings.json", `${JSON.stringify(settings, null, 2)}\n`)

    const gitignorePath = join(dir, ".gitignore")
    const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : ""
    const missing = [".knowledge/local/", `${STATE_DIR}/`].filter((l) => !gitignore.split("\n").includes(l))
    if (missing.length)
      w.write(".gitignore", `${gitignore.replace(/\s*$/, "")}${gitignore ? "\n" : ""}${missing.join("\n")}\n`)

    process.env.CLAUDE_PROJECT_DIR = dir
    for (const f of writeIndexes({ project: true, global: false })) w.log.push(`index   ${relative(dir, f)}`)
    w.log.push(`index   ${relative(dir, writeScriptsIndex(dir))}`)

    console.log(w.log.map((l) => `  ${l}`).join("\n"))
    if (w.backedUp) console.log(`  (${w.backedUp} changed file(s) backed up in ${relative(dir, w.backupDir)}/)`)
    const cd = relative(process.cwd(), dir)
    console.log(`
Next:
  ${cd ? `cd ${cd} && ` : ""}${scaffold || installNote ? "npm install && " : ""}claude${installNote ? `\n  (${installNote.trim()})` : ""}
  Claude Code offers to install the agent-kit plugin (trust the folder, accept).
  If not: /plugin marketplace add ${marketplaceSpec.replace(/^github:/, "")}
          /plugin install agent-kit@agent-kit
  Check: npx @razcue/agent-kit doctor
  Docs: ${CHANNELS.docs} · for agents (MCP): ${CHANNELS.mcp}${cfg.supabaseMcp ? "\n  Supabase MCP (read-only): approve it when claude asks, then sign in via /mcp." : ""}`)
    return 0
  } finally {
    p?.close()
  }
}
