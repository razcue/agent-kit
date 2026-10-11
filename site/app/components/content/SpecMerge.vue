<script setup lang="ts">
// A change's delta merging into the living spec: the ADDED requirement lands, the REMOVED one is
// retired (its id never reused), and the scenario is proven by a test and listed for QA.
// Plays once when visible; static without JS or with prefers-reduced-motion.
const props = withDefaults(defineProps<{
  deltaLabel?: string
  specLabel?: string
  retiredLabel?: string
  testLabel?: string
  qaLabel?: string
}>(), {
  deltaLabel: "Change 004 — delta spec",
  specLabel: "Living spec",
  retiredLabel: "retired",
  testLabel: "Test",
  qaLabel: "QA checklist",
})

const root = ref<HTMLElement>()
const armed = ref(false)
const playing = ref(false)

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.value) return
  armed.value = true
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      playing.value = true
      io.disconnect()
    }
  }, { threshold: 0.35 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="spec-merge not-prose grid items-stretch gap-4 text-left lg:grid-cols-[1fr_auto_1fr]" :class="{ armed, playing }">
    <!-- Delta -->
    <div class="pane overflow-hidden rounded-xl border border-default bg-elevated">
      <div class="flex items-center gap-2 border-b border-default px-4 py-2.5 text-xs text-muted">
        <UIcon name="i-lucide-git-pull-request" class="size-4 text-primary" />
        <span class="font-medium text-highlighted">{{ props.deltaLabel }}</span>
        <span class="ml-auto truncate font-mono">changes/004-invoices/specs/invoices.md</span>
      </div>
      <div class="space-y-1 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <div class="text-muted">## ADDED Requirements</div>
        <div class="add"><span class="mark">+</span><span class="font-semibold text-highlighted">### invoices.R3</span> — Rounded totals</div>
        <div class="add"><span class="mark">+</span>When an invoice is saved, the BFF shall round its total to 3 decimals.</div>
        <div class="add"><span class="mark">+</span><span class="text-highlighted">#### invoices.R3.S1</span> — Rounding edge <span class="chip">@boundary</span></div>
        <div class="add"><span class="mark">+</span>- Given a line of 0.0005</div>
        <div class="add"><span class="mark">+</span>- When the invoice is saved</div>
        <div class="add"><span class="mark">+</span>- Then the total is 0.001</div>
        <div class="pt-2 text-muted">## REMOVED Requirements</div>
        <div class="del"><span class="mark">−</span><span class="font-semibold">### invoices.R1</span> — Manual totals</div>
      </div>
    </div>

    <!-- Merge -->
    <div class="flex items-center justify-center lg:flex-col">
      <div class="merge-pill flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-highlighted">
        <UIcon name="i-lucide-git-merge" class="size-4 text-primary" />
        specs.mjs merge 004
      </div>
      <UIcon name="i-lucide-arrow-right" class="arrow mx-2 hidden size-5 text-primary lg:mx-0 lg:my-2 lg:block lg:rotate-0" />
      <UIcon name="i-lucide-arrow-down" class="arrow mx-2 size-5 text-primary lg:hidden" />
    </div>

    <!-- Living spec -->
    <div class="pane overflow-hidden rounded-xl border border-default bg-elevated">
      <div class="flex items-center gap-2 border-b border-default px-4 py-2.5 text-xs text-muted">
        <UIcon name="i-lucide-book-open-check" class="size-4 text-primary" />
        <span class="font-medium text-highlighted">{{ props.specLabel }}</span>
        <span class="ml-auto truncate font-mono">specs/invoices/spec.md</span>
      </div>
      <div class="space-y-1 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <div class="text-muted">retired: [<span class="retire-id">invoices.R1</span>]</div>
        <div class="retired flex items-center gap-2"><span class="line-through decoration-2">### invoices.R1 — Manual totals</span><span class="chip chip-muted">{{ props.retiredLabel }}</span></div>
        <div class="text-muted">### invoices.R2 — Line amounts</div>
        <div class="landed"><span class="font-semibold text-highlighted">### invoices.R3</span> — Rounded totals</div>
        <div class="landed">When an invoice is saved, the BFF shall round its total to 3 decimals.</div>
        <div class="landed"><span class="text-highlighted">#### invoices.R3.S1</span> — Rounding edge <span class="chip">@boundary</span></div>
        <div class="proof mt-3 flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1">
          <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
          <span class="text-muted">{{ props.testLabel }}</span>
          <span class="truncate text-highlighted">it("invoices.R3.S1 rounds 0.0005 up")</span>
        </div>
        <div class="proof proof-2 flex items-center gap-2 rounded-md px-2 py-1">
          <UIcon name="i-lucide-clipboard-check" class="size-4 shrink-0 text-primary" />
          <span class="text-muted">{{ props.qaLabel }}</span>
          <span class="truncate text-highlighted">[ ] invoices.R3.S1</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mark {
  display: inline-block;
  width: 1.25em;
  font-weight: 700;
}
.add {
  color: var(--ui-text);
  background: color-mix(in oklab, var(--ui-primary) 9%, transparent);
  border-radius: 4px;
}
.add .mark {
  color: var(--ui-primary);
}
.del {
  color: var(--ui-text-muted);
  background: color-mix(in oklab, #ff5f57 10%, transparent);
  border-radius: 4px;
}
.del .mark {
  color: #ff5f57;
}
.chip {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 11px;
  color: var(--ui-primary);
  border: 1px solid color-mix(in oklab, var(--ui-primary) 45%, transparent);
}
.chip-muted {
  color: var(--ui-text-muted);
  border-color: var(--ui-border-accented);
}
.retired {
  color: var(--ui-text-dimmed);
}
.landed {
  border-left: 2px solid var(--ui-primary);
  padding-left: 0.5rem;
}

/* Timeline (only when armed by JS and in view) */
.armed .landed,
.armed .proof,
.armed .retired,
.armed .retire-id {
  opacity: 0;
}
.armed .merge-pill {
  opacity: 0.5;
}
.armed.playing .merge-pill {
  animation: pulse 0.9s ease-out 0.4s 2 both;
}
.armed.playing .arrow {
  animation: nudge 0.9s ease-in-out 0.4s 2;
}
.armed.playing .retired { animation: fadein 0.4s ease-out 1.3s forwards; }
.armed.playing .retire-id { animation: fadein 0.4s ease-out 1.5s forwards; }
.armed.playing .landed:nth-of-type(4) { animation: slidein 0.45s ease-out 1.8s forwards; }
.armed.playing .landed:nth-of-type(5) { animation: slidein 0.45s ease-out 2.0s forwards; }
.armed.playing .landed:nth-of-type(6) { animation: slidein 0.45s ease-out 2.2s forwards; }
.armed.playing .proof { animation: fadein 0.45s ease-out 2.8s forwards; }
.armed.playing .proof-2 { animation: fadein 0.45s ease-out 3.2s forwards; }

@keyframes fadein { to { opacity: 1; } }
@keyframes slidein {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: none; }
}
@keyframes pulse {
  0% { opacity: 0.5; box-shadow: 0 0 0 0 color-mix(in oklab, var(--ui-primary) 50%, transparent); }
  70% { opacity: 1; box-shadow: 0 0 0 10px transparent; }
  100% { opacity: 1; box-shadow: 0 0 0 0 transparent; }
}
@keyframes nudge {
  50% { transform: translateX(4px); }
}
</style>
