<script setup lang="ts">
import { loginSchema } from "@__NAME__/shared/schemas/auth"
import { getErrorMessage } from "@__NAME__/shared/utils/error"
import { safeRedirect } from "@__NAME__/shared/utils/auth"

definePageMeta({ public: true })

const auth = useAuthStore()
const route = useRoute()
const form = reactive({ email: "", password: "" })
const error = ref("")

async function submit() {
  error.value = ""
  const parsed = loginSchema.safeParse(form)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Check the form"
    return
  }
  try {
    await auth.login(parsed.data)
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value = getErrorMessage(e, "Could not sign in")
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-6">
    <form class="flex w-full max-w-sm flex-col gap-4" @submit.prevent="submit">
      <h1 class="text-2xl font-semibold">Sign in</h1>
      <div class="flex flex-col gap-2">
        <Label for="email">Email or login</Label>
        <Input id="email" v-model="form.email" autocomplete="username" autofocus />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="password">Password</Label>
        <Input id="password" v-model="form.password" type="password" autocomplete="current-password" />
      </div>
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <Button type="submit" :disabled="auth.loading">{{ auth.loading ? "Signing in…" : "Sign in" }}</Button>
    </form>
  </main>
</template>
