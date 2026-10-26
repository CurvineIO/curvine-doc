# Curvine Docs Agent Configuration

Cross-platform AI agent config hub. **`.agents/` is the single canonical source**; agent tools read it via symlinks.

## Layout

```text
.agents/
  README.md
  skills/             # project skills (shared)
  rules/              # cross-agent workflow rules
```

Only **`cv-*` skills** are tracked in git. Other skills (e.g. local `awesome-design-md`) may exist under `.agents/skills/` but are gitignored.

## Agent skill paths

| Agent | Project path | Invocation |
| ----- | ------------ | ---------- |
| Claude Code | `.claude/skills/` → `.agents/skills/` | `/cv-docs-content` |
| Cursor | `.cursor/skills/` → `.agents/skills/` | auto-discover |
| Codex | `.agents/skills/` (native) | `/skills` |
| GitHub Copilot | `.github/skills/` → `.agents/skills/` | `/cv-docs-content` |

Edit versioned skills only under `.agents/skills/cv-*/`.

## Symlinks

```bash
ln -sfn ../.agents/skills .github/skills
rm -rf .cursor/skills && ln -sfn ../.agents/skills .cursor/skills
rm -rf .claude/skills && ln -sfn ../.agents/skills .claude/skills
```

## Versioned skills (`cv-` prefix)

| Skill | Stage |
| ----- | ----- |
| `cv-docs-content` | Content — author/update docs pages & blog posts in the Fumadocs pipeline |

## Rules

- Shared rules: `.agents/rules/`

## AGENTS.md

Root `AGENTS.md` lists all versioned `cv-*` skills in `<available_skills>`. Use `cv-add-skills` (from the Curvine main repo convention) when adding or updating skills.
