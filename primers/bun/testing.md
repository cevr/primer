# Testing

`bun test` — built-in test runner with Jest-compatible API. No config, no install. 80x faster than Jest.

## When to Use

- Always. It's the default test runner for any Bun project.
- Migrating from Jest? Most tests work as-is — just change the import.

## Quick Start

```typescript
import { test, expect } from "bun:test"

test("math works", () => {
  expect(1 + 1).toBe(2)
})
```

```bash
bun test                       # run all tests
bun test src/                  # run tests in directory
bun test user.test.ts          # specific file
bun test --watch               # watch mode
bun test -t "user"             # filter by name pattern
```

## Imports

Everything comes from `"bun:test"`:

```typescript
import {
  test, // alias: it
  describe,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  mock,
  spyOn,
  jest, // Jest compat: jest.fn(), jest.spyOn()
} from "bun:test"
```

## describe / test

```typescript
import { describe, test, expect } from "bun:test"

describe("UserService", () => {
  test("creates a user", () => {
    const user = createUser("Alice")
    expect(user.name).toBe("Alice")
  })

  test("rejects empty name", () => {
    expect(() => createUser("")).toThrow("Name required")
  })
})
```

## Lifecycle Hooks

```typescript
import { describe, test, beforeAll, beforeEach, afterEach, afterAll } from "bun:test"

describe("Database", () => {
  let db: Database

  beforeAll(() => {
    db = new Database(":memory:")
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
  })

  beforeEach(() => {
    db.exec("DELETE FROM users")
  })

  afterAll(() => {
    db.close()
  })

  test("inserts user", () => {
    db.prepare("INSERT INTO users (name) VALUES (?)").run("Alice")
    const count = db.prepare("SELECT COUNT(*) as n FROM users").get()
    expect(count.n).toBe(1)
  })
})
```

## Async Tests

```typescript
test("fetches data", async () => {
  const res = await fetch("https://api.example.com/data")
  expect(res.status).toBe(200)

  const data = await res.json()
  expect(data).toHaveProperty("id")
})
```

## Mocking

### mock() — Function Mocks

```typescript
import { test, expect, mock } from "bun:test"

const fn = mock((x: number) => x * 2)

test("tracks calls", () => {
  expect(fn(3)).toBe(6)
  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith(3)

  fn(5)
  expect(fn).toHaveBeenCalledTimes(2)
  expect(fn.mock.results).toEqual([
    { type: "return", value: 6 },
    { type: "return", value: 10 },
  ])
})
```

### spyOn() — Spy on Methods

```typescript
import { test, expect, spyOn } from "bun:test"

const user = {
  name: "Alice",
  greet() {
    return `Hi, I'm ${this.name}`
  },
}

test("tracks method calls", () => {
  const spy = spyOn(user, "greet")

  user.greet()
  expect(spy).toHaveBeenCalledTimes(1)

  spy.mockRestore() // restore original
})
```

### spyOn with mockImplementation

```typescript
import { test, expect, spyOn } from "bun:test"

test("overrides implementation", () => {
  const spy = spyOn(console, "log").mockImplementation(() => {})

  console.log("silenced")
  expect(spy).toHaveBeenCalledWith("silenced")

  spy.mockRestore()
})
```

### mock.module() — Module Mocking

```typescript
import { mock, test, expect } from "bun:test"

mock.module("./database", () => ({
  query: mock(() => [{ id: 1, name: "Mock User" }]),
}))

test("uses mocked database", async () => {
  const { query } = await import("./database")
  const result = query("SELECT * FROM users")
  expect(result).toEqual([{ id: 1, name: "Mock User" }])
})
```

### Restoring Mocks

```typescript
import { afterEach, mock } from "bun:test"

afterEach(() => {
  mock.restore() // restore ALL mocks/spies at once
})
```

Gotcha: Mocks and spies are NOT auto-reset between tests. Always restore in `afterEach`.

## Snapshot Testing

```typescript
import { test, expect } from "bun:test"

test("matches snapshot", () => {
  const output = renderComponent({ name: "Alice" })
  expect(output).toMatchSnapshot()
})
```

```bash
bun test --update-snapshots    # update snapshot files
```

## Test Modifiers

```typescript
test.skip("temporarily disabled", () => {
  /* ... */
})
test.only("run only this", () => {
  /* ... */
})
test.todo("implement later")

// Timeout (default: 5000ms)
test("slow test", async () => {
  await longOperation()
}, 30_000) // 30 seconds
```

## Expect Matchers

Common matchers — Jest-compatible:

| Matcher                            | Description           |
| ---------------------------------- | --------------------- |
| `.toBe(val)`                       | Strict equality       |
| `.toEqual(val)`                    | Deep equality         |
| `.toStrictEqual(val)`              | Deep + type equality  |
| `.toBeTruthy()` / `.toBeFalsy()`   | Truthiness            |
| `.toBeNull()` / `.toBeUndefined()` | Null checks           |
| `.toBeGreaterThan(n)`              | Numeric comparison    |
| `.toContain(item)`                 | Array/string contains |
| `.toHaveLength(n)`                 | Array/string length   |
| `.toHaveProperty(key, val?)`       | Object property       |
| `.toThrow(msg?)`                   | Throws error          |
| `.toMatchObject(obj)`              | Partial object match  |
| `.toMatchSnapshot()`               | Snapshot comparison   |
| `.resolves` / `.rejects`           | Promise matchers      |

## Running Tests

```bash
bun test                         # all test files
bun test --bail                  # stop on first failure
bun test --timeout 30000         # global timeout (ms)
bun test --preload ./setup.ts    # preload script
bun test --coverage              # code coverage report
```

Test files are auto-discovered: `*.test.ts`, `*.test.tsx`, `*.test.js`, `*.spec.ts`, etc.

## See Also

- [runtime.md](runtime.md) — bun CLI commands
- [data.md](data.md) — bun:sqlite for test databases
- [gotchas.md](gotchas.md) — differences from Jest
