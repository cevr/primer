# Code Style Primer

Framework-agnostic principles for writing **sound, simple, consistent, disciplined, and far-seeing** code.

## Core Principles

### 1. Soundness

Types make illegal states unrepresentable.

### 2. Simplicity

Fewer concepts, fewer moving parts.

### 3. Consistency

Same patterns throughout the codebase.

### 4. Discipline

No shortcuts that create tech debt.

### 5. Far-seeing

Consider future readers and maintainers.

### 6. Deferred Complexity

Earn complexity through measurement. Profile before optimizing. Add abstractions only when patterns emerge.

## Cognitive Cost

Patterns that increase mental overhead:

| Avoid                        | Prefer                     | Why                             |
| ---------------------------- | -------------------------- | ------------------------------- |
| `x: string \| string[]`      | `x: string[]`              | Callers must check type         |
| `{ data?, error?, loading }` | Discriminated union        | Impossible states representable |
| `enabled?: boolean`          | Omit prop or union         | `false` vs `undefined` unclear  |
| Mutable state + effects      | Derived from single source | Fewer bug hiding spots          |
| Boolean flags                | Discriminated unions       | Type system enforces validity   |
| `any` casts                  | Proper typing              | Bypasses compiler               |

## Decision Trees

```
Designing state?
├─ Multiple mutually exclusive states → Discriminated union
├─ Optional with clear semantics     → Optional field
└─ Unclear false vs undefined        → Required field or union

Optimizing performance?
├─ Know the bottleneck?
│  ├─ Yes → Apply targeted fix
│  └─ No  → Profile first
├─ Repeated lookups in array?        → Use Set/Map
└─ Multiple array iterations?        → Combine into single loop

Handling errors?
├─ Expected failure mode?            → Typed error (TaggedError)
├─ Programming bug?                  → Let it crash (defect)
└─ Unknown external?                 → Wrap at boundary
```

## Navigation

```
Code style question?
├─ Type safety, impossible states    → soundness.md
├─ Optimizations, async, caching     → performance.md
└─ Common mistakes, anti-patterns    → gotchas.md
```

## Topic Index

| Topic         | File             | When to Read                   |
| ------------- | ---------------- | ------------------------------ |
| Type safety   | `soundness.md`   | Modeling state, error handling |
| Performance   | `performance.md` | Optimizing hot paths           |
| Anti-patterns | `gotchas.md`     | Code review, debugging         |

## Quick Reference

### Good Defaults

- Discriminated unions over boolean flags
- `import type { X }` for type-only imports
- Early returns over nested conditionals
- Single iteration over chained `.filter().map()`
- `Set`/`Map` for repeated lookups
- Module-level constants for expensive objects

### Red Flags

- `any` casts or `!` assertions
- `// @ts-ignore` without explanation
- Commented-out code
- `catch` blocks that swallow errors
- Barrel file imports from large libraries

## See Also

- `soundness.md` - type safety patterns
- `performance.md` - optimization techniques
- `gotchas.md` - common mistakes
