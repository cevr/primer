# Setup oxfmt

## Instructions for Agent

1. **Read the project's package.json** to identify:
   - Package manager (bun.lock, pnpm-lock.yaml, yarn.lock, or package-lock.json)
   - Existing formatter config (.prettierrc, .prettierrc.json, etc.)
   - Tailwind CSS usage
   - Editor config (.editorconfig)

2. **Install oxfmt**:

   ```bash
   <package-manager> add -D oxfmt
   ```

3. **Migrate from Prettier** (if exists):

   ```bash
   oxfmt --migrate prettier
   ```

   Or initialize fresh:

   ```bash
   oxfmt --init
   ```

4. **Create .oxfmtrc.json** if needed:

   Base configuration (most projects can use defaults):

   ```json
   {
     "printWidth": 100,
     "semi": true,
     "singleQuote": false,
     "trailingComma": "all"
   }
   ```

5. **Add experimental features** based on project:

   | Detection               | Add to config                                      |
   | ----------------------- | -------------------------------------------------- |
   | tailwindcss in deps     | `"experimentalTailwindcss": {}`                    |
   | Monorepo/many imports   | `"experimentalSortImports": { "type": "natural" }` |
   | package.json formatting | `"experimentalSortPackageJson": true`              |

6. **Add ignore patterns**:

   ```json
   {
     "ignorePatterns": ["**/node_modules/**", "dist/**", "build/**", ".next/**", "coverage/**"]
   }
   ```

7. **Add to package.json scripts**:

   ```json
   {
     "scripts": {
       "fmt": "oxfmt .",
       "fmt:check": "oxfmt --check"
     }
   }
   ```

8. **Run formatter** to verify:

   ```bash
   <package-manager> run fmt
   ```

9. **Update pre-commit hooks** (if lint-staged exists):

   ```json
   {
     "lint-staged": {
       "*": "oxfmt --no-error-on-unmatched-pattern"
     }
   }
   ```

10. **Update CI** to check formatting:
    ```yaml
    - run: bun run fmt:check
    ```

## Example Configurations

### Minimal (Most Projects)

```json
{}
```

oxfmt works with sensible defaults - no config needed.

### With Import Sorting

```json
{
  "experimentalSortImports": {
    "type": "natural",
    "groups": [["builtin"], ["external"], ["internal"], ["parent", "sibling", "index"]]
  }
}
```

### Tailwind Project

```json
{
  "experimentalTailwindcss": {},
  "ignorePatterns": ["**/node_modules/**", "dist/**"]
}
```

### Team with Specific Preferences

```json
{
  "printWidth": 80,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false
}
```

### Monorepo

```json
{
  "experimentalSortImports": {
    "type": "natural"
  },
  "experimentalSortPackageJson": true,
  "ignorePatterns": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**"]
}
```

## Cleaning Up After Migration

1. Remove Prettier dependencies:

   ```bash
   <package-manager> remove prettier @prettier/*
   ```

2. Delete Prettier config files:
   - `.prettierrc`
   - `.prettierrc.json`
   - `.prettierrc.js`
   - `prettier.config.js`

3. Update any CI/scripts referencing `prettier`

4. Update editor extensions (VSCode: install oxfmt extension)
