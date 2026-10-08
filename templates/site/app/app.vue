<script setup lang="ts">
const { data: pages } = await useAsyncData("nav", () =>
  queryCollection("pages").order("stem", "ASC").select("path", "title").all(),
)
// Home first, then the other pages by file name (prefix files with 1., 2. to reorder).
const nav = computed(() => [...(pages.value ?? [])].sort((a, b) => Number(b.path === "/") - Number(a.path === "/")))
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border">
      <nav class="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-4">
        <NuxtLink v-for="item in nav" :key="item.path" :to="item.path" class="hover:text-primary">
          {{ item.title }}
        </NuxtLink>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>
