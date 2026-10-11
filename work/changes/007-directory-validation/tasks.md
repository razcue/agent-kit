# Tasks — Clear the directory validator's warnings

- [x] T1 (plugin.R1, plugin.R4) test: icon, privacy URL and page, README disclosure, guard source
  - evidence: red first — 5 failing
- [x] T2 implement: `git-rules.mjs`, icon, Privacy pages, `privacyPolicyUrl`, README
  - evidence: 20 / 20; `claude plugin validate --strict ./plugin` ✔
- [x] T3 paired test files (`git-guard.test.mjs`, `git-rules.test.mjs`), release 0.14.2
  - evidence: the Spanish Scripts page was stamped before its new `git-rules` section was translated — caught, translated, re-stamped; `docs.mjs check` ✓

## Verification
| Scenario | Evidence (test or check) | Result |
|----------|--------------------------|--------|
