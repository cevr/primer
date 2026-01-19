# oxlint

High-performance ESLint-compatible linter. 50-100x faster than ESLint.

## Quick Start

```bash
# Install
bun add -D oxlint
# or: npm add -D oxlint / pnpm add -D oxlint / yarn add -D oxlint

# Add scripts
# package.json: "lint": "oxlint", "lint:fix": "oxlint --fix"

# Initialize config
oxlint --init
```

## Basic Usage

```bash
oxlint                    # Lint current directory
oxlint src/               # Lint specific directory
oxlint --fix              # Auto-fix safe issues
oxlint --fix-suggestions  # Include fixable suggestions
oxlint --fix-dangerously  # Apply all fixes (may change behavior)
```

## Configuration

Config file: `.oxlintrc.json` (or `.jsonc` for comments)

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "react", "import"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "error"
  },
  "rules": {
    "no-console": "error",
    "curly": ["error", "multi-line"]
  },
  "ignorePatterns": ["**/fixtures/**", "**/generated/**"]
}
```

## Plugins

Built-in plugins (enable via config or CLI):

| Plugin     | CLI Flag              | Description         |
| ---------- | --------------------- | ------------------- |
| typescript | (default on)          | TypeScript rules    |
| unicorn    | (default on)          | Best practices      |
| oxc        | (default on)          | Oxc-specific rules  |
| react      | `--react-plugin`      | React rules         |
| import     | `--import-plugin`     | ESM import checking |
| jsdoc      | `--jsdoc-plugin`      | JSDoc validation    |
| jest       | `--jest-plugin`       | Jest test rules     |
| vitest     | `--vitest-plugin`     | Vitest rules        |
| jsx-a11y   | `--jsx-a11y-plugin`   | Accessibility rules |
| nextjs     | `--nextjs-plugin`     | Next.js rules       |
| react-perf | `--react-perf-plugin` | React performance   |
| promise    | `--promise-plugin`    | Promise patterns    |
| node       | `--node-plugin`       | Node.js patterns    |
| vue        | `--vue-plugin`        | Vue.js rules        |

## Rule Filtering

CLI flags (accumulate left-to-right):

```bash
oxlint -D correctness     # Deny (error) for category
oxlint -W suspicious      # Warn for category
oxlint -A pedantic        # Allow (disable) category
oxlint -D no-console      # Deny specific rule
```

Categories: `correctness`, `suspicious`, `pedantic`, `perf`, `style`, `restriction`, `nursery`, `all`

## Output Formats

```bash
oxlint -f json            # JSON output
oxlint -f github          # GitHub Actions annotations
oxlint -f gitlab          # GitLab CI format
oxlint -f unix            # Unix format
oxlint -f checkstyle      # Checkstyle XML
```

## CI Integration

```bash
oxlint --quiet            # Errors only (suppress warnings)
oxlint --deny-warnings    # Exit non-zero on warnings
oxlint --max-warnings 0   # Exit error if warnings exceed threshold
```

## Inspection

```bash
oxlint --rules                      # List all registered rules
oxlint --print-config src/file.ts   # Show effective config for file
```

## File Overrides

```json
{
  "overrides": [
    {
      "files": ["*.test.ts", "*.spec.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

## Pre-commit

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,mjs,cjs}": "oxlint"
  }
}
```

Run `primer oxlint setup` for framework-specific configuration guide.
