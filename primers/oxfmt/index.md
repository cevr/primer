# oxfmt

High-performance code formatter. Prettier-compatible, no config required.

## Quick Start

```bash
# Install
bun add -D oxfmt
# or: npm add -D oxfmt / pnpm add -D oxfmt / yarn add -D oxfmt

# Add scripts
# package.json: "fmt": "oxfmt", "fmt:check": "oxfmt --check"

# Format project
oxfmt .
```

## Basic Usage

```bash
oxfmt .                   # Format all files (writes in place)
oxfmt --check             # Check if formatted, show stats
oxfmt --list-different    # List files that would change
oxfmt src/                # Format specific directory
```

## Configuration

Config file: `.oxfmtrc.json` (or `.jsonc` for comments)

No config needed - oxfmt works out of the box with sensible defaults.

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 100,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true
}
```

## Prettier Compatibility

oxfmt supports Prettier options:

| Option            | Default  | Description                       |
| ----------------- | -------- | --------------------------------- |
| `useTabs`         | false    | Use tabs instead of spaces        |
| `tabWidth`        | 2        | Spaces per indentation level      |
| `printWidth`      | 100      | Line wrapping width               |
| `semi`            | true     | Add semicolons                    |
| `singleQuote`     | false    | Use single quotes                 |
| `jsxSingleQuote`  | false    | Use single quotes in JSX          |
| `trailingComma`   | "all"    | Trailing commas                   |
| `bracketSpacing`  | true     | Spaces in object literals         |
| `bracketSameLine` | false    | Put > on same line in JSX         |
| `arrowParens`     | "always" | Parens around single arrow params |
| `endOfLine`       | "lf"     | Line ending style                 |

## Experimental Features

### Import Sorting

```json
{
  "experimentalSortImports": {
    "type": "natural",
    "groups": [["builtin"], ["external"], ["internal"], ["parent", "sibling", "index"]]
  }
}
```

### package.json Sorting

```json
{
  "experimentalSortPackageJson": true
}
```

### Tailwind CSS Class Sorting

```json
{
  "experimentalTailwindcss": {}
}
```

## File Overrides

```json
{
  "overrides": [
    {
      "files": ["*.md"],
      "options": {
        "proseWrap": "always"
      }
    }
  ]
}
```

## Ignore Patterns

```json
{
  "ignorePatterns": ["**/node_modules/**", "dist/**", "build/**"]
}
```

## Migration from Prettier

```bash
# Generate config from existing Prettier config
oxfmt --migrate prettier

# Initialize new config
oxfmt --init
```

## CI Integration

```bash
# Check formatting (exits 1 if changes needed)
oxfmt --check

# Use in GitHub Actions
oxfmt --check || (echo "Run 'oxfmt .' to format" && exit 1)
```

## Pre-commit

```json
{
  "lint-staged": {
    "*": "oxfmt --no-error-on-unmatched-pattern"
  }
}
```

## stdin Formatting

```bash
echo 'const   x   =   1' | oxfmt --stdin-filepath test.ts
```

## Node.js API

```typescript
import { format, type FormatOptions } from "oxfmt"

const input = `let a=42;`
const options: FormatOptions = { semi: false }
const { code } = await format("a.js", input, options)
```

Run `primer oxfmt setup` for project-specific configuration guide.
