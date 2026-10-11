<script setup lang="ts">
// GitHub stars and forks (live, public API), and clones from the last 14 days when the build
// wrote them to /stats.json (scripts/release/repo-stats.mjs; clones need a token with push access).
const props = withDefaults(defineProps<{ repo?: string }>(), { repo: "razcue/agent-kit" })
const { app } = useRuntimeConfig()
const { locale } = useI18n()

interface Stats { stars?: number, forks?: number, clones?: number }
const stats = ref<Stats>({})

onMounted(async () => {
  try {
    stats.value = { ...(await $fetch<Stats>(`${app.baseURL}stats.json`)) }
  }
  catch { /* no build-time stats: live numbers only */ }
  try {
    const repo = await $fetch<{ stargazers_count: number, forks_count: number }>(`https://api.github.com/repos/${props.repo}`)
    stats.value = { ...stats.value, stars: repo.stargazers_count, forks: repo.forks_count }
  }
  catch { /* rate-limited or offline: keep the build-time numbers */ }
})

const es = computed(() => locale.value === "es")
const fmt = (n: number) => new Intl.NumberFormat(locale.value, { notation: "compact" }).format(n)
const items = computed(() => [
  stats.value.stars !== undefined && { icon: "i-lucide-star", label: `${fmt(stats.value.stars)} ${es.value ? "estrellas" : "stars"}`, to: `https://github.com/${props.repo}/stargazers` },
  stats.value.forks !== undefined && { icon: "i-lucide-git-fork", label: `${fmt(stats.value.forks)} forks`, to: `https://github.com/${props.repo}/forks` },
  stats.value.clones !== undefined && { icon: "i-lucide-download", label: `${fmt(stats.value.clones)} ${es.value ? "clones (14 días)" : "clones (14 days)"}` },
].filter(Boolean) as { icon: string, label: string, to?: string }[])
</script>

<template>
  <div class="flex min-h-7 flex-wrap items-center justify-start gap-2">
    <UBadge
      v-for="item in items"
      :key="item.icon"
      :as="item.to ? 'a' : 'span'"
      :href="item.to"
      :target="item.to ? '_blank' : undefined"
      :icon="item.icon"
      :label="item.label"
      color="neutral"
      variant="outline"
      size="lg"
      class="tabular-nums"
    />
  </div>
</template>
