# 发布说明与已知不兼容版本

本页汇总 Curvine 每次发布使用的发布说明模板，以及已知与其他 Curvine 组件不兼容的发布版本清单。每当有版本加入 `master.compatibility.blocked_versions` 或引入新的协议版本时，请同步更新本页。

## 发布说明模板

复制下面的模板，填入版本号和日期，随发布公告一起发布。**兼容性**表必须与[版本管理与兼容性](04-version-management.md)中该版本的兼容矩阵一致。

```markdown
## Curvine v<VERSION> — <RELEASE_DATE>

### Highlights

_简要描述本次发布最重要的变更（2-3 句）。_

### Upgrade Notes

- **兼容性：** 升级前请阅读版本管理与兼容性。默认模式为 `diagnose`（宽松），
  没有显式配置时旧组件不会被拒绝。
- **破坏性变更：** _列出破坏性变更、配置迁移步骤或弃用项。_
- **最低版本：** _列出更新后的最低版本要求。_

### New Features

- _功能 1：简短描述。([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_
- _功能 2：简短描述。([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_

### Bug Fixes

- _修复 1：简短描述。([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_
- _修复 2：简短描述。([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_

### Compatibility

| 组件 | 最低版本 | 最高版本 | 协议 |
|---|---|---|---|
| master | <MIN> | <MAX> | <PROTO> |
| worker | <MIN> | <MAX> | <PROTO> |
| client | <MIN> | <MAX> | <PROTO> |
| FUSE | <MIN> | <MAX> | <PROTO> |
| CLI | <MIN> | <MAX> | <PROTO> |
| CSI | <MIN> | <MAX> | <PROTO> |

### Known Issues

- _列出已知问题、版本特定的不兼容或限制。_

### Assets

- **二进制包（Rocky Linux 9, x86_64）：** `curvine-<VERSION>-linux-amd64.tar.gz`
- **Docker 镜像：** `ghcr.io/curvineio/curvine:<VERSION>`
- **Helm Chart：** `curvine-<VERSION>.tgz`

### Release Process

1. 校验发布标签：
   `bash build/validate-release-version.sh v<VERSION>`
2. 构建：`BUILD_VERSION=<VERSION> make dist`
3. 校验注入的产物版本。
4. 推送标签触发发布流水线。

---

**完整 Changelog：** https://github.com/CurvineIO/curvine/compare/v<PREVIOUS>...v<VERSION>
```

## 已知不兼容版本

当某些版本存在关键缺陷或协议级不兼容，导致在混合版本集群中不安全时，会被加入本清单。master `compatibility` 配置中的 `blocked_versions` 是这些条目的运维强制执行手段：被列为 blocked 的版本**无论模式如何都总是被拒绝**（紧急兜底）。

| 版本 | 组件 | 原因 | 引入版本 | 解决方案 |
|---|---|---|---|---|
| 0.2.5 | worker | batch-write 路径存在严重数据损坏缺陷 | 0.2.5 | 升级到 0.2.6+ 或 0.3.0+ |

### 版本特定不兼容

**0.3.x 旧版 worker / client 对接 0.4.x master。** 运行 0.3.x（或更早）的 worker 和 client 不上报结构化 `component_info`。master 将其识别为旧版 peer：`diagnose` 模式（默认）下允许并告警，仅在 `enforce` 模式下拒绝。不会发生数据丢失或协议错误，master 只是无法校验它们的协议版本、发布版本或能力。

**预发布 vs 发布版本边界。** 预发布版本排在正式版本之前（`0.4.0-alpha < 0.4.0`）。如果配置了 `min_worker_version = "0.4.0"`，预发布 worker 会因低于边界而被拒绝。如需允许预发布版本，请相应调低最低版本。

## 上报新的不兼容

1. 打开 GitHub issue 并打上 **compatibility** 标签。
2. 附带：master 版本、worker/client 版本、各组件的协议版本、完整的兼容性错误或告警，以及复现步骤。
3. Curvine 团队评估后，要么将版本加入 `blocked_versions`，要么在本页记录该不兼容。