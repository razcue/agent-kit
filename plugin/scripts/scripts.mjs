#!/usr/bin/env node
// Script registry: find, run, test, scaffold and document the scripts agents and
// users write, so they are reused instead of rebuilt. A script is documented by
// `@key: value` lines in its first 40 lines (any comment style):
//   @name @summary @usage (required: summary, usage) · @tags [a, b] · @test file
//
//   node scripts.mjs find <words...>          scripts (project, scratch, library) + skills
//   node scripts.mjs list
//   node scripts.mjs run <name|path> [--lines N] [-- args...]
//   node scripts.mjs test [name]
//   node scripts.mjs new <area>/<name>.<ext> --summary "…" [--usage "…"] [--scratch|--library]
//   node scripts.mjs index                    regenerate scripts/README.md
//   node scripts.mjs check                    undocumented, duplicate, missing tests
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, extname, join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { PLUGIN_ROOT, STATE_DIR, findProjectDir, globalLibrary, readJson } from "./config.mjs"
import { parseFrontmatter } from "./knowledge.mjs"
import { runCompact } from "./run.mjs"

export const SCRIPT_EXT = /\.(mjs|js|cjs|ts|sh|bash|py|sql)$/
const TEST_FILE = /\.(test|spec)\.\w+$/
const SKIP_DIRS = new Set(["node_modules", ".git", ".nuxt", ".output", "dist", "runs"])
const RUNNERS = {
  ".mjs": ["node"],
  ".js": ["node"],
  ".cjs": ["node"],
  ".sh": ["bash"],
  ".bash": ["bash"],
  ".py": ["python3", "-I"],
}
// TypeScript and vitest: the project's own binaries first, else an exactly pinned npx (never a floating version).
export const TSX = "tsx@4.23.15"
export const VITEST = "vitest@5.0.3"
const localBin = (project, name) => {
  const bin = join(project, "node_modules", ".bin", name)
  return existsSync(bin) ? bin : null
}
/** Command prefix that runs a script with this extension. */
export function runnerFor(ext, project) {
  if (ext === ".ts") {
    const bin = localBin(project, "tsx")
    return bin ? [bin] : ["npx", "--yes", TSX]
  }
  return RUNNERS[ext] ?? ["node"]
}
export function vitestCommand(project) {
  const bin = localBin(project, "vitest")
  return bin ? [bin] : ["npx", "--yes", VITEST]
}

const COMMENT = { ".sh": "#", ".bash": "#", ".py": "#", ".sql": "--" }
const INDEX_START = "<!-- scripts:start -->"
const INDEX_END = "<!-- scripts:end -->"

export function parseHeader(text) {
  const data = {}
  for (const line of text.split("\n").slice(0, 40)) {
    const m = line.match(/^\s*(?:\/\/|#|--|\/?\*+)?\s*@(name|summary|usage|tags|test)\s*:\s*(.*?)\s*(?:\*\/)?\s*$/)
    if (!m || m[1] in data) continue
    data[m[1]] =
      m[1] === "tags"
        ? m[2].replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean)
        : m[2]
  }
  return data
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out)
    } else out.push(join(dir, entry.name))
  }
  return out
}

function siblingTest(path) {
  const ext = extname(path)
  const stem = path.slice(0, -ext.length)
  return [".test.mjs", ".test.ts", ".test.js"].map((t) => stem + t).find((t) => existsSync(t)) ?? null
}

export function projectRoot() {
  return findProjectDir() ?? process.cwd()
}

export function scriptRoots(project = projectRoot()) {
  const roots = [
    { origin: "project", dir: join(project, "scripts") },
    { origin: "scratch", dir: join(project, STATE_DIR, "scratch") },
  ]
  const lib = globalLibrary()
  if (lib) roots.push({ origin: "library", dir: lib.dir, writable: lib.writable })
  return roots
}

export function collectScripts(project = projectRoot()) {
  const scripts = []
  for (const root of scriptRoots(project)) {
    if (!existsSync(root.dir)) continue
    for (const path of walk(root.dir)) {
      if (!SCRIPT_EXT.test(path) || TEST_FILE.test(path)) continue
      const h = parseHeader(readFileSync(path, "utf8"))
      const declared = h.test ? resolve(dirname(path), h.test) : null
      const test = declared ?? siblingTest(path)
      scripts.push({
        name: h.name || basename(path, extname(path)),
        summary: h.summary ?? "",
        usage: h.usage ?? "",
        tags: h.tags ?? [],
        origin: root.origin,
        path,
        rel: relative(project, path),
        area: relative(root.dir, dirname(path)) || "(root)",
        test: test && existsSync(test) ? test : null,
        declaredTest: declared,
        documented: Boolean(h.summary && h.usage),
      })
    }
  }
  return scripts
}

