import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import { HELP } from "../cli/lib/help.mjs"

const cli = (...args) => spawnSync("node", [new URL("../cli/index.mjs", import.meta.url).pathname, ...args], { encoding: "utf8" })

// ZOMBIES: Zero, Interface, Exceptions apply.
test("cli: no command or --help prints the help and exits 0", () => {
  for (const args of [[], ["--help"], ["help"]]) {
    const r = cli(...args)
    assert.equal(r.status, 0, args.join(" "))
    assert.equal(r.stdout.trim(), HELP.trim())
  }
})

test("cli: an unknown command prints the help and exits 2", () => {
  const r = cli("nope")
  assert.equal(r.status, 2)
  assert.match(r.stdout, /agent-kit init \[dir\]/)
})

test("cli: --version prints the package version", () => {
  const { version } = JSON.parse(spawnSync("cat", [new URL("../package.json", import.meta.url).pathname], { encoding: "utf8" }).stdout)
  assert.equal(cli("--version").stdout.trim(), version)
})
