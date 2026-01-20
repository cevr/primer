# Common Mistakes

Anti-patterns in primer writing and how to fix them.

## 1. Wall of Text

**Problem:** No structure, agent must read everything.

**Bad:**

```markdown
# Topic

This is a comprehensive guide to X. First, you need to understand
that X works by doing Y, which involves Z. When you want to use X,
you should consider A, B, and C. There are also edge cases...
[continues for 500 lines]
```

**Fix:** Add sections, headings, tables.

```markdown
# Topic

One-line summary.

## Quick Start

...

## Core Concepts

...

## See Also

...
```

## 2. Missing Navigation

**Problem:** No decision tree, topic index, or "where to go" guidance.

**Bad:**

```markdown
# Index

Welcome to this primer. Here are the files:

- basics.md
- advanced.md
- reference.md
```

**Fix:** Add decision tree + topic index.

```markdown
## Navigation

\`\`\`
What do you need?
├─ Learning basics → basics.md
├─ Implementing feature → advanced.md
└─ API lookup → reference.md
\`\`\`

## Topic Index

| Topic | File | When to Read |
| ----- | ---- | ------------ |
| ...   | ...  | ...          |
```

## 3. No "When to Use" Context

**Problem:** Files don't explain their applicability.

**Bad:**

```markdown
# Error Handling

Here's how to handle errors...
```

**Fix:** Add "When to Use" section.

```markdown
# Error Handling

## When to Use

- Custom error types
- Pipeline error handling
- Error transformation

## When NOT to Use

- Simple try/catch
- Input validation (see data-modeling.md)
```

## 4. Inconsistent Structure

**Problem:** Each file has different sections, unpredictable.

**Bad:**

```
file-a.md: Overview, Examples, API
file-b.md: Introduction, Usage, Notes
file-c.md: Getting Started, Reference
```

**Fix:** Standardize sections across files.

```
All files:
1. Title + one-liner
2. When to Use
3. [Topic content]
4. See Also
```

## 5. Too Much Upfront

**Problem:** Index tries to cover everything.

**Bad:**

```markdown
# Index

[2000 lines covering all topics in detail]
```

**Fix:** Index is navigation only; details in topic files.

```markdown
# Index

One-line description.

## Navigation

[decision tree]

## Topic Index

[table with file links]

## See Also

[cross-references]
```

## 6. Deep Nesting Without Navigation

**Problem:** Nested directories without index.md at each level.

**Bad:**

```
primers/topic/
├── core/
│   ├── basics/
│   │   └── intro.md      ← no index.md
│   └── advanced/
│       └── patterns.md   ← no index.md
└── extras/
    └── utils.md          ← no index.md
```

**Fix:** Add index.md with navigation at every level.

```
primers/topic/
├── index.md              ← links to core/, extras/
├── core/
│   ├── index.md          ← links to basics/, advanced/
│   ├── basics/
│   │   ├── index.md      ← navigation for basics
│   │   └── intro.md
│   └── advanced/
│       ├── index.md      ← navigation for advanced
│       └── patterns.md
└── extras/
    ├── index.md          ← navigation for extras
    └── utils.md
```

## 7. Missing Cross-References

**Problem:** Related topics not linked.

**Bad:**

```markdown
# Services

[explains services, never mentions errors or testing]
```

**Fix:** Add "See Also" sections.

```markdown
## See Also

- Error handling in services → errors.md#services
- Testing services → testing.md#mocking
```

## 8. Buried Gotchas

**Problem:** Pitfalls mentioned deep in content, easy to miss.

**Bad:**

```markdown
# API Reference

[100 lines of API docs]

Note: Don't do X, it will break everything.

[100 more lines]
```

**Fix:** Dedicated gotchas file + prominent warnings.

```markdown
# API Reference

> **Warning:** Don't do X. See gotchas.md#x-pitfall.

[API docs]
```

## 9. No Quick Reference

**Problem:** Agent must read full docs for simple lookup.

**Bad:**

```markdown
# Configuration

To configure option A, you need to understand the context...
[500 words later]
...set `optionA: true`.
```

**Fix:** Quick reference table at top.

```markdown
# Configuration

## Quick Reference

| Option  | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| optionA | bool | false   | Enables A   |

## Details

...
```

## 10. Generic File Names

**Problem:** `advanced.md`, `misc.md`, `other.md` - meaningless.

**Bad:**

```
├── basics.md
├── advanced.md    ← what's in here?
└── other.md       ← ???
```

**Fix:** Descriptive, domain-specific names.

```
├── basics.md
├── services.md    ← dependency injection
├── errors.md      ← error handling
└── testing.md     ← test patterns
```

## Checklist

Before shipping a primer:

- [ ] Entry file has decision tree
- [ ] Entry file has topic index with "When to Read"
- [ ] Each file has "When to Use" section
- [ ] Consistent structure across files
- [ ] Gotchas prominently surfaced
- [ ] Cross-references to related topics
- [ ] Nested dirs have index.md with navigation
- [ ] Descriptive file names
- [ ] Quick reference for lookups

## See Also

- `index.md` - primer overview
- `structure.md` - file organization
- `progressive.md` - information layering
