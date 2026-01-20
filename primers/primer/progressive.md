# Progressive Disclosure

Layering information so agents get what they need without wading through everything.

## Core Concept

**Reveal complexity gradually.** Start with what's needed 80% of the time; hide details until requested.

## Information Layers

```
Layer 0: Entry (index.md)
├─ What is this?
├─ When to use?
└─ Where to go next?

Layer 1: Topic Files
├─ Core concepts
├─ Common patterns
└─ Quick examples

Layer 2: Deep Sections
├─ Edge cases
├─ Full API reference
└─ Advanced configuration
```

## Techniques

### 1. Topic Index Tables

Put at top of index.md. Agent scans, picks path.

```markdown
| Topic  | File        | When to Read |
| ------ | ----------- | ------------ |
| Setup  | `setup.md`  | New project  |
| API    | `api.md`    | Writing code |
| Errors | `errors.md` | Debugging    |
```

**"When to Read" column is critical** - helps agent self-select.

### 2. Decision Trees

Guide agent to right file based on task.

```markdown
What are you doing?
├─ Starting new project → setup.md
├─ Adding a feature → patterns.md
├─ Fixing a bug → gotchas.md
└─ Understanding code → api.md
```

### 3. "When to Use" Sections

Every file should explain its applicability upfront.

```markdown
# Error Handling

## When to Use

- Defining custom error types
- Handling failures in Effect pipelines
- Converting between error types

## When NOT to Use

- Simple try/catch (use standard TS)
- Validation (see data-modeling.md)
```

### 4. Reading Order Suggestions

Help agents know what to read first.

```markdown
## Reading Order

1. `index.md` - start here (you are here)
2. `basics.md` - core concepts
3. Pick based on task:
   - `services.md` - dependency injection
   - `errors.md` - error handling
```

### 5. Inline Cross-References

Link deeper content instead of including it.

**Good:**

```markdown
Define errors with `Data.TaggedError`. See `errors.md` for patterns.
```

**Bad:**

```markdown
Define errors with `Data.TaggedError`. Here's how:
[300 lines of error handling details]
```

### 6. Section Prioritization

Within files, put most-used info first.

```markdown
# Configuration

## Quick Setup (80% of users)

...

## Common Options

...

## Advanced Options

...

## Full Reference

...
```

## "When to Read" Patterns

Common patterns for the guidance column:

| Context        | Phrase                               |
| -------------- | ------------------------------------ |
| Starting out   | "New to X", "First time setup"       |
| Writing code   | "Implementing X", "Writing X"        |
| Debugging      | "Errors with X", "X not working"     |
| Reference      | "Need exact signature", "API lookup" |
| Best practices | "Code review", "Refactoring"         |

## Anti-Patterns

| Anti-Pattern        | Problem                | Fix                    |
| ------------------- | ---------------------- | ---------------------- |
| Everything in index | Agent must read all    | Split into topic files |
| No navigation       | Agent guesses paths    | Add decision tree      |
| Missing "when"      | Agent opens wrong file | Add "When to Read"     |
| Deep before basics  | Agent confused         | Order by frequency     |

## See Also

- `structure.md` - file organization
- `decision-trees.md` - navigation tree syntax
- `gotchas.md` - common mistakes
