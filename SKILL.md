# Primer CLI Skill

CLI that renders curated markdown instructions for AI agents.

## Quick Reference

```bash
# List available primers (auto-fetches manifest if needed)
primer

# Render a primer (auto-fetches if not cached)
primer effect                  # Effect TypeScript guide
primer effect services         # Services & Layers guide
primer oxlint                  # oxlint quick start
primer oxlint setup            # oxlint setup instructions
primer oxfmt                   # oxfmt quick start
```

## Available Primers

| Primer                 | Description                           |
| ---------------------- | ------------------------------------- |
| `effect`               | Effect TypeScript patterns            |
| `effect basics`        | Effect.fn, Effect.gen, pipe           |
| `effect services`      | Context.Tag, Layer, DI patterns       |
| `effect data-modeling` | Schema.Class, branded types, variants |
| `effect errors`        | Schema.TaggedError, catchTag, defects |
| `effect testing`       | @effect/vitest, test layers           |
| `effect cli`           | @effect/cli commands, args, options   |
| `oxlint`               | High-performance linter               |
| `oxlint setup`         | Framework-specific oxlint config      |
| `oxfmt`                | High-performance formatter            |
| `oxfmt setup`          | oxfmt configuration guide             |

## How It Works

1. Run `primer` or `primer <name>` - content fetches lazily on first use
2. Cached locally in `~/.primer/`
3. Background refresh keeps content fresh
4. No explicit init required

## Content Structure

```
~/.primer/
├── _manifest.json           # Cached manifest
├── _meta.json               # Cache metadata (timestamps)
├── effect/
│   ├── index.md             # primer effect
│   ├── basics.md            # primer effect basics
│   ├── services.md          # primer effect services
│   └── ...
├── oxlint/
│   ├── index.md             # primer oxlint
│   └── setup.md             # primer oxlint setup
└── oxfmt/
    ├── index.md             # primer oxfmt
    └── setup.md             # primer oxfmt setup
```

## Adding New Primers

1. Create a directory in `primers/` with your primer name
2. Add `index.md` for the main content
3. Add additional `.md` files for sub-topics
4. **Update `primers/_manifest.json`** with the new primer entry:
   ```json
   {
     "version": 1,
     "primers": {
       "your-primer": {
         "description": "Short description",
         "files": ["index.md", "other.md"]
       }
     }
   }
   ```
5. Write instructions for AI agents (not templates)

See CONTRIBUTING.md for detailed guidelines.

## Development

```bash
# Run CLI in dev mode
bun run dev <command>

# Run tests
bun run test

# Type check
bun run typecheck

# Build binary
bun run build
```

## Architecture

Built with Effect TypeScript:

- `src/main.ts` - Entry point and layer composition
- `src/cli.ts` - CLI command definitions
- `src/services/ManifestService.ts` - Manifest fetch/cache
- `src/services/PrimerCache.ts` - Lazy primer fetch/cache
- `primers/` - Bundled primer content
- `primers/_manifest.json` - Primer metadata
