#!/usr/bin/env node
// PostToolUse(Write) hook: when the agent writes a script somewhere it will be
// lost (outside the project, at the project root, or in a tmp folder), remind it
// of the `scripts` skill so the script is found and reused next time.
import { readFileSync } from "node:fs"
import { dirname, relative, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { STATE_DIR, findProjectDir, globalLibrary, hookLog } from "./config.mjs"
import { SCRIPT_EXT } from "./scripts.mjs"

/** Why `file` is a stray script, or null. Pure, for tests. */
export function strayReason(file, project, libraryDir) {
  if (!SCRIPT_EXT.test(file) || /\.(test|spec)\.\w+$/.test(file) || /\.config\.\w+$/.test(file)) return null
  if (libraryDir && file.startsWith(libraryDir + sep)) return null
  const rel = relative(project, file)
  if (rel.startsWith("..")) return "outside the project"
  if (rel.startsWith(`scripts${sep}`) || rel.startsWith(`${STATE_DIR}${sep}scratch${sep}`)) return null
  if (dirname(rel) === ".") return "at the project root"
  if (rel.split(sep).some((p) => /^(tmp|temp|scratch|playground)$/i.test(p))) return "in a temporary folder"
  return null
}

function main() {
  let input = {}
  try {
    input = JSON.parse(readFileSync(0, "utf8"))
  } catch {
    return
  }
  const file = input.tool_input?.file_path
  const project = findProjectDir(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd())
  hookLog("PostToolUse:Write", `${file} project=${project}`)
  if (!file || !project) return
  const reason = strayReason(file, project, globalLibrary()?.dir)
  if (!reason) return
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[agent-kit] You wrote a script ${reason} (${file}); it won't be found again. Follow the \`scripts\` skill: search first (\`scripts.mjs find\`), keep throwaway scripts in ${STATE_DIR}/scratch/ with an @summary line, kept ones in scripts/<area>/ with @summary/@usage and a test.`,
      },
    }),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main()
