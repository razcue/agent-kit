<script setup lang="ts">
// Two bars that grow to their share and count up when visible: context loaded before the first
// question, without vs with agent-kit (both measured with `agent-kit context`).
const props = withDefaults(defineProps<{
  without: number
  with: number
  withoutLabel: string
  withLabel: string
  unit?: string
  savedLabel?: string
  source?: string
}>(), { unit: "tokens", savedLabel: "less context every session", source: "" })

const root = ref<HTMLElement>()
const progress = ref(1) // 1 = final state (SSR, no JS, reduced motion)
const { locale } = useI18n()
const fmt = (n: number) => new Intl.NumberFormat(locale.value).format(Math.round(n))
const saved = computed(() => Math.round((1 - props.with / props.without) * 100))
const ratio = computed(() => (props.without / props.with).toFixed(1))

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.value) return
  progress.value = 0
  const io = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return
    io.disconnect()
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      progress.value = 1 - (1 - t) ** 3 // ease-out
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, { threshold: 0.4 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="not-prose w-full rounded-xl border border-default bg-elevated p-5 text-left sm:p-6">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <p class="text-5xl font-bold tracking-tight text-primary tabular-nums sm:text-6xl">
        {{ Math.round(saved * progress) }}%
      </p>
      <p class="pb-2 text-sm text-muted">
        {{ savedLabel }} · <span class="font-semibold text-highlighted">{{ ratio }}×</span>
      </p>
    </div>
    <div class="mt-5 space-y-4">
      <div>
        <div class="mb-1.5 flex justify-between gap-4 text-sm">
          <span class="text-toned">{{ withoutLabel }}</span>
          <span class="shrink-0 whitespace-nowrap font-mono tabular-nums text-highlighted">{{ fmt(without * progress) }} {{ unit }}</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-accented">
          <div class="h-full rounded-full bg-[#ff5f57]/80" :style="{ width: `${100 * progress}%` }" />
        </div>
      </div>
      <div>
        <div class="mb-1.5 flex justify-between gap-4 text-sm">
          <span class="text-toned">{{ withLabel }}</span>
          <span class="shrink-0 whitespace-nowrap font-mono tabular-nums text-highlighted">{{ fmt(props.with * progress) }} {{ unit }}</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-accented">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${(100 * props.with / without) * progress}%` }" />
        </div>
      </div>
    </div>
    <p v-if="source" class="mt-4 text-xs text-dimmed">
      {{ source }}
    </p>
  </div>
</template>
