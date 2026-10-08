// Nuxt layer shared by apps/web and apps/app: shadcn-vue components, Tailwind
// theme and cn(). Paths are absolute because a layer's relative paths would
// resolve against the extending app.
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url)).replace(/\/$/, "")

export default defineNuxtConfig({
  alias: { "@ui": here("./") },
  css: [here("./assets/css/tailwind.css")],
  modules: ["shadcn-nuxt"],
  shadcn: {
    prefix: "",
    componentDir: here("./components/ui"),
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
