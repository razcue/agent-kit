// Main application: SPA + BFF. Data only through server/api (service role);
// the browser uses Supabase for auth only.
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  extends: ["@__NAME__/ui"],
  ssr: false,
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  app: {
    head: {
      title: "__NAME__",
      meta: [{ name: "robots", content: "noindex, nofollow" }],
    },
  },
  runtimeConfig: {
    supabase: {
      serviceRoleKey: "",
    },
    public: {
      supabaseUrl: "",
      supabaseAnonKey: "",
      // Optional: lets users sign in with "ana" instead of "ana@example.com".
      authEmailDomain: "",
    },
  },
})
