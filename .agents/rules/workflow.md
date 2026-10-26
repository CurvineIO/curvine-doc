# Curvine Docs workflow rules

Referenced by `cv-*` skills in this repository.

## Content changes

- One page/post per PR; title the PR `docs: <what>` (or `blog: <what>` for posts).
- Always edit content **sources** (`docs/`, `blog/`, `i18n/`, `static/`), never generated files (`site/content/`, `site/public/`, `site/.source/`, `site/out/`).
- Run `npm run sync` + `npm run typecheck` before submitting (inside `site/`).
- Keep URLs stable: do not rename `docs/` sections or blog folders without a redirect plan.

## PR body sections

1. **Summary**
2. **Issue Describe / Design** (root cause / repro / fix for bugs)
3. **Changes** (table: module, change, impact)
4. **Test verified** (table: case, result, notes)
5. **Dependencies** (related PRs / issues)

## PR title

```
<type>(<module>): <description> (#<issueNumber>)
```

Types: `docs`, `blog`, `feat`, `fix`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

## Review

- Analyze every comment ID before coding
- Present accept/reject table; wait for user approval
- Reply in English; resolve fixed threads on GitHub

## CI

- `.github/workflows/deploy-fumadocs.yml`: PRs build + typecheck only (no publish); merge to main publishes `site/out` to GitHub Pages.
