# @cvr/primer

## 0.2.0

### Minor Changes

- [`7d64720`](https://github.com/cevr/primer/commit/7d647204adfcfa15a3fe6db2d3bb5e577977e5ef) Thanks [@cevr](https://github.com/cevr)! - feat: add `primer update` command and ETag support
  - Add `primer update` command to refresh all cached primers
  - Only refreshes primers already installed (checks meta.json)
  - Add ETag support for conditional fetching (If-None-Match)
  - Only reports primers that actually changed
  - Add manifest auto-generation script (`bun run generate:manifest`)
  - Pre-commit hook regenerates manifest when primers change

## 0.1.2

### Patch Changes

- [`f992d5c`](https://github.com/cevr/primer/commit/f992d5ca7d16038d252eefa449a829655f39220c) Thanks [@cevr](https://github.com/cevr)! - fix(cli): address CLI audit issues
  - Exit codes: propagate failures instead of swallowing with catchAll
  - TTY detection: skip spinner when stdout is not a TTY
  - NO_COLOR support: respect NO_COLOR env var and TERM=dumb
  - Help subcommand: handle `primer help` instead of treating as primer name
  - Help text: add usage examples via HelpDoc
  - Non-TTY: skip background refresh, use cache only (safe for scripts/pipes)
  - Add --fetch/-f flag to force sync fetch in non-TTY
  - Build: disable dotenv and bunfig autoloading in compiled binary

## 0.1.1

### Patch Changes

- [`4d2f4e1`](https://github.com/cevr/primer/commit/4d2f4e1da7f552479d030e2295c33d3b5abb0fd7) Thanks [@cevr](https://github.com/cevr)! - Simplify `primer` output to show only top-level primers
