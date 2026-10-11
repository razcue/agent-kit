// `agent-kit upgrade`: asks only the questions this project hasn't answered yet,
// re-applies the agent layer with the saved answers, and shows what changed in
// the kit since the project's kitVersion.
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROJECT_FILE, findProjectDir, readJson } from "../../plugin/scripts/config.mjs"
import { KIT_VERSION, QUESTIONS, init, usesSupabase } from "./init.mjs"
import { changesSince } from "./lifecycle.mjs"
import { migrateWorkLayout } from "../../plugin/scripts/work.mjs"
import { createPrompter } from "./prompt.mjs"

const ANSWERS = { technicalLevel: "level", language: "lang", methodology: "method", commitConvention: "commits", gitFlow: "git", stack: "stack" }
const TITLES = {
  technicalLevel: "Technical level of the person working with the agent",
  language: "Agent reply language",
  methodology: "Development method",
  commitConvention: "Commit messages",
  gitFlow: "Git flow for the agent",
  stack: "Stack conventions skill",
}

export async function upgrade(target, flags) {
  const dir = findProjectDir(resolve(target ?? "."))
  if (!dir) throw new Error(`no ${PROJECT_FILE} here — run init first`)
  const cfg = readJson(join(dir, PROJECT_FILE))
  const from = cfg.kitVersion ?? "0.0.0"
  const missing = Object.keys(ANSWERS).filter((k) => cfg[k] === undefined && flags[ANSWERS[k]] === undefined)
  const answers = {}
  // 0.13: QA checklist + Supabase test data (booleans, default on).
  const askQa = cfg.qa === undefined && flags["qa-checklist"] === undefined && flags["test-data"] === undefined
  const supabaseDb = usesSupabase(cfg, dir)
  if (missing.length || askQa) {
    const titles = [...missing.map((k) => TITLES[k]), ...(askQa ? ["QA checklist", ...(supabaseDb ? ["Supabase test data"] : [])] : [])]
    console.log(`New setup question(s) since ${from}: ${titles.join(", ")}\n`)
    const p = flags.yes ? null : createPrompter()
    try {
      for (const k of missing) answers[ANSWERS[k]] = p ? await p.select(TITLES[k], QUESTIONS[k], QUESTIONS[k][0].value) : QUESTIONS[k][0].value
      if (askQa) {
        answers["qa-checklist"] = p ? await p.confirm("QA checklist generated from the living specs (work/qa/)?", true) : true
        if (supabaseDb) answers["test-data"] = p ? await p.confirm("Supabase test data scripts (seed / purge in supabase/test-data/)?", true) : true
      }
    } finally {
      p?.close()
    }
  }
  // 0.13: changes moved from work/specs/NNN-slug/ to work/changes/; work/specs/ now holds living specs.
  for (const line of migrateWorkLayout(dir)) console.log(`  move    ${line}`)
  const code = await init(dir, { ...flags, ...answers, yes: true })
  const changelog = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url))
  if (code === 0 && existsSync(changelog)) {
    const sections = changesSince(readFileSync(changelog, "utf8"), from, KIT_VERSION)
    console.log(sections.length ? `\nWhat's new since ${from}:\n\n${sections.join("\n\n")}` : `\nAlready on ${KIT_VERSION}.`)
  }
  return code
}
