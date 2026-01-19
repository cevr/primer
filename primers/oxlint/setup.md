# Setup oxlint

## Instructions for Agent

1. **Read the project's package.json** to identify:
   - Package manager (bun.lock, pnpm-lock.yaml, yarn.lock, or package-lock.json)
   - Frameworks: React, Next.js, Remix, Vue, etc.
   - Testing: Vitest, Jest, Playwright
   - Runtime: Node.js, Bun, Deno

2. **Install oxlint**:

   ```bash
   <package-manager> add -D oxlint
   ```

3. **Create .oxlintrc.json** with plugins based on detected frameworks:

   Base configuration:

   ```json
   {
     "$schema": "./node_modules/oxlint/configuration_schema.json",
     "plugins": ["typescript", "unicorn", "oxc"],
     "categories": {
       "correctness": "error",
       "suspicious": "warn"
     },
     "ignorePatterns": ["dist/**", "build/**", "node_modules/**"]
   }
   ```

4. **Add framework-specific plugins**:

   | Detection                              | Add to plugins                         |
   | -------------------------------------- | -------------------------------------- |
   | react in deps                          | `"react"`, `"react-hooks"`             |
   | react + eslint-plugin-jsx-a11y in deps | `"jsx-a11y"`                           |
   | next in deps                           | `"nextjs"`, `"react"`, `"react-hooks"` |
   | vue in deps                            | `"vue"`                                |
   | vitest in devDeps                      | `"vitest"`                             |
   | jest in devDeps                        | `"jest"`                               |
   | node/server project                    | `"node"`, `"promise"`                  |
   | @effect/\* in deps                     | `"promise"`                            |

5. **Add test file overrides** if testing framework detected:

   ```json
   {
     "overrides": [
       {
         "files": ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"],
         "rules": {
           "no-console": "off"
         }
       }
     ]
   }
   ```

6. **Add to package.json scripts**:

   ```json
   {
     "scripts": {
       "lint": "oxlint .",
       "lint:fix": "oxlint --fix ."
     }
   }
   ```

7. **Run lint** to verify setup:

   ```bash
   <package-manager> run lint
   ```

8. **If import resolution needed** (path aliases, etc.):
   ```json
   {
     "plugins": ["import"],
     "settings": {
       "import": {
         "tsconfig": "./tsconfig.json"
       }
     }
   }
   ```
   And add `--import-plugin --tsconfig tsconfig.json` to CLI or use config.

## Example Configurations

### React + Vitest Project

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react", "react-hooks", "jsx-a11y", "vitest"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn"
  },
  "overrides": [
    {
      "files": ["**/*.test.tsx", "**/*.spec.tsx"],
      "rules": {
        "react/jsx-no-constructed-context-values": "off"
      }
    }
  ]
}
```

### Next.js Project

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react", "react-hooks", "nextjs", "jsx-a11y"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "ignorePatterns": [".next/**", "out/**"]
}
```

### Node.js/Effect Project

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "node", "promise", "import"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "rules": {
    "no-console": "warn"
  }
}
```

### Monorepo

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "import"],
  "categories": {
    "correctness": "error"
  },
  "ignorePatterns": ["**/dist/**", "**/build/**", "**/coverage/**"]
}
```

## Migrating from ESLint

1. Run both linters initially to compare output
2. oxlint supports many ESLint rules - check `oxlint --rules` for coverage
3. For rules without oxlint equivalent, keep ESLint for those specific rules
4. Gradually phase out ESLint as oxlint coverage improves
