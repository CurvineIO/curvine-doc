---
sidebar_position: 4
description: 配置 Follower 元数据读取，按顺序启用 Worker 报告镜像，并验证回退行为。
---

# Follower 元数据读取

Follower 元数据读取允许客户端将符合条件的元数据查询发送到已追上进度的 Follower Master，从而减轻 Leader 的读取负载。文件数据仍由 Worker 提供，元数据写入仍发送到 Leader。该功能默认关闭。

Master、Worker 和客户端都应使用包含 [Curvine #1854](https://github.com/CurvineIO/curvine/pull/1854) 的构建版本。首先准备一个已运行的多 Master Raft 集群；集群成员和各节点地址的配置见[部署环境设置](/zh-cn/docs/Deploy/Deploy-Curvine-Cluster/Preparation/deployment-setup/)。

:::warning
Follower 读取**不提供线性一致性**。即使设置 `follower_read_max_commit_lag = 0`，新鲜度检查也只依据该 Follower 最近收到的 Leader 提交进度证明，而不是响应发送时 Leader 的准确提交位置。如果业务要求每次读取都能看到最新已提交写入，请保持客户端 Follower 读取关闭。
:::

## 配置示例

下面展示三 Master 集群的目标配置。将 `master-1`、`master-2`、`master-3` 替换为可解析的主机名，并将设置合并到现有 `conf/curvine-cluster.toml` 的相应配置节中。保留各节点自己的主机名、存储路径和其他部署设置。

```toml
[journal]
journal_addrs = [
  { id = 1, hostname = "master-1", port = 8996 },
  { id = 2, hostname = "master-2", port = 8996 },
  { id = 3, hostname = "master-3", port = 8996 },
]

[master]
follower_reads_enabled = true
follower_worker_state_enabled = true
follower_read_max_commit_lag = 0
follower_read_apply_stall_timeout = "30s"

[worker]
follower_reports_enabled = true

[client]
master_addrs = [
  { hostname = "master-1", port = 8995 },
  { hostname = "master-2", port = 8995 },
  { hostname = "master-3", port = 8995 },
]
follower_reads_enabled = true
follower_write_sticky_ms = 5000
```

在所有 Master 上应用 Master 设置，在所有 Worker 上应用 Worker 设置，并在每个 CLI、SDK 或 FUSE 客户端的实际配置中应用客户端设置。`8996` 是 Raft 端口，`8995` 是客户端访问 Master 的 RPC 端口。请按下文顺序逐步启用，不要同时开启所有角色的开关。

### Master 参数

以下参数位于 `[master]` 配置节。

| 参数 | 默认值 | 含义及取值范围 |
| --- | --- | --- |
| `follower_reads_enabled` | `false` | 当新鲜度检查通过时，允许 Follower 处理符合条件的元数据读取。 |
| `follower_worker_state_enabled` | `false` | 在 Follower 上维护被动 Worker 和副本状态。返回块位置的读取需要同时启用此设置和 Worker 报告镜像。 |
| `follower_read_max_commit_lag` | `0` | 元数据应用进度相对于“本地 Raft 提交位置”和“最近证明的 Leader 提交位置”两者较大值所允许落后的最大日志条目数。范围为 `0`–`10000`；非零值明确允许返回更旧的元数据。 |
| `follower_read_apply_stall_timeout` | `"30s"` | 元数据应用或本地复制进度停止推进后，拒绝 Follower 读取的超时。两类停滞分别跟踪。范围为 `"1ms"`–`"10m"`。 |

Follower 还必须完成元数据重放，并且近期收到当前任期 Leader 的有效请求。如果 Leader 请求不包含提交进度证明，Follower 读取会保持不可用，直到后续有效请求提供证明。因此，混合版本升级期间的旧 Leader 可能导致客户端回退到 Leader 读取。

### 客户端参数

以下参数位于 `[client]` 配置节。

| 参数 | 默认值 | 含义及取值范围 |
| --- | --- | --- |
| `follower_reads_enabled` | `false` | 对支持的读取先尝试一个符合条件的 Follower，再使用 Leader。 |
| `follower_write_sticky_ms` | `5000` | 在同一个客户端上下文内，将与近期修改相关的读取保持在 Leader 上。开启 Follower 读取时必须大于 `0`。 |

粘滞时间从修改 RPC 结束后开始计算，包括 RPC 失败或被取消的情况；修改进行期间，相关读取也保持在 Leader 上。匹配范围包括修改路径、后代路径和祖先目录列表。这是同一上下文内共享的有限时间提示，不是跨客户端的“写后读”一致性保证。

### Worker 参数

以下参数位于 `[worker]` 配置节。当 `follower_reports_enabled = true` 时，会校验队列和重试限制。

| 参数 | 默认值 | 含义及取值范围 |
| --- | --- | --- |
| `follower_reports_enabled` | `false` | 向 Follower Master 镜像 Worker 生命周期心跳和块报告。 |
| `follower_report_queue_max_ops` | `256` | 每个 Follower 队列最多保留的块报告操作数。范围为 `1`–`4096`。 |
| `follower_report_queue_max_bytes` | `67108864`（64 MiB） | 每个 Worker 的 Follower 队列和全量重同步清单共享的字节预算。范围为 `1`–`1073741824`（1 GiB）。 |
| `follower_report_max_peer_queues` | `32` | 每个 Worker 最多创建的 Follower 队列数。范围为 `1`–`32`，应覆盖需要副本状态的 Follower Master。 |
| `follower_report_max_concurrency` | `16` | 每个 Worker 同时执行的 Follower RPC 上限。范围为 `1`–`32`；每个对端内部的请求仍保持顺序。 |
| `follower_report_retry_timeout_ms` | `30000` | 单个排队的 Follower 请求的总重试预算。范围为 `1`–`300000` 毫秒。 |
| `follower_report_retry_min_ms` | `100` | 初始重试间隔。必须为正数，且不超过总重试超时和最大重试间隔。 |
| `follower_report_retry_max_ms` | `5000` | 最大重试间隔，也用于重同步退避。不得小于最小间隔，且不得超过 `60000` 毫秒。 |

队列溢出、未纳入队列的对端或发送失败都会要求全量报告重同步。Worker 状态不完整的 Follower 会拒绝依赖块位置的读取，让客户端使用 Leader。

字节预算必须容纳 Worker 的全量块清单、排队消息以及各对端的额外开销。例如，每个块条目占用 48 字节时，64 MiB 在**尚未计入额外开销**前约能容纳 140 万条记录，实际容量取决于构建版本。如果完整清单无法放入预算，Follower 会保持未就绪，客户端持续回退。请根据 Worker 清单规模增大预算，但不要超过配置上限。清单收集在心跳任务之外执行，重同步失败后会退避重试。

## 启用顺序

1. 将 Master、Worker 和客户端升级到包含该功能的版本。升级期间保持 Follower 读取开关关闭。
2. 在所有 Master 上启用 `master.follower_reads_enabled` 和 `master.follower_worker_state_enabled`，按现有部署方式执行滚动重启。先将允许的提交落后条目数保持为 `0`。
3. 启用 `worker.follower_reports_enabled` 并重启 Worker。等待 Start 心跳和完整的全量块报告到达每个候选 Follower。此时仍保持客户端 Follower 读取关闭。
4. 在应用、CLI 或 FUSE 配置中启用 `client.follower_reads_enabled` 并重启客户端。在扩大启用范围前，观察 Follower 读取成功和拒绝指标。

块位置查询和只读文件打开需要 Worker 报告镜像。文件状态、目录列表等纯元数据操作无需完整副本状态，也可以使用已追上进度的 Follower。发生选举后，Follower 会使被动就绪状态失效，并要求新的报告，然后才能再次处理依赖块位置的读取。

## 使用示例

开启功能后，无需使用特殊的文件系统命令。将客户端设置保存到 `conf/curvine-follower.toml`，并保留原有配置的其他部分。以下示例假设 Curvine 原生命名空间中已存在完成复制的文件 `/datasets/example.txt`：

```bash
cv --conf conf/curvine-follower.toml fs stat /datasets/example.txt
cv --conf conf/curvine-follower.toml fs ls /datasets --cache-only
cv --conf conf/curvine-follower.toml fs cat /datasets/example.txt
```

文件状态和目录列表操作可以路由到 Follower。读取文件时，元数据和块位置可以来自已就绪的 Follower，文件字节仍从 Worker 读取。`--cache-only` 将目录查询限制在 Curvine 缓存命名空间内，不再同时查询已挂载的 UFS。

即使使用相同的客户端配置，写入仍通过 Leader：

```bash
cv --conf conf/curvine-follower.toml fs mkdir -p /follower-demo
```

每次 CLI 调用都会创建独立的客户端上下文。不同 CLI 命令不共享粘滞时间，因此不能用跨命令的“写入后立即读取”来证明写后读一致性。客户端自动选择 Follower；命令成功并不能单独证明由 Follower 提供了响应，请使用下面的指标验证路由。

## 支持的读取与回退

| 操作 | 路由行为 |
| --- | --- |
| `Exists`、`FileStatus`、`ListStatus`、`ListOptions`、`GetMountTable`、`GetMountInfo` | 新鲜度检查通过时可使用 Follower；包含 glob 模式的目录列表仍通过 Leader。 |
| `GetBlockLocations`、有效只读标志的 `OpenFile` | 还要求返回的每个块具有就绪且存活的 Worker 位置。 |
| 写入、可写文件打开、回收站操作、不支持或格式错误的请求 | 仅使用 Leader。 |

客户端最多尝试一个 Follower。连接和请求的总耗时上限为“一秒”和“`client.rpc_timeout_ms` 剩余时间的一半”两者中的较小值。可重试的拒绝或传输错误会触发一次 Leader 路由回退，使用剩余超时预算。失败的对端进入五秒冷却期，该状态由客户端克隆共享。文件不存在、权限不足等终止性错误会直接返回，不会重试 Leader。

## 验证与排查

采集各个 Follower 的指标。独立部署的 Master 默认指标端口为 `9010`：

```bash
curl -fsS http://master-2:9010/metrics \
  | grep -E 'master_follower_read_(accepted|refused)_total'
```

如果实际端口不同，请使用配置中的 `master.web_port`。指标采集方式见[监控指标](/zh-cn/docs/User-Manuals/Operations/monitoring/)。

- `master_follower_read_accepted_total{rpc_code=...}` 统计 Follower 实际处理的读取。可以比较执行上述读取命令前后的计数。
- `master_follower_read_refused_total{rpc_code=...,reason=...}` 统计 Master 拒绝的读取，不包括客户端直接跳过 Follower 的决策。

| 拒绝原因 | 排查方向 |
| --- | --- |
| `replay_not_ready`、`commit_lag` | 检查元数据重放和 Raft 复制进度。除非业务接受旧元数据，否则保持允许落后条目数为 `0`。 |
| `no_current_term_contact`、`stale_leader_contact`、`leader_commit_unknown` | 检查 Master 之间的连通性、选举状态，以及 Leader 是否支持提交进度证明。 |
| `apply_stalled`、`replication_stalled` | 元数据应用或复制没有推进，检查 Master 日志以及存储、网络状态。 |
| `block_locations_not_ready` | 检查 Worker 镜像、当前 Worker 会话、全量报告是否完成、队列限制及重同步清单预算。 |

正常回退仍可返回成功的业务结果，因此应检查实际处理计数，而不能仅根据命令是否成功判断。

## 关闭 Follower 读取

首先设置 `client.follower_reads_enabled = false` 并重启客户端，恢复 Leader 路由。如不再需要，再关闭 Worker 镜像和两个 Master 开关，并按现有重启流程应用各角色的配置。
