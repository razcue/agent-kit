<script setup lang="ts">
const route = useRoute()
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection("pages").path(route.path).first(),
)
if (!page.value) throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true })
useSeoMeta({ title: page.value.title, description: page.value.description })
</script>

<template>
  <main class="prose mx-auto max-w-3xl px-4 py-10">
    <ContentRenderer v-if="page" :value="page" />
  </main>
</template>
