import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { HELP } from "../cli/lib/help.mjs"
import { parseHelp } from "../scripts/release/docs.mjs"

test("help: lists exactly the commands the CLI dispatches (the website's CLI reference is built from it)", () => {
  const index = readFileSync(new URL("../cli/index.mjs", import.meta.url), "utf8")
  const dispatched = [...index.matchAll(/cmd === "([a-z]+)"/g)].map((m) => m[1]).filter((c) => c !== "help")
  assert.deepEqual(parseHelp(HELP).map((c) => c.cmd).sort(), [...new Set(dispatched)].sort())
})

test("help: every init flag the CLI parses is documented", () => {
  const init = readFileSync(new URL("../cli/lib/init.mjs", import.meta.url), "utf8")
  const parsed = [...init.matchAll(/flags\["([a-z-]+)"\]/g)].map((m) => m[1])
  for (const flag of new Set(parsed)) assert.match(HELP, new RegExp(`--${flag}\\b`), `--${flag} missing from the help`)
})
