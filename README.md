# Primer

Curated markdown primers for AI agents.

## Installation

```bash
bun add -g @cvr/primer
primer init                # Install skill file for AI tools
```

## Usage

```bash
primer                     # List available primers
primer effect              # Render a primer
primer effect services     # Render a sub-primer
primer help                # Show help with examples
```

## What is a Primer?

A primer is curated markdown that teaches AI agents _how to do things well_. Unlike templates that generate boilerplate, primers provide context, patterns, and step-by-step guidance.

**Example use cases:**

- `primer effect` before writing Effect TypeScript code
- `primer cli` when building a command-line tool
- `primer oxlint` when setting up linting

## Architecture

```
primer CLI
    │
    ├─ ManifestService ──→ _manifest.json (primer registry)
    │
    └─ PrimerCache ──→ ~/.primer/ (local cache, background refresh)
                │
                └──→ GitHub raw (primers/)
```

**Primer structure:** Each primer is a directory with `index.md` (main) + optional sub-primers. Sub-primers accessed via `primer <name> <sub>`.

## AI Tool Integration

Run `primer init` to install skill files:

| Tool        | Location                                    |
| ----------- | ------------------------------------------- |
| Claude Code | `~/.claude/skills/primer.md`                |
| Cursor      | `~/.cursor/skills/primer.md`                |
| OpenCode    | `~/.config/opencode/skills/primer/SKILL.md` |

Use `primer init --local` for project-level installation.

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
