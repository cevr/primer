---
"@cvr/primer": patch
---

fix(cli): address 5 CLI audit issues

- Exit codes: propagate failures instead of swallowing with catchAll
- TTY detection: skip spinner when stdout is not a TTY
- NO_COLOR support: respect NO_COLOR env var and TERM=dumb
- Help subcommand: handle `primer help` instead of treating as primer name
- Help text: add usage examples via HelpDoc
