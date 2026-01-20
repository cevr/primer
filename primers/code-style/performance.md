# Performance

Language-agnostic optimization patterns. Profile before applying—earn complexity through measurement.

## Core Principle

**Defer complexity, earn it through measurement.** Don't optimize without profiling. Premature optimization adds cognitive load without proven benefit.

## Async Patterns

### Promise.all for Independent Operations

```ts
// BAD: Sequential, 3 round trips
const user = await fetchUser(id)
const posts = await fetchPosts(id)
const comments = await fetchComments(id)

// GOOD: Parallel, 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
])
```

### Start Early, Await Late

Initiate async work immediately, await only when needed:

```ts
// BAD: Await blocks subsequent work
async function handler(req: Request) {
  const user = await getUser(req.userId) // blocks
  const permissions = await getPermissions() // blocks
  return { user, permissions }
}

// GOOD: Start early, await late
async function handler(req: Request) {
  const userPromise = getUser(req.userId) // starts immediately
  const permissionsPromise = getPermissions() // starts immediately

  const user = await userPromise // await when needed
  const permissions = await permissionsPromise
  return { user, permissions }
}
```

### Defer Await to Branches

Move await into branches where actually used:

```ts
// BAD: Always awaits even if not needed
async function getData(useCache: boolean) {
  const fresh = await fetchFresh()
  if (useCache) {
    return getCached()
  }
  return fresh
}

// GOOD: Only await in branch that needs it
async function getData(useCache: boolean) {
  if (useCache) {
    return getCached()
  }
  return await fetchFresh()
}
```

## Data Structures

### Set/Map for O(1) Lookups

```ts
// BAD: O(n) per lookup
const allowedIds = ["a", "b", "c"]
items.filter((item) => allowedIds.includes(item.id))

// GOOD: O(1) per lookup
const allowedIds = new Set(["a", "b", "c"])
items.filter((item) => allowedIds.has(item.id))
```

### Pre-build Index Maps

Build once, lookup many:

```ts
// BAD: O(n) find for each order
orders.map((order) => ({
  ...order,
  user: users.find((u) => u.id === order.userId),
}))

// GOOD: O(1) lookup after O(n) build
const userMap = new Map(users.map((u) => [u.id, u]))
orders.map((order) => ({
  ...order,
  user: userMap.get(order.userId),
}))
```

### Check Length First

Short-circuit with cheap checks:

```ts
// BAD: Expensive comparison even for empty
function findDiff(a: Item[], b: Item[]): Item[] {
  return a.filter((item) => !b.some((x) => deepEqual(item, x)))
}

// GOOD: Early exit on length
function findDiff(a: Item[], b: Item[]): Item[] {
  if (a.length === 0) return []
  if (b.length === 0) return [...a]
  return a.filter((item) => !b.some((x) => deepEqual(item, x)))
}
```

## Loop Optimizations

### Early Return

Exit when result is determined:

```ts
// BAD: Continues after finding invalid
function validateAll(items: Item[]): boolean {
  let valid = true
  for (const item of items) {
    if (!isValid(item)) {
      valid = false
    }
  }
  return valid
}

// GOOD: Exit on first failure
function validateAll(items: Item[]): boolean {
  for (const item of items) {
    if (!isValid(item)) return false
  }
  return true
}
```

### Combine Iterations

Single loop instead of chained operations:

```ts
// BAD: Three iterations
const active = items.filter((x) => x.active)
const pending = items.filter((x) => x.pending)
const archived = items.filter((x) => x.archived)

// GOOD: Single iteration
const active: Item[] = []
const pending: Item[] = []
const archived: Item[] = []

for (const item of items) {
  if (item.active) active.push(item)
  else if (item.pending) pending.push(item)
  else if (item.archived) archived.push(item)
}
```

### Cache Property Access in Loops

```ts
// BAD: Repeated property access
for (let i = 0; i < items.length; i++) {
  process(config.settings.maxRetries)
}

// GOOD: Cache outside loop
const maxRetries = config.settings.maxRetries
const len = items.length
for (let i = 0; i < len; i++) {
  process(maxRetries)
}
```

## Caching

### Hoist Constants

Move expensive object creation outside hot paths:

```ts
// BAD: RegExp created on every call
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// GOOD: RegExp created once
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmail(s: string): boolean {
  return EMAIL_RE.test(s)
}
```

**Note:** Avoid global flag (`/g`) on hoisted RegExp—it maintains mutable `lastIndex` state.

### Module-level Memoization

Cache pure function results:

```ts
// BAD: Recalculates on every call
function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-")
}

// GOOD: Cache results
const slugCache = new Map<string, string>()

function slugify(text: string): string {
  const cached = slugCache.get(text)
  if (cached) return cached

  const slug = text.toLowerCase().replace(/\s+/g, "-")
  slugCache.set(text, slug)
  return slug
}
```

Consider cache eviction for unbounded growth:

```ts
const MAX_CACHE = 1000
if (slugCache.size > MAX_CACHE) {
  const firstKey = slugCache.keys().next().value
  slugCache.delete(firstKey)
}
```

## Import Optimization

### Avoid Barrel Files

Import directly from source files:

```ts
// BAD: Imports entire library
import { Button, Input } from "@ui/components"
import { formatDate } from "date-fns"

// GOOD: Import specific modules
import { Button } from "@ui/components/Button"
import { Input } from "@ui/components/Input"
import formatDate from "date-fns/formatDate"
```

Barrel files cause 200-800ms import overhead and defeat tree-shaking.

**Common offenders:** lucide-react, @mui/material, lodash, date-fns, react-icons, @radix-ui/react-\*

## Quick Reference

| Pattern                | When to Use                        |
| ---------------------- | ---------------------------------- |
| `Promise.all`          | Independent async operations       |
| Start early/await late | Multiple async in same function    |
| `Set`/`Map`            | Repeated membership checks         |
| Index map              | Joining data from two collections  |
| Early return           | Validation, search loops           |
| Combined iteration     | Multiple categorizations           |
| Hoisted constants      | RegExp, objects in hot paths       |
| Memoization            | Pure functions with repeated calls |
| Direct imports         | Large libraries with barrel files  |

## When NOT to Optimize

- No measured bottleneck
- Code runs infrequently
- Readability suffers significantly
- Optimization adds dependencies
- Savings are < 10ms in practice

## See Also

- `index.md` - core principles
- `gotchas.md` - performance anti-patterns
