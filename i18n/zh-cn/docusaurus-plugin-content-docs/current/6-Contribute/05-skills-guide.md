---
sidebar_position: 5
---

# 技能指南

每个项目都有自己的做事习惯：Issue 该套哪个模板、PR 标题怎么写、Review 时先看什么。Curvine 把这些习惯整理成了 **skill**（技能）——一份份简短、易读的操作手册，AI 编程助手可以直接照着做。

所有 skill 都放在 Curvine 仓库的 [`.agents/skills/`](https://github.com/CurvineIO/curvine/tree/main/.agents/skills) 目录下。每个 skill 就是一个文件夹，里面有一个 `SKILL.md`。不需要安装服务，也不需要注册账号；skill 和代码一起做版本管理，会随着项目一起演进。

你可以把 skill 当成检查清单，自己按步骤完成；也可以交给 AI 助手，让它带你走完流程。本文重点介绍第二种方式，并围绕开发者最常做的四件事展开：创建 Issue、解决 Issue、提交 PR、Review 代码。

## Skill 是什么，不是什么

Skill 是指导，不是自动化。它告诉 AI 助手 Curvine 希望这件事怎么做、该运行哪些命令。它不会替你合并代码，不会绕过 CI，也不会替你做决定。

最后一点很重要。按照设计，skill 在任何内容离开你的电脑之前都会停下来：先起草 Issue、提交信息、PR 描述或 Review 评论，等你确认后再执行。发布什么、提交什么，始终由你决定。

## 开始之前

你需要准备：

- 一份 `curvine` 仓库的本地克隆。
- 一个能加载项目 skill 的 AI 编程助手。Claude Code、Cursor、Codex 和 GitHub Copilot 目前都可以。
- 已登录的 [GitHub CLI](https://cli.github.com/)，因为有些 skill 会创建 Issue、推送分支或发布 Review 评论。可以用 `gh auth status` 检查。
- 如果要改 Rust 代码，还需要可用的构建环境，具体见[开发指南](./01-development-guide.md)。

Skill 会通过 AI 助手本来就会读取的目录自动加载：`.claude/skills`、`.cursor/skills` 和 `.github/skills` 都是指向 `.agents/skills` 的软链接，Codex 则直接读取 `.agents/skills`。

如果你的助手支持斜杠命令，直接按名字调用即可：

```text
/cv-create-issue
```

Cursor 会自动发现这些 skill，不需要斜杠命令。如果你不确定某个 skill 具体做什么，打开它的 `SKILL.md` 看看——那份文件就是它的约定。

## 四个常用工作流

### 1. 用 `cv-create-issue` 创建 Issue

当你发现 Bug，或者想提出一个新功能时，可以用它。提示词可以很短：

```text
/cv-create-issue
FUSE 读取 64 MiB 文件时，Worker 重启后会卡住；客户端版本 ...
```

Skill 会先搜索现有的 Issue，避免重复，然后从 `.github/ISSUE_TEMPLATE/` 中选择合适的模板并起草正文。Bug 报告需要复现步骤和环境信息；功能请求还会多出三个部分：**Goal**、**Not Goal** 和 **Test Plan**，让范围在写代码之前就对齐。

你检查草稿、调整措辞并确认后，Issue 才会带着对应标签创建出来。如果它是某个大 Issue 的子任务，skill 会在标题前加 `[SUB]`，并在正文里链接 `Parent: #<number>`。

一个小建议：把真实的日志、版本号和复现步骤贴进去。一个清晰的 Issue，是送给后来修复它的人的一份礼物——很多时候那个人就是未来的你。

### 2. 用 `cv-handle-issue` 解决 Issue

把 Issue 编号或链接交给它：

```text
/cv-handle-issue 123
```

这个流程的前半段是思考，不是敲代码。Skill 会阅读 Issue，整理问题、涉及的模块、风险和测试策略，然后提出一份计划。**在你确认计划之前，它不会写任何代码。** 改计划成本很低，改代码则不然。

确认之后，skill 会创建以 Issue 命名的分支（`fix/123-short-slug` 或 `feat/123-short-slug`），实现约定范围内的改动，补充测试，运行 `make format`，最后交给 `cv-create-pr`。

如果改动预计超过大约 500 行，skill 会转交给 `cv-tasks-breakdown`。后者会把工作拆成有依赖顺序的小任务，每个任务小到可以单独作为一次提交，并可以创建 `[SUB]` 子 Issue 来跟踪。小步前进，始终保持构建和测试通过。

看计划的时候，不妨先代入 Reviewer 的视角。如果觉得范围不对，现在提出来最划算。

### 3. 用 `cv-create-pr` 提交 PR

提交准备好之后，运行：

```text
/cv-create-pr
```

Skill 会运行 `make format`、检查 diff，然后起草 PR：

- **标题：** `<type>(<module>): <description> (#<issueNumber>)`
- **正文：** Summary、Issue Describe / Design、Changes、Test verified、Dependencies

请花一点时间认真填写 **Test verified** 表格，写下你实际运行过的测试。CI 全绿是好消息，但它和“我跑了这些用例，结果如下”不是一回事，Reviewer 能看出区别。

PR 默认以草稿（draft）形式创建。描述确认无误、测试通过后，再标记为可 Review。范围聚焦、描述清楚的 PR，Review 得更快，万一出问题也更容易回滚。

### 4. Review 代码

这里有两个 skill，分别对应 Review 的双方。

**如果你是 Reviewer**，运行：

```text
/cv-submit-pr-review 124
```

Skill 会核对 PR 当前的 base 和 head，先读改动的测试、再读实现，并梳理这次改动涉及哪些 crate。然后它会检查正确性、并发与生命周期、接口兼容性，以及数据、RPC 和元数据路径上的性能影响。评论会带上明确的级别前缀——`Critical:`、`Required:` 或 `Optional:`——并给出本地结论。在你确认之前，不会发布任何内容。

**如果你是作者，需要回应 Review 意见**，运行：

```text
/cv-address-pr-review 124
```

Skill 会收集所有 Review 评论，整理成一张表，列出建议接受、部分接受和拒绝的意见及理由。你确认这张表后，skill 才会应用修改、推送代码、用英文逐条回复，并标记已解决的讨论。

Review 是一场讨论，不是打分。如果你不同意某条意见，把理由说清楚——这些理由会被记录下来，方便后来的人理解当时的决定。

## 配套技能

上面四个是主干流程，下面这些是在路不好走时帮你绕过去的“辅路”。

| Skill | 适用场景 |
| --- | --- |
| `cv-codegraph` | 在本地建立符号和调用路径索引，让 AI 助手不用扫全仓库就能回答“这段逻辑在哪里”。一次性安装步骤见该 skill 本身。 |
| `cv-tasks-breakdown` | 把大型功能拆成有依赖顺序的小任务，每个任务作为一次提交并自带测试，也可以创建子 Issue。 |
| `cv-csi-test` | 指导在 Kubernetes 上部署和测试 CSI 驱动，包括重启、恢复和卷扩容等场景。 |
| `cv-run-workflow` | 用正确的分支和参数触发 GitHub Actions，并跟踪运行结果、定位失败。 |
| `cv-test-report` | 把全链路测试结果整理成标准格式，并发布到测试报告站点。 |
| `cv-add-skills` | 说明如何新增或修改 `cv-*` skill，并同步维护 `AGENTS.md` 中的注册表。 |

## 串起来看一遍

一次典型的贡献，在有 skill 参与时大概是这样：

1. 你发现一个 Bug，运行 `/cv-create-issue`。简单检查后，Issue `#123` 创建完成。
2. 你运行 `/cv-handle-issue 123`。AI 提出计划，你调整并确认；它创建分支、编写修复和测试，并运行 `make format`。
3. 你运行 `/cv-create-pr`，得到一个描述完整、测试记录清楚的草稿 PR。
4. Maintainer 运行 `/cv-submit-pr-review 124`。在 TA 确认草稿评论后，Review 才会发布。
5. 你运行 `/cv-address-pr-review 124`：接受两条意见，拒绝一条并说明理由。修改被推送，讨论被标记为解决。
6. CI 通过，PR 合并。

每一步的决定都由人做出。AI 负责的是那些重复的部分：找模板、排版标题、记住 PR 正文需要哪些章节、跟踪每一条 Review 意见。

## 几条基本规则

- **改动由你负责。** Skill 只是助手。每个 diff 都要自己看，测试要自己跑，并且能够解释这次改动。提交记录上是你的名字。
- **确认之前先看一眼。** 草稿的存在是有原因的。Issue、PR 正文或 Review 评论，确认前都值得检查一遍。
- **GitHub 上统一用英文。** Issue、PR、Review 评论以及 skill 本身都用英文书写，方便社区里的每个人跟进。
- **CI 说了算。** 格式化、编译、测试和 PR 标题检查仍然决定一个改动能否合入，skill 不会绕过它们。
- **Skill 和代码一起维护。** 想改进某个 skill，请遵循 `cv-add-skills`，并同步更新 `AGENTS.md` 中的注册表。

## 延伸阅读

- [Curvine 贡献指南](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md)
- [`.agents` 目录说明](https://github.com/CurvineIO/curvine/blob/main/.agents/README.md)
- [共享工作流规则](https://github.com/CurvineIO/curvine/blob/main/.agents/rules/workflow.md)
- [全部 `cv-*` skill](https://github.com/CurvineIO/curvine/tree/main/.agents/skills)

如果只能记住一句话，那就是：skill 用来减少琐事，而不是替代你的判断。使用它、质疑它、改进它。
