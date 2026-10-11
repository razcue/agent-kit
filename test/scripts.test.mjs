import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { runnerFor, vitestCommand } from "../plugin/scripts/scripts.mjs"

test("plugin.R2.S2 the project's own tsx / vitest first, else an exactly pinned npx", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-bin-"))
  assert.deepEqual(runnerFor(".ts", dir), ["npx", "--yes", "tsx@4.23.15"])
  assert.deepEqual(vitestCommand(dir), ["npx", "--yes", "vitest@5.0.3"])
  mkdirSync(join(dir, "node_modules", ".bin"), { recursive: true })
  for (const b of ["tsx", "vitest"]) writeFileSync(join(dir, "node_modules", ".bin", b), "")
  assert.deepEqual(runnerFor(".ts", dir), [join(dir, "node_modules", ".bin", "tsx")])
  assert.deepEqual(vitestCommand(dir), [join(dir, "node_modules", ".bin", "vitest")])
  assert.deepEqual(runnerFor(".mjs", dir), ["node"])
})
