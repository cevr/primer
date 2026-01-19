# Primer

CLI that renders curated markdown instructions for AI agents.

## Installation

```bash
# Install globally
bun add -g @cvr/primer

# Or run directly
bunx @cvr/primer
```

## Usage

```bash
# List available primers
primer

# Render a primer (auto-fetches if not cached)
primer effect              # Effect TypeScript guide
primer effect services     # Services & Layers deep dive
primer oxlint              # oxlint quick start
primer oxlint setup        # Setup oxlint for your project
```

Primers are fetched on-demand from GitHub and cached locally in `~/.primer/`.

## What is a Primer?

A primer is a curated markdown file containing instructions for AI agents. Unlike templates that generate boilerplate, primers tell the agent _what to do_ - they provide context, patterns, and step-by-step guidance.

Example primer content:

```markdown
# Setup oxlint

## Instructions for Agent

1. Read the project's package.json to identify:
   - Package manager (bun.lock, pnpm-lock.yaml, etc.)
   - Frameworks: React, Next.js, Vue, etc.
   - Testing: Vitest, Jest, Playwright

2. Install oxlint:
   <package-manager> add -D oxlint

3. Create .oxlintrc.json with plugins based on detected frameworks...
```

## Available Primers

| Primer   | Description                                    |
| -------- | ---------------------------------------------- |
| `effect` | Effect TypeScript patterns and best practices  |
| `oxlint` | High-performance ESLint-compatible linter      |
| `oxfmt`  | High-performance Prettier-compatible formatter |

Run `primer` to see all available primers.

## Content Storage

Primers are stored in `~/.primer/`:

```
~/.primer/
├── effect/
│   ├── index.md
│   ├── basics.md
│   ├── services.md
│   └── ...
├── oxlint/
│   ├── index.md
│   └── setup.md
└── oxfmt/
    ├── index.md
    └── setup.md
```

## Development

```bash
# Clone and install
git clone https://github.com/cevr/primer.git
cd primer
bun install

# Run locally
bun run dev effect

# Run tests
bun run test

# Build
bun run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new primers.

## License

MIT
