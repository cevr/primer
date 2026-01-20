# Gotchas

Common mistakes and anti-patterns in code style.

## Quick Reference

| Problem            | Symptom                           | Solution                           |
| ------------------ | --------------------------------- | ---------------------------------- |
| Union bloat        | Caller must check type before use | Single type or discriminated union |
| Mutable sort       | Original array modified           | Use `toSorted()`                   |
| Defensive overkill | Checks for impossible states      | Trust internal code                |
| Lazy reassignment  | `let x; x = value`                | `const x = value`                  |
| `any` escape hatch | Type errors disappear             | Fix the actual type                |
| Swallowed errors   | Bugs silently ignored             | Re-throw or log properly           |

---

## Union Types That Increase Cognitive Load

### Problem

Flexible unions push complexity to callers:

```ts
// BAD: Every caller must handle both cases
function process(input: string | string[]): void {
  const items = Array.isArray(input) ? input : [input]
  // ...
}
```

### Solution

Pick one type. Caller normalizes at boundary:

```ts
// GOOD: Single type, clear contract
function process(items: string[]): void {
  // ...
}

// Caller normalizes
process([singleItem])
process(multipleItems)
```

---

## Mutable Array Operations

### Problem

`sort()`, `reverse()`, `splice()` mutate in place:

```ts
// BAD: Original array mutated
const sorted = items.sort((a, b) => a.name.localeCompare(b.name))
// items is now also sorted!
```

### Solution

Use non-mutating alternatives:

```ts
// GOOD: Returns new array
const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name))
const reversed = items.toReversed()
const without = items.toSpliced(index, 1)
```

For older environments:

```ts
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
```

---

## Unnecessary Defensive Checks

### Problem

Checking for states that can't happen:

```ts
// BAD: User is always defined in this context
function UserProfile({ user }: { user: User }) {
  if (!user) return null  // Can't happen—prop is required!
  return <div>{user.name}</div>
}
```

### Solution

Trust internal code. Only validate at system boundaries:

```ts
// GOOD: Trust the type system
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>
}

// Validate at boundaries (API input, user input)
const user = Schema.decodeUnknownSync(UserSchema)(apiResponse)
```

---

## Lazy Variable Reassignments

### Problem

Declaring variables then assigning later:

```ts
// BAD: Harder to track value
let result
if (condition) {
  result = compute()
} else {
  result = fallback()
}
```

### Solution

Use expressions or early returns:

```ts
// GOOD: Clear, const
const result = condition ? compute() : fallback()

// GOOD: For complex logic
function getResult() {
  if (condition) return compute()
  return fallback()
}
const result = getResult()
```

---

## The `any` Escape Hatch

### Problem

Casting to `any` hides real type issues:

```ts
// BAD: Disables all type checking
const data = response as any
data.whatever.you.want // No errors, no safety
```

### Solution

Fix the actual type. Use `unknown` for truly unknown data:

```ts
// GOOD: Parse with schema
const data = Schema.decodeUnknownSync(ResponseSchema)(response)

// GOOD: Narrow unknown gradually
function process(input: unknown) {
  if (typeof input === "string") {
    return input.toUpperCase()
  }
  if (isRecord(input) && "name" in input) {
    return input.name
  }
  throw new Error("Unexpected input")
}
```

---

## Swallowed Errors

### Problem

Catch blocks that hide failures:

```ts
// BAD: Error disappears
try {
  await riskyOperation()
} catch {
  // Silent failure
}

// BAD: Returns undefined on error
try {
  return await fetchData()
} catch {
  return undefined
}
```

### Solution

Handle errors explicitly:

```ts
// GOOD: Re-throw with context
try {
  await riskyOperation()
} catch (error) {
  throw new OperationFailedError({ cause: error })
}

// GOOD: Return typed error
function fetchData(): Effect<Data, FetchError> {
  return Effect.tryPromise({
    try: () => fetch(url),
    catch: (e) => new FetchError({ cause: e }),
  })
}

// GOOD: Log and continue if intentional
try {
  await optionalOperation()
} catch (error) {
  logger.warn("Optional operation failed", { error })
}
```

---

## Non-null Assertions

### Problem

`!` asserts value exists without checking:

```ts
// BAD: Runtime error if not found
const user = users.find((u) => u.id === id)!
user.name // Crashes if find returned undefined
```

### Solution

Handle the undefined case:

```ts
// GOOD: Explicit error
const user = users.find((u) => u.id === id)
if (!user) {
  throw new UserNotFoundError({ id })
}
user.name // Safe

// GOOD: With Option
const user = Array.findFirst(users, (u) => u.id === id).pipe(
  Option.getOrThrow(() => new UserNotFoundError({ id })),
)
```

---

## Barrel File Imports

### Problem

Importing from index files pulls entire library:

```ts
// BAD: Loads all icons (~200KB+)
import { IconUser, IconSettings } from "lucide-react"
```

### Solution

Import from specific paths:

```ts
// GOOD: Only loads what you use
import { IconUser } from "lucide-react/dist/esm/icons/user"
import { IconSettings } from "lucide-react/dist/esm/icons/settings"
```

Check library docs for direct import paths. Common patterns:

- `lodash/debounce` instead of `lodash`
- `date-fns/format` instead of `date-fns`
- `@mui/material/Button` instead of `@mui/material`

---

## Global RegExp State

### Problem

RegExp with `/g` flag maintains state:

```ts
// BAD: Inconsistent results
const RE = /foo/g
RE.test("foo") // true
RE.test("foo") // false (!)
RE.test("foo") // true
```

### Solution

Omit global flag for simple tests:

```ts
// GOOD: Stateless
const RE = /foo/
RE.test("foo") // true, always
```

Or create new RegExp each time if global needed:

```ts
// GOOD: Fresh instance
function findAll(pattern: RegExp, text: string) {
  const re = new RegExp(pattern.source, pattern.flags)
  return text.match(re)
}
```

---

## Mixing `await` with `.then()`

### Problem

Combining styles creates confusion:

```ts
// BAD: Mixed paradigms
const result = await fetchData().then(transform)
```

### Solution

Pick one style:

```ts
// GOOD: async/await throughout
const data = await fetchData()
const result = transform(data)

// GOOD: Promise chain throughout
const result = fetchData().then(transform)
```

---

## See Also

- `index.md` - core principles
- `soundness.md` - type safety patterns
- `performance.md` - optimization techniques
