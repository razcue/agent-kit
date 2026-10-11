import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { evaluate } from "./spec-flow.mjs"

const put = (dir, rel, text) => {
  mkdirSync(join(dir, rel, ".."), { recursive: true })
  writeFileSync(join(dir, rel), text)
}
const DELTA = "# Delta — invoices\n\n## ADDED Requirements\n\n### invoices.R1 — Totals\nThe BFF shall round invoice totals to 3 decimals.\n\n#### invoices.R1.S1 — Rounding @boundary\n- Given a line of 0.0005\n- When the invoice is totalled\n- Then the total is 0.001\n"

// ZOMBIES: Zero, One, Exceptions apply.
describe("spec-flow evaluate", () => {
  it("Zero: no change folder", () => assert.deepEqual(evaluate(mkdtempSync(join(tmpdir(), "sf-"))), ["no change folder in work/changes/"]))
  it("One: a proposal with a lint-clean delta passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-"))
    put(dir, "work/changes/001-invoices/proposal.md", "---\nstatus: draft\n---\n# Invoices\n")
    put(dir, "work/changes/001-invoices/specs/invoices.md", DELTA)
    assert.deepEqual(evaluate(dir), [])
  })
  it("Exceptions: no deltas, or a requirement that is not EARS", () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-"))
    put(dir, "work/changes/001-invoices/proposal.md", "---\nstatus: draft\n---\n# Invoices\n")
    assert.match(evaluate(dir).join("\n"), /no delta specs/)
    put(dir, "work/changes/001-invoices/specs/invoices.md", DELTA.replace("The BFF shall round invoice totals to 3 decimals.", "Totals are rounded."))
    assert.match(evaluate(dir).join("\n"), /invoices\.R1: requirement is not EARS/)
  })
})

describe("spec-flow evaluateFeature", async () => {
  const { evaluateFeature, HOME_SPEC } = await import("./spec-flow.mjs")
  it("One: the renamed button in the living spec passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-"))
    put(dir, "work/specs/home/spec.md", HOME_SPEC.replaceAll('"Sign out"', '"Log out"'))
    assert.deepEqual(evaluateFeature(dir), [])
  })
  it("Exceptions: the untouched living spec fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-"))
    put(dir, "work/specs/home/spec.md", HOME_SPEC)
    assert.match(evaluateFeature(dir).join("\n"), /old button/)
  })
})
