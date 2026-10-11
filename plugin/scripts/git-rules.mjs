// Which git commands never change a repository: data for the git guard (git-guard.mjs).
// Subcommands that never change the repo, whatever their arguments.
export const READ_ONLY = new Set([
  "status", "diff", "log", "show", "grep", "blame", "shortlog", "describe", "rev-parse",
  "rev-list", "ls-files", "ls-tree", "ls-remote", "cat-file", "for-each-ref", "show-ref",
  "merge-base", "name-rev", "check-ignore", "help", "version", "fetch", "whatchanged",
])

// Read-only only with these first arguments (or none).
export const READ_ONLY_FORMS = {
  branch: (a) =>
    a.some((x) => /^(-l|--list|--contains|--no-contains|--merged|--no-merged|--points-at)$/.test(x)) ||
    a.every((x) => /^(-a|-r|-v|-vv|--all|--remotes|--show-current|--no-color|--format=.*|--sort=.*)$/.test(x)),
  tag: (a) => a.length === 0 || ["-l", "--list", "-n"].includes(a[0]),
  stash: (a) => ["list", "show"].includes(a[0]),
  remote: (a) => a.length === 0 || ["-v", "show", "get-url"].includes(a[0]),
  worktree: (a) => a[0] === "list",
  config: (a) => a.some((x) => ["--get", "--get-all", "--list", "-l", "--get-regexp"].includes(x)),
  reflog: (a) => !["expire", "delete"].includes(a[0]),
  notes: (a) => a.length === 0 || ["list", "show"].includes(a[0]),
}
