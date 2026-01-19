# Contributing to Primer

Thank you for contributing to Primer! This document explains how to add new primers and contribute to the project.

## Adding a New Primer

### 1. Create the Directory Structure

Create a new directory in `primers/` with your primer name:

```
primers/
└── your-primer/
    ├── index.md        # Main content (required)
    ├── setup.md        # Setup guide (optional)
    └── advanced.md     # Advanced topics (optional)
```

### 2. Write Agent-Oriented Content

Primers are instructions for AI agents, not documentation for humans. Write with these principles:

**Do:**

- Give specific, actionable instructions
- Include decision trees ("if X detected, do Y")
- Provide concrete code examples
- Explain the "why" behind choices
- Use imperative language ("Create", "Install", "Configure")

**Don't:**

- Write marketing copy or feature lists
- Use vague language ("consider", "might want to")
- Include interactive elements or links to external tools
- Assume the agent has context about the project

### 3. Structure Your Content

```markdown
# Topic Name

Brief overview of what this primer covers.

## Quick Start

Minimal steps to get started.

## Instructions for Agent

Detailed, step-by-step instructions.

## Configuration

Example configurations with explanations.

## Examples

Concrete examples for common scenarios.
```

### 4. Test Your Primer

```bash
# Test that your primer resolves correctly
bun run dev your-primer
bun run dev your-primer setup

# Run the test suite
bun run test
```

### 5. Submit a Pull Request

1. Fork the repository
2. Create a branch: `git checkout -b add-your-primer`
3. Add your primer files
4. Run tests: `bun run test`
5. Commit: `git commit -m "feat: add your-primer"`
6. Push and create a PR

## Code Contributions

### Development Setup

```bash
git clone https://github.com/cevr/primer.git
cd primer
bun install
```

### Running Tests

```bash
bun run test          # Run all tests
bun run test:watch    # Watch mode
bun run typecheck     # Type check
```

### Project Structure

```
primer/
├── src/
│   ├── main.ts           # Entry point
│   ├── cli.ts            # CLI definition
│   ├── commands/
│   │   └── init.ts       # Init command
│   ├── services/
│   │   ├── ContentStore.ts    # Content resolution
│   │   └── GitHubFetcher.ts   # GitHub fetching
│   └── lib/
│       └── errors.ts     # Error types
├── primers/              # Bundled primers
├── tests/
│   ├── services/         # Unit tests
│   └── integration/      # Workflow tests
└── package.json
```

### Code Style

- Use Effect TypeScript patterns
- Services should have test layers
- Write workflow tests for commands
- Follow existing patterns in the codebase

## Release Process

Releases are automated via changesets:

1. Create a changeset: `bun changeset`
2. Commit the changeset file
3. Push to main
4. The release PR will be created automatically
5. Merge the release PR to publish

## Questions?

Open an issue on GitHub if you have questions about contributing.