export function collectSkills(project = projectRoot()) {
  const sources = [
    ["agent-kit", join(PLUGIN_ROOT, "skills")],
    ["project", join(project, ".claude", "skills")],
    ["user", join(homedir(), ".claude", "skills")],
  ]
  const skills = []
  for (const [origin, dir] of sources) {
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name, "SKILL.md")
      if (!existsSync(file)) continue
      const { data } = parseFrontmatter(readFileSync(file, "utf8"))
      skills.push({ name: data.name || entry.name, description: data.description ?? "", origin, path: file })
    }
  }
  return skills
}

function score(words, fields) {
  let total = 0
  for (const w of words) for (const [text, weight] of fields) if (text.toLowerCase().includes(w)) total += weight
  return total
}

export function find(words, project = projectRoot()) {
  const w = words.map((x) => x.toLowerCase())
  const scripts = collectScripts(project)
    .map((s) => ({ s, n: score(w, [[`${s.name} ${s.tags.join(" ")}`, 3], [s.summary, 2], [s.usage, 1]]) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 15)
  const skills = collectSkills(project)
    .map((s) => ({ s, n: score(w, [[s.name, 3], [s.description, 1]]) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
  return { scripts: scripts.map((x) => x.s), skills: skills.map((x) => x.s) }
}

function resolveTarget(target, project) {
  const asPath = resolve(project, target)
  if (existsSync(asPath)) return { path: asPath, name: basename(asPath, extname(asPath)) }
  const order = { project: 0, library: 1, scratch: 2 }
  const hits = collectScripts(project)
    .filter((s) => s.name === target)
    .sort((a, b) => order[a.origin] - order[b.origin])
  if (!hits.length) throw new Error(`no script named "${target}" — try: scripts.mjs find <words>`)
  return hits[0]
}

export function renderIndex(scripts) {
  const own = scripts.filter((s) => s.origin === "project")
  const rows = [INDEX_START, "<!-- generated by `scripts.mjs index` — edit the script headers, not this table -->", ""]
  if (!own.length) rows.push("_No scripts yet._")
  else {
    rows.push("| Script | What it does | Usage | Test |", "|---|---|---|---|")
    for (const s of own.sort((a, b) => a.rel.localeCompare(b.rel)))
      rows.push(
        `| [\`${s.name}\`](${relative("scripts", s.rel)}) | ${s.summary || "⚠️ undocumented"} | \`${s.usage || "?"}\` | ${s.test ? "✅" : "—"} |`,
      )
  }
  rows.push(INDEX_END)
  return rows.join("\n")
}

export function check(project = projectRoot()) {
  const errors = []
  const warnings = []
  const own = collectScripts(project).filter((s) => s.origin === "project")
  const seen = new Map()
  for (const s of own) {
    if (!s.documented) errors.push(`${s.rel}: missing @summary and/or @usage header`)
    if (s.declaredTest && !existsSync(s.declaredTest)) errors.push(`${s.rel}: @test file not found (${relative(project, s.declaredTest)})`)
    if (!s.test && s.path.match(/\.(mjs|js|cjs|ts|sh|bash)$/)) warnings.push(`${s.rel}: no test (ZOMBIES)`)
    if (seen.has(s.name)) errors.push(`${s.rel}: name "${s.name}" also used by ${seen.get(s.name)}`)
    seen.set(s.name, s.rel)
  }
  const readme = join(project, "scripts", "README.md")
  if (own.length && (!existsSync(readme) || !readFileSync(readme, "utf8").includes(renderIndex(own))))
    warnings.push("scripts/README.md is out of date — run: scripts.mjs index")
  return { errors, warnings, count: own.length }
}

export function writeIndex(project) {
  const path = join(project, "scripts", "README.md")
  const index = renderIndex(collectScripts(project))
  const current = existsSync(path)
    ? readFileSync(path, "utf8")
    : "# Scripts\n\nReusable project scripts. Each one documents itself in its header; this table is generated.\nThrowaway scripts go in `.agent-kit/scratch/` (gitignored).\n"
  const start = current.indexOf(INDEX_START)
  const end = current.indexOf(INDEX_END)
  const next =
    start !== -1 && end > start
      ? current.slice(0, start) + index + current.slice(end + INDEX_END.length)
      : `${current.replace(/\s*$/, "")}\n\n${index}\n`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
  return path
}

function skeleton(ext, { name, summary, usage, tags, testFile }) {
  const c = COMMENT[ext] ?? "//"
  const header = [
    `${c} @name: ${name}`,
    `${c} @summary: ${summary}`,
    `${c} @usage: ${usage}`,
    `${c} @tags: [${tags.join(", ")}]`,
    ...(testFile ? [`${c} @test: ${testFile}`] : []),
  ].join("\n")
  if (ext === ".mjs" || ext === ".js" || ext === ".ts")
    return `${ext === ".ts" ? "" : "#!/usr/bin/env node\n"}${header}
import { pathToFileURL } from "node:url"

/** The logic, kept pure and exported so the test can cover it. */
export function run(args${ext === ".ts" ? ": string[]" : ""}) {
  // TODO
  return args
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(run(process.argv.slice(2)))
}
`
  if (ext === ".sh" || ext === ".bash") return `#!/usr/bin/env bash\n${header}\nset -euo pipefail\n\n# TODO\n`
  if (ext === ".py")
    return `#!/usr/bin/env python3\n${header}\nimport sys\n\n\ndef run(args):\n    # TODO\n    return args\n\n\nif __name__ == "__main__":\n    print(run(sys.argv[1:]))\n`
  return `${header}\n\n-- TODO (idempotent: see [[idempotent-migrations]])\n`
}

const ZOMBIES = ["Zero", "One", "Many", "Boundaries", "Interface", "Exceptions"]

/** True when the project runs its tests with Vitest (then script tests do too). */
export function usesVitest(project) {
  const pkg = readJson(join(project, "package.json"))
  return Boolean(pkg?.devDependencies?.vitest || pkg?.dependencies?.vitest)
}

function testSkeleton(ext, name, vitest) {
  const api = vitest || ext === ".ts" ? "vitest" : "node:test"
  const shell = ext === ".sh" || ext === ".bash"
  const subject = shell
    ? `import { spawnSync } from "node:child_process"\n\nconst sh = (...args) =>\n  spawnSync("bash", [new URL("./${name}${ext}", import.meta.url).pathname, ...args], { encoding: "utf8" })`
    : `import { run } from "./${name}${ext === ".ts" ? "" : ext}"`
  const todos = ZOMBIES.map((z) => `  it.todo("${z}: …")`).join("\n")
  return `import { describe, it } from "${api}"\n${subject}\n\n// ZOMBIES: keep the categories that apply, delete the rest; Simple scenarios first.\ndescribe("${name}", () => {\n${todos}\n})\n\nvoid ${shell ? "sh" : "run"}\n`
}

function create(spec, flags, project) {
  if (!spec || !SCRIPT_EXT.test(spec)) throw new Error("usage: new <area>/<name>.<mjs|ts|sh|py|sql> --summary \"…\"")
  if (!flags.summary) throw new Error("--summary is required: one line on what the script does")
  let base = join(project, "scripts")
  if (flags.scratch) base = join(project, STATE_DIR, "scratch")
  if (flags.library) {
    const lib = globalLibrary()
    if (!lib?.writable) throw new Error("global library is not writable — run `agent-kit setup` in your agent-kit clone")
    base = lib.dir
  }
  const path = join(base, spec)
  if (existsSync(path)) throw new Error(`${relative(project, path)} already exists`)
  const ext = extname(path)
  const name = basename(path, ext)
  const testable = [".mjs", ".js", ".ts", ".sh", ".bash"].includes(ext)
  const testFile = testable ? `${name}.test.${ext === ".ts" ? "ts" : "mjs"}` : null
  const runner = ext === ".ts" ? `npx ${TSX}` : RUNNERS[ext]?.join(" ")
  const usage = flags.usage ?? (runner ? `${runner} ${relative(project, path)} <args>` : `apply ${relative(project, path)} in the SQL editor`)
  const tags = [dirname(spec) === "." ? "misc" : dirname(spec).split("/")[0]]
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, skeleton(ext, { name, summary: flags.summary, usage, tags, testFile }), { mode: 0o755 })
  const created = [path]
  if (testFile) {
    writeFileSync(join(dirname(path), testFile), testSkeleton(ext, name, usesVitest(project)))
    created.push(join(dirname(path), testFile))
  }
  if (!flags.scratch && !flags.library) created.push(writeIndex(project))
  return created
}

function testScripts(name, project, maxLines) {
  const targets = collectScripts(project).filter((s) => (name ? s.name === name : s.test) && s.origin !== "scratch")
  if (name && !targets.length) throw new Error(`no script named "${name}"`)
  let code = 0
  for (const s of targets) {
    if (!s.test) {
      console.log(`✗ ${s.name}: no test — write ${s.name}.test.mjs (ZOMBIES), then re-run`)
      code = 1
      continue
    }
    const [cmd, ...args] =
      s.test.endsWith(".ts") || usesVitest(project)
        ? [...vitestCommand(project), "run", relative(project, s.test)]
        : ["node", "--test", relative(project, s.test)]
    const r = runCompact({ cmd, args, cwd: project, label: `test-${s.name}`, logDir: join(project, STATE_DIR, "runs"), maxLines })
    console.log(r.text, "\n")
    if (r.code) code = r.code
  }
  if (!targets.length) console.log("No tested scripts yet.")
  return code
}

export function main(argv) {
  const dash = argv.indexOf("--")
  const passthrough = dash === -1 ? [] : argv.slice(dash + 1)
  const own = dash === -1 ? argv : argv.slice(0, dash)
  const [cmd, ...rest] = own
  const flags = {}
  const args = []
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) args.push(rest[i])
    else if (rest[i + 1] && !rest[i + 1].startsWith("--")) flags[rest[i].slice(2)] = rest[++i]
    else flags[rest[i].slice(2)] = true
  }
  const project = projectRoot()
  const maxLines = Number(flags.lines) || 60

  if (cmd === "find") {
    if (!args.length) return usage()
    const { scripts, skills } = find(args, project)
    if (!scripts.length && !skills.length) console.log("Nothing found. Check necessity, then build: scripts.mjs new …")
    for (const s of scripts) console.log(`script ${s.origin}/${s.name} — ${s.summary || "(undocumented)"}\n  ${s.usage || s.rel}`)
    for (const s of skills) console.log(`skill  ${s.origin}/${s.name} — ${s.description.slice(0, 160)}`)
    return 0
  }
  if (cmd === "list") {
    for (const s of collectScripts(project))
      console.log(`${s.origin}/${s.name}${s.documented ? "" : " ⚠️"}${s.test ? " ✅" : ""} — ${s.summary || s.rel}`)
    return 0
  }
  if (cmd === "run") {
    if (!args[0]) return usage()
    const target = resolveTarget(args[0], project)
    const ext = extname(target.path)
    if (ext === ".sql") {
      console.log(`${relative(project, target.path)} is SQL: apply it in the Supabase SQL Editor (or psql); agent-kit doesn't run it.`)
      return 2
    }
    const [cmdName, ...pre] = runnerFor(ext, project)
    const r = runCompact({
      cmd: cmdName,
      args: [...pre, relative(project, target.path), ...passthrough, ...args.slice(1)],
      cwd: project,
      label: target.name,
      logDir: join(project, STATE_DIR, "runs"),
      maxLines,
    })
    console.log(r.text)
    return r.code
  }
  if (cmd === "test") return testScripts(args[0], project, maxLines)
  if (cmd === "new") {
    for (const f of create(args[0], flags, project)) console.log(`wrote ${relative(project, f)}`)
    return 0
  }
  if (cmd === "index") {
    console.log(`wrote ${relative(project, writeIndex(project))}`)
    return 0
  }
  if (cmd === "check") {
    const { errors, warnings, count } = check(project)
    for (const w of warnings) console.log(`warn  ${w}`)
    for (const e of errors) console.log(`error ${e}`)
    console.log(`${count} project script(s), ${errors.length} error(s), ${warnings.length} warning(s)`)
    return errors.length ? 1 : 0
  }
  return usage()
}

function usage() {
  console.log("usage: scripts.mjs find <words> | list | run <name|path> [-- args] | test [name] | new <area>/<name>.<ext> --summary … | index | check")
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (e) {
    console.error(`scripts: ${e.message}`)
    process.exit(1)
  }
}
