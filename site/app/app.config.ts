export default defineAppConfig({
  header: {
    title: "agent-kit",
  },
  github: {
    url: "https://github.com/razcue/agent-kit",
    branch: "master",
    rootDir: "site",
  },
  // Colours come from app/app.css (the palette of https://razcue.github.io); slate neutrals match its text.
  ui: {
    colors: {
      primary: "sky",
      neutral: "slate",
    },
  },
})
