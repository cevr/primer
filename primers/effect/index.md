# Effect TypeScript

Field manual for Effect. Patterns and best practices for writing idiomatic Effect code.

## Getting Started

1. Install Effect and language service
2. Configure TypeScript for Effect
3. Learn the basics

## Quick Setup

```bash
# Install core dependencies
bun add effect @effect/schema

# Install language service
bun add -D @effect/language-service

# Optional: platform-specific packages
bun add @effect/platform @effect/platform-bun  # or @effect/platform-node
```

## TypeScript Configuration

Add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

Recommended `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "@effect/language-service" }]
  }
}
```

## Core Concepts

| Topic           | Description                             |
| --------------- | --------------------------------------- |
| `basics`        | Effect.fn, Effect.gen, pipe patterns    |
| `services`      | Context.Tag, Layer dependency injection |
| `data-modeling` | Schema.Class, branded types, variants   |
| `errors`        | Schema.TaggedError, catchTag, defects   |
| `config`        | Config module, providers, Schema.Config |
| `testing`       | @effect/vitest, test layers, TestClock  |
| `cli`           | @effect/cli for command-line interfaces |

Run `primer effect <topic>` for detailed guides.
