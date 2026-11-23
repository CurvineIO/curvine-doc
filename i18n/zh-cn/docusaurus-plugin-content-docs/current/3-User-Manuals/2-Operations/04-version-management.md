# 版本管理与兼容性

本章介绍 Curvine 各组件的版本自描述机制，以及如何运维一个组件版本不完全一致的集群。自 0.4.x 起，每个二进制都会输出结构化版本信息，服务端会广播兼容性契约，master 以默认 `diagnose`（宽松）策略对 peer 进行评估。

## 版本格式

所有 Curvine 组件使用统一的版本格式：

```
<major>.<minor>.<patch>[-<预发布>][+<构建号>]
```

示例：`0.4.0`、`0.4.0-alpha`、`0.5.0-rc.1+build.1234`

预发布版本按 SemVer 规则排在正式版本之前：`0.4.0-alpha < 0.4.0-beta < 0.4.0`。

## 协议版本

**协议版本**是用于约束组件之间线上兼容性的单调递增整数，**不等同于**发布版本。

| 协议版本 | Curvine 发布版本 | 说明 |
|---|---|---|
| 1 | 0.4.x | 初始结构化协议版本 |

组件只接受协议版本落在 `[min_protocol_version, protocol_version]` 范围内的 peer。

## 查看组件版本

所有二进制都支持 `--version-json` 输出结构化版本 JSON：

```bash
cv --version-json
bin/curvine-master.sh --version-json
bin/curvine-worker.sh --version-json
bin/curvine-fuse.sh --version-json
```

启动脚本会把该参数传给二进制。Master、Worker、MDS 和 Transfer 都运行
`lib/curvine-server`，因此 `lib/curvine-server --service master --version-json`
与 Master 启动脚本的输出相同。

输出示例：

```json
{
  "component": "worker",
  "release_version": "0.4.0-alpha",
  "git_commit": "24c848719b5b4fea74519d91cbe462bb49761b36",
  "git_tag": "v0.4.0-alpha",
  "git_branch": "main",
  "protocol_version": 1,
  "min_protocol_version": 1,
  "capabilities": []
}
```

字段含义：

- `component` — 组件名称（`master`、`worker`、`mds`、`data-transfer`、`client`、`fuse`、`cli`、`csi`；`curvine-server` 未指定 `--service` 时为 `server`）。
- `release_version` — Cargo/包版本。
- `git_commit` / `git_tag` / `git_branch` — 精确的源码来源信息。
- `protocol_version` / `min_protocol_version` — 线上协议范围。
- `capabilities` — 特性级协商令牌（当前构建中为空，见下文“能力”一节）。

## 查看 Worker 版本统计

CLI 可以汇总所有在线 worker 的版本分布，快速判断集群是运行同构版本还是包含新旧混合版本：

```bash
cv node --versions
```

输出示例：

```text
Version Distribution:
----------------------------------------
  0.4.0-alpha              : 3 worker(s)
  0.4.0-beta               : 5 worker(s)
  legacy (0.3.0-test)      : 1 worker(s)
----------------------------------------
  total                    : 9 worker(s)
```

上报结构化 `component_info` 的 worker 按其 `release_version` 统计；仅上报旧版 `software_version` 字符串的 worker 按 `legacy (<版本>)` 统计；完全没有版本数据的 worker 归入 `legacy (no version)`。

## 组件间兼容性

master 会对每个 worker 心跳和客户端握手执行兼容性评估。默认行为是**宽松**的：在未显式配置的情况下，master 记录警告并允许请求，因此旧组件不会仅仅因为它们不包含结构化版本协议而被拒绝。

### Master ↔ Worker

| Master | Worker | 协议 | 默认行为 |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ 兼容 |
| 0.4.x | 0.3.x（旧版，无 `component_info`） | 无 | ⚠️ `diagnose` 下告警；仅 `enforce` 下拒绝 |
| 0.4.x | 低于 `min_worker_version` | 无 | ⚠️ `diagnose` 下告警；仅 `enforce` 下拒绝 |

### Master ↔ Client（含 FUSE / CLI / CSI）

| Master | Client | 协议 | 默认行为 |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ 兼容 |
| 0.4.x | 0.3.x（旧版） | 无 | ⚠️ `diagnose` 下告警；仅 `enforce` 下拒绝 |

### Worker ↔ Client（数据面）

| Worker | Client | 协议 | 默认行为 |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ 兼容 |
| 0.4.x | 0.3.x（旧版） | 无 | ⚠️ `diagnose` 下告警；仅 `enforce` 下拒绝 |

## 强制策略

兼容性策略在 master 配置文件中配置：

```toml
[master.compatibility]
# "diagnose"（默认）：不兼容仅告警，允许请求。
# "enforce"：不兼容直接拒绝并返回明确错误。
mode = "diagnose"

# worker 最低发布版本（留空表示不强制）。
min_worker_version = "0.2.0"

# client 最低发布版本（留空表示不强制）。
min_client_version = "0.1.5"

# 无论何种模式都显式拒绝的版本（紧急兜底）。
blocked_versions = ["0.2.5"]
```

- **`mode = "diagnose"`（默认）：** 不兼容的 peer 被允许，master 记录告警，内容包括 peer、其版本和期望的边界。这是安全默认值，不会破坏已有的混合版本集群。
- **`mode = "enforce"`：** 不兼容的 peer 被拒绝，错误信息包含实际 peer 版本和升级建议。
- **`blocked_versions`：** 列出的版本无论模式如何都**总是被拒绝**。这是针对已知问题版本的紧急兜底手段（见发布说明页的已知不兼容清单）。

## 能力（Capabilities）

`ComponentVersion` 带有一个能力令牌列表，用于让某个特性只在**双方**都声明时启用；这样新发布中引入的能力会保持禁用，直到整个数据链路都升级。

目前没有任何组件声明能力：所有组件在 `--version-json` 和握手中上报的 `capabilities` 都为空，也没有特性依赖能力令牌。请以上文的发布版本和协议版本为准。

## 可观测性

master 在 Prometheus 端点（`http://<master>:9010/metrics`）暴露兼容性指标，完整指标表见[监控指标](03-monitoring.md)。

| 指标 | 类型 | 标签 | 说明 |
|---|---|---|---|
| `compat_worker_verdict` | Gauge | `worker_id`、`verdict` | 每个 worker 当前兼容性结论，为 1 |
| `compat_client_verdict` | Gauge | `release_version`、`verdict` | 最近一小时内按版本和结论统计的 client 数量 |
| `compat_client_verdict_total` | Counter | `verdict` | client 地址变为某个结论的累计次数 |
| `compat_enforce_rejected_total` | Counter | `component`、`verdict` | enforce 模式下累计拒绝次数 |

`verdict` 取值：`compatible`、`missing_info`、`blocked`、`protocol_mismatch`、`version_too_old`、`version_unknown`。

## 发布说明与已知不兼容

每个发布都会附带包含该版本兼容性对照表的发布说明。已知不兼容清单与发布说明模板在发布说明页维护；每当有版本加入 `blocked_versions` 或引入新的协议版本时，请同步更新该页的兼容性对照表。