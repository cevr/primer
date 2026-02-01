# Gotchas

Node.js compatibility gaps, behavioral differences, and migration pitfalls. Check here before assuming something "just works."

## When to Use

- Migrating a Node.js project to Bun
- Debugging behavior that differs from Node
- Evaluating whether Bun works for your stack

## Compatibility Summary

Bun targets >95% Node.js API compatibility. The remaining ~5% is mostly edge cases. Most modern npm packages work out of the box.

## Native Addons

The biggest risk area. Native C++ addons using Node-API mostly work, but:

| Status | Category                               |
| ------ | -------------------------------------- |
| Works  | Most Node-API / N-API addons           |
| Risky  | Addons using internal V8 APIs          |
| Broken | Addons tightly coupled to V8 internals |

**Rule of thumb:** If a package has a WebAssembly fallback, prefer it. If it only ships native binaries for Node, test thoroughly.

Common packages that work fine:

- `sharp`, `bcrypt`, `canvas`, `better-sqlite3` (though use `bun:sqlite` instead)

Check the [Bun compatibility tracker](https://bun.sh/docs/runtime/nodejs-compat) for specifics.

## Engine: JavaScriptCore vs V8

Bun runs on JavaScriptCore (Safari's engine), not V8 (Chrome/Node). Implications:

| Aspect                    | Bun (JSC)                 | Node (V8)                       |
| ------------------------- | ------------------------- | ------------------------------- |
| Startup                   | Faster                    | Slower                          |
| Memory                    | Lower (~25% less)         | Higher                          |
| Long-running optimization | Good                      | Better (V8 shines after warmup) |
| `eval()` / dynamic code   | Same semantics            | Same semantics                  |
| Stack traces              | Slightly different format | Standard V8 format              |

Practical impact: If your code relies on V8-specific error message text in tests (e.g., `expect(err.message).toBe("...")`), those may differ.

## Streams & Fetch

Subtle behavioral differences in streaming and fetch:

- **Backpressure** — timing and buffering differ from Node's stream implementation
- **Abort semantics** — `AbortController` works, but edge cases in abort timing may differ
- **Request/Response bodies** — Bun uses Web API standards; Node's `http.IncomingMessage` patterns need adaptation

```typescript
// Node pattern (works, but prefer Web API)
import { createReadStream } from "node:fs"
const stream = createReadStream("file.txt")

// Bun-native pattern (preferred)
const file = Bun.file("file.txt")
new Response(file.stream())
```

## node: Module Differences

Most `node:*` modules work. Known gaps/differences:

| Module                     | Status  | Notes                              |
| -------------------------- | ------- | ---------------------------------- |
| `node:fs`                  | Works   | Use `Bun.file()` instead for perf  |
| `node:path`                | Works   | Fully compatible                   |
| `node:crypto`              | Works   | Some obscure algorithms may differ |
| `node:http`                | Works   | But prefer `Bun.serve()`           |
| `node:child_process`       | Works   | But prefer `Bun.$` or `Bun.spawn`  |
| `node:worker_threads`      | Works   | Basic API compatible               |
| `node:cluster`             | Partial | Limited support                    |
| `node:vm`                  | Partial | Some context isolation differences |
| `node:diagnostics_channel` | Partial | Basic support                      |
| `node:inspector`           | Missing | No V8 inspector protocol           |

## TypeScript Differences

Bun runs `.ts` natively — no `tsc` needed at runtime. But:

- **Type checking is NOT done at runtime** — Bun strips types and runs. Use `tsc --noEmit` separately.
- **Decorators** — supported (both legacy and TC39)
- **Enums** — supported
- **`paths` in tsconfig** — respected for resolution

Node (with `--experimental-strip-types`) can't handle enums, decorators, or namespaces. Bun can.

## Testing: bun test vs Jest

`bun:test` is Jest-compatible but not identical:

| Feature                        | bun:test                         | Jest                           |
| ------------------------------ | -------------------------------- | ------------------------------ |
| `mock()` / `spyOn()`           | Yes                              | Yes                            |
| Auto-reset mocks between tests | **No** — manual restore needed   | `restoreMocks: true` in config |
| `jest.mock()` module hoisting  | No — use `mock.module()`         | Yes                            |
| `jest.useFakeTimers()`         | No — use `mock.module("timers")` | Yes                            |
| Custom matchers                | `expect.extend()` works          | Same                           |
| `--coverage`                   | Yes (built-in)                   | Via istanbul/c8                |
| Snapshot testing               | Yes                              | Yes                            |

**Critical:** Always call `mock.restore()` in `afterEach`. Mocks persist across tests otherwise.

## Package Manager: bun install

`bun install` is fast but has some differences:

- **Lockfile** — `bun.lockb` (binary) not `package-lock.json`. For readable lockfiles: `bun install --yarn` produces `yarn.lock`.
- **Resolution** — may resolve different versions than npm/pnpm in edge cases
- **Workspaces** — supported, but some complex workspace topologies may behave differently
- **Lifecycle scripts** — `postinstall` scripts run, but with Bun's runtime (most are fine)

## Common Migration Pitfalls

### 1. Forgetting to remove dotenv

```typescript
// WRONG — dotenv is unnecessary and may conflict
import "dotenv/config"

// RIGHT — Bun auto-loads .env
const key = process.env.API_KEY
```

### 2. Using Node's HTTP module instead of Bun.serve

```typescript
// Works, but you're leaving performance on the table
import http from "node:http"
http.createServer((req, res) => {
  /* ... */
})

// Better — native Bun API, faster, built-in routing
Bun.serve({
  routes: { "/": () => new Response("Hello") },
})
```

### 3. Installing packages Bun already has

Don't install: `dotenv`, `ws`, `better-sqlite3`, `ioredis`, `pg`, `express` (for basic servers), `execa`, `webpack`, `esbuild`.

Check [index.md](index.md) "Instead of X, Use Y" table.

### 4. V8-specific code

```typescript
// Won't work — V8 flags don't exist in Bun
// node --max-old-space-size=4096 app.js

// Won't work — V8 inspector
// node --inspect app.js

// For debugging, use:
// bun --inspect app.ts  (WebKit Inspector, not Chrome DevTools)
```

### 5. Assuming jest.mock hoisting

```typescript
// Jest hoists this to the top — bun:test does NOT
jest.mock("./database")

// In bun:test, use mock.module() and import after:
import { mock } from "bun:test"
mock.module("./database", () => ({ query: mock(() => []) }))
```

## When to Stay on Node

- Heavy reliance on V8-specific native addons with no alternatives
- Need Chrome DevTools debugging (V8 Inspector protocol)
- Using `node:cluster` extensively
- Enterprise auth SDKs or obscure drivers that haven't been tested on Bun

## See Also

- [runtime.md](runtime.md) — Bun's native APIs
- [testing.md](testing.md) — bun test specifics
- [Bun Node.js compat docs](https://bun.sh/docs/runtime/nodejs-compat)
