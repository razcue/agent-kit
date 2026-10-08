// Conventional Commits: type(scope): subject — checked on every commit by .husky/commit-msg.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
  },
}
