---
sidebar_position: 5
---

# Skills Guide

Every project has its own way of doing things: which template an issue should follow, how a PR title is worded, what a reviewer should look at first. Curvine writes those habits down as **skills** — small, readable playbooks that an AI coding agent can pick up and follow.

You will find them in the [Curvine repository](https://github.com/CurvineIO/curvine/tree/main/.agents/skills), under `.agents/skills/`. Each skill is just a folder with a `SKILL.md` file. There is no service to install and no account to create. The skills are versioned with the code, so they evolve together with the project.

You can read a skill like a checklist and do the work yourself, or let your agent follow it for you. This guide focuses on the second option and walks through the four things contributors do most often: creating an issue, fixing an issue, submitting a pull request, and reviewing code.

## What a skill is (and is not)

A skill is guidance, not automation. It tells an agent *how* Curvine likes a job done and which commands to run. It does not merge code, bypass CI, or make decisions on your behalf.

That last point matters. By design, the skills pause before anything leaves your machine. They draft an issue, a commit message, a PR body, or a review comment first, and wait for your approval. You stay in charge of what gets published.

## Before you start

You need:

- A local clone of the `curvine` repository.
- An AI coding agent that can load project skills. Claude Code, Cursor, Codex, and GitHub Copilot all work today.
- The [GitHub CLI](https://cli.github.com/) signed in, because some skills file issues, push branches, or post review comments. Check with `gh auth status`.
- A working build environment if you plan to change Rust code. The [Development Guide](./01-development-guide.md) covers the details.

The skills are discovered automatically through the directories your agent already reads: `.claude/skills`, `.cursor/skills`, and `.github/skills` are symlinks to `.agents/skills`, while Codex reads `.agents/skills` directly.

If your agent supports slash commands, call a skill by name:

```text
/cv-create-issue
```

Cursor discovers the same skills without a slash command. If you are ever unsure what a skill does, open its `SKILL.md` — that file is the contract.

## The four everyday workflows

### 1. Create an issue with `cv-create-issue`

Use this when you find a bug or want to propose a feature. A short prompt is enough:

```text
/cv-create-issue
FUSE read of a 64 MiB file hangs after a worker restart; client version ...
```

The skill searches open issues for duplicates, picks the right template from `.github/ISSUE_TEMPLATE/`, and drafts the body. Bug reports get reproduction steps and environment details. Feature requests also get three sections that keep scope honest: **Goal**, **Not Goal**, and **Test Plan**.

Read the draft, adjust the wording, and approve. The issue is then filed with the right label. For a sub-task of a larger issue, the skill uses the `[SUB]` title prefix and links `Parent: #<number>`.

A small tip: paste real logs, versions, and reproduction steps. A clear issue is a gift to whoever fixes it later — often future you.

### 2. Fix an issue with `cv-handle-issue`

Give the skill an issue number or URL:

```text
/cv-handle-issue 123
```

The first half of this workflow is thinking, not typing. The skill reads the issue, summarizes the problem, the modules involved, the risks, and the test strategy, then proposes a plan. **No code is written until you approve that plan.** Plans are cheap to change; code is not.

Once you approve, the skill creates a branch named after the issue (`fix/123-short-slug` or `feat/123-short-slug`), implements the agreed scope, adds tests, runs `make format`, and hands the result to `cv-create-pr`.

If the change looks larger than roughly 500 lines, the skill routes to `cv-tasks-breakdown`. That skill slices the work into dependency-ordered tasks, each small enough to land as one commit, and can file `[SUB]` issues to track them. Small steps, always green.

When you read the plan, put on your reviewer hat. If the scope feels wrong, say so now — it costs nothing at this stage.

### 3. Submit a pull request with `cv-create-pr`

When your commits are ready:

```text
/cv-create-pr
```

The skill runs `make format`, reviews the diff, and drafts the PR:

- **Title:** `<type>(<module>): <description> (#<issueNumber>)`
- **Body:** Summary, Issue Describe / Design, Changes, Test verified, and Dependencies

Give the **Test verified** table a minute of your attention. Write down the tests you actually ran. A green CI run is good news, but it is not the same as "I ran these cases and here is what I saw." Reviewers can tell the difference.

PRs are created as drafts by default. When the description looks right and the tests pass, mark it ready for review. A focused PR with a clear description gets reviewed faster and is easier to revert if something goes wrong.

### 4. Review code

There are two skills, one for each side of the conversation.

**If you are reviewing**, run:

```text
/cv-submit-pr-review 124
```

The skill checks the live base and head of the PR, reads the changed tests before the implementation, and maps which crates the change touches. It then looks at correctness, concurrency and lifecycle, wire compatibility, and performance on the data, RPC, and metadata paths. It drafts comments with a clear severity prefix — `Critical:`, `Required:`, or `Optional:` — and a local verdict. Nothing is posted until you confirm.

**If you are the author responding to feedback**, run:

```text
/cv-address-pr-review 124
```

The skill collects every review comment and gives you a table of what it suggests accepting, partially accepting, or declining, with reasons. You approve the table, the skill applies the fixes, pushes them, replies to each comment in English, and resolves the threads that are fixed.

Review is a conversation, not a scorecard. If you disagree with a comment, explain why. The reasoning is recorded for the next person who reads the thread.

## Supporting skills

The four workflows above are the main road. These skills are the side streets that help when the road gets bumpy.

| Skill | What it helps with |
| --- | --- |
| `cv-codegraph` | Builds a local map of symbols and call paths so the agent can answer "where does this happen?" without scanning the whole repository. One-time setup is described in the skill. |
| `cv-tasks-breakdown` | Turns a large feature into dependency-ordered tasks, each landing as one commit with its own tests, and optionally files sub-issues. |
| `cv-csi-test` | Walks through deploying and testing the CSI driver on Kubernetes, including restart, recovery, and volume expansion scenarios. |
| `cv-run-workflow` | Dispatches a GitHub Actions workflow with the right branch and inputs, then watches the run and surfaces failures. |
| `cv-test-report` | Turns a full-chain test run into the standard report format and publishes it to the test reports site. |
| `cv-add-skills` | Explains how to write or update a `cv-*` skill and keep the registry in `AGENTS.md` in sync. |

## Putting it together

Here is what a typical contribution looks like when the skills are in the loop:

1. You spot a bug and run `/cv-create-issue`. After a quick review, issue `#123` is filed.
2. You run `/cv-handle-issue 123`. The agent proposes a plan; you adjust it and approve. It creates the branch, writes the fix and tests, and runs `make format`.
3. You run `/cv-create-pr`. A draft PR appears with a complete description and the tests you verified.
4. A maintainer runs `/cv-submit-pr-review 124`. The review is posted only after they approve the draft comments.
5. You run `/cv-address-pr-review 124`, agree with two comments and decline one with a reason. The fixes are pushed and the threads are resolved.
6. CI passes. The PR is merged.

At every step, a human made the decision. The agent handled the repetitive parts: finding the template, formatting the title, remembering which sections the PR body needs, and keeping track of review comments.

## Ground rules

- **You own the change.** Skills are assistants. Read every diff, run the tests, and be ready to explain the change. Your name is on the commit.
- **Approve deliberately.** Drafts exist for a reason. Check the issue, PR body, or review comment before saying yes.
- **Keep GitHub English.** Issues, PRs, review comments, and skills themselves are written in English so everyone in the community can follow along.
- **CI is the referee.** Formatting, compilation, tests, and the PR title check still decide whether a change can land. Skills do not bypass them.
- **Skills live with the code.** If you want to improve one, follow `cv-add-skills` and keep the registry in `AGENTS.md` up to date.

## Further reading

- [Contributing to Curvine](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md)
- [The `.agents` README](https://github.com/CurvineIO/curvine/blob/main/.agents/README.md)
- [Shared workflow rules](https://github.com/CurvineIO/curvine/blob/main/.agents/rules/workflow.md)
- [All `cv-*` skills](https://github.com/CurvineIO/curvine/tree/main/.agents/skills)

If you only remember one thing, remember this: the skills are there to remove the busywork, not to remove your judgment. Use them, question them, and improve them.
