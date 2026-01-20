# Primer CLI Skill

CLI that renders curated markdown instructions for AI agents.

## Quick Reference

```bash
# List available primers (shows top-level only)
primer

# Render a primer (auto-fetches if not cached)
primer effect                  # Main Effect guide
primer effect services         # Sub-primer: Services & Layers
primer oxlint                  # Main oxlint guide
primer oxlint setup            # Sub-primer: setup instructions
```

## Available Primers

Run `primer` to see current list. Sub-primers accessed via `primer <name> <sub>`.

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
