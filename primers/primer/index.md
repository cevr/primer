# Primer Primer

Meta-guide for writing effective primers/skills for AI agents.

## Core Principle

**AI agents scan, not read.** Structure for quick navigation, not prose comprehension.

## Critical Rules

1. **Progressive disclosure** - start high-level, drill down on demand
2. **Decision trees** - help agents pick the right path fast
3. **Consistent patterns** - predictable structure reduces cognitive load
4. **"When to use" context** - always explain applicability
5. **Gotchas prominent** - surface pitfalls early, not buried

## Navigation

```
Writing a primer?
├─ File organization       → structure.md
├─ Layered information     → progressive.md
├─ Navigation patterns     → decision-trees.md
└─ Common mistakes         → gotchas.md
```

## Topic Index

| Topic                  | File                | When to Read             |
| ---------------------- | ------------------- | ------------------------ |
| File organization      | `structure.md`      | Planning primer layout   |
| Progressive disclosure | `progressive.md`    | Designing info hierarchy |
| Decision trees         | `decision-trees.md` | Creating navigation aids |
| Anti-patterns          | `gotchas.md`        | Reviewing/debugging      |

## Quick Start

### Entry Point Pattern

Every primer starts with `index.md`:

- Overview + one-liner
- Decision tree for navigation
- Topic index table
- Links to deeper files

### Scale with Complexity

```
Simple topic     → 1-2 files
Medium topic     → 3-5 files
Complex domain   → As many as needed
```

The key: **only expose what's needed at each layer.** Agent reads index first, follows links to specific topics on demand.

### Example Structures

**Simple (oxlint):**

```
├── index.md    # Overview + navigation
└── setup.md    # Setup details
```

**Medium (this primer):**

```
├── index.md          # Entry point
├── structure.md      # File organization
├── progressive.md    # Disclosure patterns
├── decision-trees.md # Navigation aids
└── gotchas.md        # Anti-patterns
```

**Complex (Effect):**

```
├── index.md          # Entry + navigation
├── basics.md         # Core concepts
├── services.md       # DI patterns
├── data-modeling.md  # Schema/data
├── errors.md         # Error handling
├── testing.md        # Test patterns
└── cli.md            # CLI apps
```

## See Also

- `structure.md` - detailed file organization
- `progressive.md` - layered information design
- `decision-trees.md` - ASCII navigation trees
- `gotchas.md` - common primer mistakes
