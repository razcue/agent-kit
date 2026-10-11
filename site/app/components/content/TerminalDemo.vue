<script setup lang="ts">
// A terminal session that types itself once when it scrolls into view (CSS animations, staggered).
// Without JS, or with prefers-reduced-motion, every line is simply shown.
interface Line {
  t: "cmd" | "q" | "ok" | "err" | "out" | "gap"
  text?: string
  a?: string
}
const props = withDefaults(defineProps<{ title?: string, lines: Line[], replay?: string }>(), { title: "~/project", replay: "Replay" })

const root = ref<HTMLElement>()
const armed = ref(false)
const playing = ref(false)
const run = ref(0)

// Delays: a command types at ~28 ms per character; other lines follow 0.28 s apart.
const timed = computed(() => {
  let t = 0.3
  return props.lines.map((line) => {
    const start = t
    const typing = line.t === "cmd" ? Math.max(0.4, (line.text?.length ?? 0) * 0.028) : 0
    t += line.t === "cmd" ? typing + 0.35 : line.t === "gap" ? 0.15 : 0.28
    return { ...line, start, typing, chars: (line.text?.length ?? 0) + 2 }
  })
})

function play() {
  playing.value = false
  run.value++
  requestAnimationFrame(() => requestAnimationFrame(() => (playing.value = true)))
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.value) return
  armed.value = true
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      play()
      io.disconnect()
    }
  }, { threshold: 0.35 })
  io.observe(root.value)
})
</script>

<template>
  <div ref="root" class="terminal not-prose w-full overflow-hidden rounded-xl border border-default bg-[#0a192f] text-left shadow-xl shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40" :class="{ armed, playing }">
    <div class="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
      <span class="size-3 rounded-full bg-[#ff5f57]" />
      <span class="size-3 rounded-full bg-[#febc2e]" />
      <span class="size-3 rounded-full bg-[#28c840]" />
      <span class="ml-2 truncate font-mono text-xs text-[#8892b0]">{{ title }}</span>
      <button v-if="armed" type="button" class="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-[#8892b0] hover:bg-white/5 hover:text-[#e6f1ff]" :aria-label="replay" @click="play">
        <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
        {{ replay }}
      </button>
    </div>
    <div :key="run" class="space-y-1 overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed sm:text-sm">
      <div
        v-for="(line, i) in timed"
        :key="i"
        class="line"
        :class="`l-${line.t}`"
        :style="{ '--d': `${line.start}s`, '--typing': `${line.typing}s`, '--chars': line.chars }"
      >
        <template v-if="line.t === 'cmd'">
          <span class="typed"><span class="text-[#64ffda]">$</span> <span class="text-[#e6f1ff]">{{ line.text }}</span></span>
        </template>
        <template v-else-if="line.t === 'q'">
          <span class="text-[#64ffda]">?</span> <span class="text-[#ccd6f6]">{{ line.text }}</span> <span class="text-[#7dd3fc]">{{ line.a }}</span>
        </template>
        <template v-else-if="line.t === 'ok'">
          <span class="text-[#28c840]">✓</span> <span class="text-[#a8b2d1]">{{ line.text }}</span>
        </template>
        <template v-else-if="line.t === 'err'">
          <span class="text-[#ff5f57]">✗</span> <span class="text-[#ffb4ab]">{{ line.text }}</span>
        </template>
        <template v-else-if="line.t === 'gap'">
          <span>&nbsp;</span>
        </template>
        <template v-else>
          <span class="text-[#8892b0]">{{ line.text }}</span>
        </template>
      </div>
      <div class="line l-cursor" :style="{ '--d': `${timed.length ? timed[timed.length - 1]!.start + 0.3 : 0}s` }">
        <span class="text-[#64ffda]">$</span> <span class="cursor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.line {
  white-space: pre;
}
.cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  vertical-align: text-bottom;
  background: #64ffda;
  animation: blink 1.1s steps(1) infinite;
}
/* Hidden until the session plays (only when JS armed it). */
.armed .line {
  opacity: 0;
}
.armed.playing .line {
  animation: reveal 0.25s ease-out var(--d) forwards;
}
.armed.playing .l-cmd .typed {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  width: 0;
  animation: type var(--typing) steps(var(--chars)) var(--d) forwards;
}
@keyframes reveal {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: none; }
}
@keyframes type {
  to { width: calc(var(--chars) * 1ch); }
}
@keyframes blink {
  50% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cursor { animation: none; }
}
</style>
