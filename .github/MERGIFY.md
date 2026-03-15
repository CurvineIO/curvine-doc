# Mergify Auto-merge Configuration

This document describes the automatic merge rules for the curvine-doc repository.

## Overview

Mergify is configured to automatically merge documentation PRs when all conditions are met, reducing manual overhead for routine updates.

## Auto-merge Rules

### Documentation PRs

**Conditions for auto-merge:**
- Base branch: `main`
- Has label: `documentation`
- CI check `test-deploy` passes (build succeeds)
- At least 1 approval from reviewers
- Title does not start with `WIP`
- Not marked as draft

**Action:**
- Merge using squash
- Delete head branch after merge

### Automatic Labeling

Mergify automatically adds the `documentation` label to PRs that modify:
- `blog/` directory (blog posts)
- `docs/` directory (documentation)
- `i18n/` directory (translations)

### Review Notification

When a documentation PR is created without approval, Mergify will automatically request review from:
- @lzjqsdd (Barry)

## Workflow

1. **Create PR**: Submit your documentation change
2. **Auto-label**: Mergify adds `documentation` label automatically
3. **CI Check**: GitHub Actions runs `test-deploy` (build test)
4. **Review**: Maintainer reviews and approves
5. **Auto-merge**: Mergify merges the PR when all conditions pass

## Manual Override

To disable auto-merge for a specific PR:
- Add `WIP` prefix to the title
- Mark PR as draft
- Remove the `documentation` label

## Configuration File

Location: `.github/mergify.yml`

## Requirements

- Mergify app must be installed on the repository
- GitHub Actions must be enabled
- Branch protection rules should require status checks

---

For more information, see: https://docs.mergify.com/
