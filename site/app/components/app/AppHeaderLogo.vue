<script setup lang="ts">
// The razcue.github.io terminal icon next to the title (replaces Docus's text-only logo).
const appConfig = useAppConfig()
const { app } = useRuntimeConfig()
</script>

<template>
  <span class="flex items-center gap-2">
    <img :src="`${app.baseURL}favicon.svg`" alt="" class="size-6 shrink-0" width="24" height="24">
    <span class="font-semibold">{{ appConfig.header?.title }}</span>
  </span>
</template>
