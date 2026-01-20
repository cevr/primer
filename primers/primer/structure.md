# File Organization

How to structure primer files for optimal agent navigation.

## Sizing Guide

```
Topic complexity?
├─ Single concept        → 1-2 files
├─ Multiple concepts     → As many files as needed
└─ Key: progressive disclosure, not fixed count
```

**No fixed file count.** Add files as topics emerge. The pattern is incremental disclosure, not a template.

## Single-File Primer

For simple, focused topics.

```
primers/<name>/
└── index.md
```

**index.md structure:**

```markdown
# Topic Name

One-line description.

## When to Use

...

## Quick Reference

...

## Examples

...

## Gotchas

...
```

## Multi-File Primer

For topics with distinct subtopics.

```
primers/<name>/
├── index.md      # Navigation + overview
├── basics.md     # Core concepts
├── advanced.md   # Deep details
└── gotchas.md    # Pitfalls
```

### Entry File (`index.md`)

**Required sections:**

1. Title + one-liner
2. Critical rules (if any)
3. Navigation tree
4. Topic index table
5. See Also links

**Template:**

```markdown
# Topic Name

One-line description.

## Critical Rules

1. ...
2. ...

## Navigation

\`\`\`
Need X?
├─ Path A → file-a.md
└─ Path B → file-b.md
\`\`\`

## Topic Index

| Topic | File | When to Read |
| ----- | ---- | ------------ |
| ...   | ...  | ...          |

## See Also

- Related topic → file.md
```

## Scaling Up

Add files as distinct topics emerge. Common file types:

| File Type          | Contains                      | Agent Opens When      |
| ------------------ | ----------------------------- | --------------------- |
| `index.md`         | Decision tree, topic index    | Always first          |
| `basics.md`        | Core concepts, fundamentals   | Learning the domain   |
| `<topic>.md`       | Specific subtopic             | Working on that topic |
| `patterns.md`      | Idioms, examples, recipes     | Implementation        |
| `gotchas.md`       | Pitfalls, limits, workarounds | Debugging             |
| `api.md`           | Function sigs, type defs      | Writing code          |
| `configuration.md` | Config options, setup         | Project init          |

**Don't pre-create files.** Add them when content warrants separation. A primer can have 2 files or 20 - complexity dictates structure.

## Naming Conventions

**Files:**

- Lowercase, kebab-case: `data-modeling.md`
- Avoid generic: prefer `errors.md` over `advanced.md`
- Match domain language: `services.md` for Effect, not `di.md`

**Primers:**

- Short, memorable: `effect`, `oxlint`
- Match tool/library name when applicable
- No prefixes/suffixes: `effect` not `effect-primer`

## Directory Rules

1. **Flat by default** - use files until topic warrants separation
2. **Nest for distinct domains** - `primers/web/react/`, `primers/web/solid/`
3. **Every level needs index.md** - navigation must work at any depth

## Cross-Primer References

Link to other primers when relevant:

```markdown
## See Also

- Error handling patterns → `primer errors patterns`
- Testing with mocks → `primer testing`
```

## See Also

- `index.md` - overview
- `progressive.md` - information layering
- `decision-trees.md` - navigation patterns
