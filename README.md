# Primer

CLI that renders curated markdown instructions for AI agents.

## Installation

```bash
bun add -g @cvr/primer
```

## Usage

```bash
primer                     # List available primers
primer effect              # Render a primer
primer effect services     # Render a sub-primer
primer init                # Install skill file for AI tools
```

## What is a Primer?

A primer is curated markdown containing instructions for AI agents. Unlike templates that generate boilerplate, primers tell the agent _what to do_ — context, patterns, and step-by-step guidance.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      primer CLI                         │
├─────────────────────────────────────────────────────────┤
│  ManifestService          │  PrimerCache               │
│  - fetch _manifest.json   │  - local cache (~/.primer) │
│  - primer discovery       │  - background refresh      │
└───────────────────────────┴────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   GitHub (primers/)                     │
│  _manifest.json ─ primer registry with metadata        │
│  effect/        ─ index.md + sub-primers               │
│  oxlint/        ─ index.md + sub-primers               │
└─────────────────────────────────────────────────────────┘
```

**Flow:**

1. CLI fetches `_manifest.json` to discover available primers
2. Primer content fetched on-demand from GitHub raw URLs
3. Cached locally in `~/.primer/` with background refresh

**Primer structure:**

- Each primer is a directory with `index.md` (main) + optional sub-primers
- Sub-primers accessed via `primer <name> <sub>` (e.g., `primer effect services`)
- Manifest defines descriptions and sub-primer metadata

## Skill Integration

Run `primer init` to install a skill file that teaches AI tools how to use the CLI:

- `~/.claude/skills/primer.md` — Claude Code
- `~/.cursor/skills/primer.md` — Cursor
- `~/.config/opencode/skills/primer/SKILL.md` — OpenCode

## Development

```bash
git clone https://github.com/cevr/primer.git
cd primer && bun install
bun run dev effect         # Run locally
bun run check              # Typecheck + lint + format
bun run test               # Run tests
```

## License

MIT
