// Numbered-choice prompts on plain readline: works in any terminal and with piped
// input (lines are queued, so answers piped ahead of their question aren't lost;
// end of input answers every remaining question with its default).
import { createInterface } from "node:readline"
import { stdin, stdout } from "node:process"

export function createPrompter() {
  const rl = createInterface({ input: stdin, terminal: false })
  const queued = []
  const waiting = []
  let closed = false
  rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : queued.push(line)))
  rl.on("close", () => {
    closed = true
    while (waiting.length) waiting.shift()("")
  })
  rl.question = (prompt) => {
    stdout.write(prompt)
    if (queued.length) return Promise.resolve(queued.shift())
    if (closed) return Promise.resolve("")
    return new Promise((resolve) => waiting.push(resolve))
  }
  const list = (options, isDefault) =>
    options.forEach((o, i) =>
      stdout.write(`  ${i + 1}) ${o.label}${isDefault(o.value) ? " (default)" : ""}${o.hint ? ` — ${o.hint}` : ""}\n`),
    )

  return {
    async text(question, def) {
      const answer = (await rl.question(`? ${question}${def ? ` (${def})` : ""}: `)).trim()
      return answer || def
    },

    async select(question, options, def) {
      stdout.write(`? ${question}\n`)
      list(options, (v) => v === def)
      for (;;) {
        const answer = (await rl.question("  > ")).trim()
        if (!answer) return def
        const n = Number(answer)
        if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].value
        stdout.write("  Enter a number from the list.\n")
      }
    },

    async multi(question, options, defs) {
      stdout.write(`? ${question} (comma-separated numbers)\n`)
      list(options, (v) => defs.includes(v))
      for (;;) {
        const answer = (await rl.question("  > ")).trim()
        if (!answer) return defs
        const picks = answer.split(/[\s,]+/).map(Number)
        if (picks.every((n) => Number.isInteger(n) && n >= 1 && n <= options.length))
          return [...new Set(picks)].sort().map((n) => options[n - 1].value)
        stdout.write("  Enter numbers from the list, e.g. 1,2.\n")
      }
    },

    async confirm(question, def = true) {
      const answer = (await rl.question(`? ${question} ${def ? "[Y/n]" : "[y/N]"} `)).trim().toLowerCase()
      return answer ? answer.startsWith("y") : def
    },

    close() {
      rl.close()
    },
  }
}
