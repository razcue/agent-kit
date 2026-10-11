<script setup lang="ts">
const { locale } = useI18n()
</script>

<template>
  <p class="text-sm text-muted">
    © {{ new Date().getFullYear() }} agent-kit · MIT ·
    {{ locale === 'es' ? 'Hecho por' : 'Made by' }}
    <ULink to="https://razcue.github.io/" target="_blank" class="text-muted hover:text-highlighted underline-offset-4 hover:underline">
      Rayko Azcue
    </ULink>
  </p>
</template>
