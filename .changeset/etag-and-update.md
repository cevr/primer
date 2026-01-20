---
"@cvr/primer": minor
---

feat: add `primer update` command and ETag support

- Add `primer update` command to refresh all cached primers
- Only refreshes primers already installed (checks meta.json)
- Add ETag support for conditional fetching (If-None-Match)
- Only reports primers that actually changed
- Add manifest auto-generation script (`bun run generate:manifest`)
- Pre-commit hook regenerates manifest when primers change
- Add `--fetch/-f` flag to force sync fetch in non-TTY environments
- Auto-fetch missing nested files when accessing sub-primers
- Add "Did you mean?" suggestions for typos using Levenshtein distance
- Parallelize file fetches (concurrency: 20) for faster downloads
