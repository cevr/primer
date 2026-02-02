---
"@cvr/primer": minor
---

feat: compressed index output for non-TTY (agent) consumers

- `primer <name>` in non-TTY outputs a compact index with subtopic table and file paths instead of full content
- `primer <name> <sub>` in non-TTY outputs just the resolved file path
- Compact indexes are generated at fetch time (ensure/refresh), not via build step
- TTY behavior unchanged
