// `agent-kit upgrade`: asks only the questions this project hasn't answered yet,
// re-applies the agent layer with the saved answers, and shows what changed in
// the kit since the project's kitVersion.
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROJECT_FILE, findProjectDir, readJson } from "../../plugin/scripts/config.mjs"
import { KIT_VERSION, QUESTIONS, init } from "./init.mjs"
import { changesSince } from "./lifecycle.mjs"
import { createPrompter } from "./prompt.mjs"

const ANSWERS = { technicalLevel: "level", language: "lang", methodology: "method", commitConvention: "commits", gitFlow: "git" }
const TITLES = {
  technicalLevel: "Technical level of the person working with the agent",
  language: "Agent reply language",
  methodology: "Development method",
  commitConvention: "Commit messages",
  gitFlow: "Git flow for the agent",
}

export async function upgrade(target, flags) {
  const dir = findProjectDir(resolve(target ?? "."))
  if (!dir) throw new Error(`no ${PROJECT_FILE} here — run init first`)
  const cfg = readJson(join(dir, PROJECT_FILE))
  const from = cfg.kitVersion ?? "0.0.0"
  const missing = Object.keys(ANSWERS).filter((k) => cfg[k] === undefined && flags[ANSWERS[k]] === undefined)
  const answers = {}
  if (missing.length) {
    console.log(`New setup question(s) since ${from}: ${missing.map((k) => TITLES[k]).join(", ")}\n`)
    const p = flags.yes ? null : createPrompter()
    try {
      for (const k of missing) answers[ANSWERS[k]] = p ? await p.select(TITLES[k], QUESTIONS[k], QUESTIONS[k][0].value) : QUESTIONS[k][0].value
    } finally {
      p?.close()
    }
  }
  const code = await init(dir, { ...flags, ...answers, yes: true })
  const changelog = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url))
  if (code === 0 && existsSync(changelog)) {
    const sections = changesSince(readFileSync(changelog, "utf8"), from, KIT_VERSION)
    console.log(sections.length ? `\nWhat's new since ${from}:\n\n${sections.join("\n\n")}` : `\nAlready on ${KIT_VERSION}.`)
  }
  return code
}
