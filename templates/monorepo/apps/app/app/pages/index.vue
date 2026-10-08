<script setup lang="ts">
const auth = useAuthStore()

async function logout() {
  await auth.logout()
  await navigateTo("/login")
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 p-6">
    <h1 class="text-2xl font-semibold">__NAME__</h1>
    <p class="text-muted-foreground">Signed in as {{ auth.user?.name ?? auth.user?.email }}.</p>
    <Button variant="outline" @click="logout">Sign out</Button>
  </main>
</template>
