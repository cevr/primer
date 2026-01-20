# Decision Trees

ASCII trees for navigation. Help agents pick the right path fast.

## Basic Syntax

```
Root question?
├─ Option A → target-a.md
├─ Option B → target-b.md
└─ Option C → target-c.md
```

**Characters:**

- `├─` branch (not last)
- `└─` last branch
- `→` points to target
- Indent nested levels

## When to Use Trees

**Good for:**

- Task-based navigation (what are you doing?)
- Conditional paths (if X then Y)
- Troubleshooting flows

**Bad for:**

- Simple lists (use bullet points)
- Non-branching sequences (use numbered list)
- > 3 nesting levels (too complex)

## Examples

### Task-Based Navigation

```
What are you doing?
├─ Starting a project    → setup.md
├─ Writing code          → patterns.md
├─ Debugging             → gotchas.md
└─ Understanding API     → api.md
```

### Conditional Navigation

```
Error type?
├─ Type error        → api.md#types
├─ Runtime error     → gotchas.md#runtime
├─ Config error      → configuration.md
└─ Unknown           → gotchas.md#debugging
```

### Nested Tree (use sparingly)

```
Building what?
├─ CLI app
│  ├─ Simple          → cli.md#basic
│  └─ With subcommands → cli.md#advanced
├─ Web service
│  ├─ REST API        → patterns.md#rest
│  └─ GraphQL         → patterns.md#graphql
└─ Library            → patterns.md#library
```

### Troubleshooting Tree

```
What's happening?
├─ Won't compile
│  ├─ Type errors     → gotchas.md#types
│  └─ Import errors   → setup.md#imports
├─ Won't run
│  ├─ Crashes         → gotchas.md#runtime
│  └─ Hangs           → gotchas.md#async
└─ Wrong output       → gotchas.md#logic
```

## Best Practices

### 1. Question as Root

**Good:**

```
What are you building?
├─ ...
```

**Bad:**

```
Options:
├─ ...
```

### 2. Action-Oriented Labels

**Good:**

```
├─ Starting a project → setup.md
├─ Adding feature     → patterns.md
```

**Bad:**

```
├─ Setup              → setup.md
├─ Patterns           → patterns.md
```

### 3. Consistent Targets

All arrows should point to:

- File: `filename.md`
- Section: `filename.md#section`
- Command: `primer <name> <topic>`

### 4. Max 3 Levels Deep

If deeper, split into multiple trees or restructure.

**Too deep:**

```
Level 1
├─ Level 2
│  ├─ Level 3
│  │  ├─ Level 4  ← too much
```

**Better:** Put nested tree in target file.

### 5. Exhaustive Options

Cover all common cases. Use "Other/Unknown" as catch-all.

```
Error type?
├─ Known error A    → ...
├─ Known error B    → ...
└─ Something else   → gotchas.md#debugging
```

## Alternative Navigation

When trees don't fit:

### Topic Index Table

For reference lookup (no branching logic).

```markdown
| Topic | File     |
| ----- | -------- |
| Setup | setup.md |
| API   | api.md   |
```

### Numbered Steps

For sequential processes.

```markdown
1. Read `setup.md`
2. Follow `basics.md`
3. Pick from patterns in `patterns.md`
```

### Bullet Links

For simple "see also" lists.

```markdown
- Error handling → errors.md
- Testing → testing.md
```

## See Also

- `progressive.md` - information layering
- `structure.md` - file organization
- `index.md` - overview
