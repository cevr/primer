# CLI Design Primer

Build CLIs that feel native, fail gracefully, compose beautifully.

## Core Principles

1. **Human-first, machine-friendly** - default to human output; `--json` for scripts
2. **Respond in 100ms** - print something fast; show progress for slow ops
3. **Fail gracefully** - clear errors, recovery suggestions, easy bug reports
4. **Respect conventions** - standard flags, XDG paths, NO_COLOR
5. **Composability** - stdin/stdout/stderr, exit codes, plain text
6. **Don't break things** - additive changes, deprecation warnings

## Decision Tree

```
What are you designing?
├─ Command structure → commands.md
├─ Help/docs → help.md
├─ Output formatting → output.md
├─ Error handling → errors.md
├─ Config/credentials → config.md
├─ UX/responsiveness → design.md
└─ "Is this bad?" → gotchas.md
```

## Topic Index

| Topic            | File                       | Key Points                              |
| ---------------- | -------------------------- | --------------------------------------- |
| UX Philosophy    | [design.md](design.md)     | 100ms rule, progress, Ctrl-C, prompts   |
| Commands & Flags | [commands.md](commands.md) | Naming, args vs flags, `--` passthrough |
| Help Text        | [help.md](help.md)         | Lead with examples, all help forms work |
| Output           | [output.md](output.md)     | TTY detection, colors, tables, streams  |
| Errors           | [errors.md](errors.md)     | Anatomy of great errors, recovery       |
| Config           | [config.md](config.md)     | Precedence, XDG spec, credentials       |
| Anti-patterns    | [gotchas.md](gotchas.md)   | Common mistakes to avoid                |

## 12-Factor CLI (Quick Reference)

| #   | Principle               | Summary                              |
| --- | ----------------------- | ------------------------------------ |
| 1   | Great help              | In-CLI + web; examples essential     |
| 2   | Prefer flags to args    | 1 arg ok, 2 suspect, 3 never         |
| 3   | Version accessible      | `--version`, `-V`, `version`         |
| 4   | Mind the streams        | stdout = data, stderr = messages     |
| 5   | Handle errors well      | Code + title + fix + URL             |
| 6   | Be fancy                | Colors/spinners, but respect TTY     |
| 7   | Prompt if you can       | Interactive when TTY; flag override  |
| 8   | Use tables              | Grep-friendly; `--json`; `--columns` |
| 9   | Be speedy               | <100ms ideal, spinner if slow        |
| 10  | Encourage contributions | License, contributing guide          |
| 11  | Clear subcommands       | `topic:command`; help on empty       |
| 12  | Follow XDG-spec         | Proper config/data/cache paths       |

## The Unix Philosophy (Still Relevant)

- Do one thing well
- Text streams as universal interface
- Silence is golden (no output = success)
- Fail early, fail loudly
- Compose with other tools

## Sources

- [clig.dev](https://clig.dev) - comprehensive modern guidelines
- [12-Factor CLI](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46) - Jeff Dickey's principles
- [Heroku CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide) - battle-tested patterns
