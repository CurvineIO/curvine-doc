# 配置参考

本页描述当前 `main` 分支的配置布局，内容依据 `crates/common/curvine-config/src/*.rs` 中的实际配置结构体与示例文件 `etc/curvine-cluster.toml` 整理。

:::tip
运行时真正的配置来源是 `conf/curvine-cluster.toml`。本页是配置段落与关键字段的索引；完整字段列表请直接查看 `crates/common/curvine-config/src/` 下对应的结构体。
:::

## 配置来源

Curvine 常见的配置输入包括：

- `conf/curvine-cluster.toml`：主配置文件
- `conf/curvine-env.sh`：`bin/` 脚本使用的环境初始化
- `conf/curvine-site.xml`：Hadoop / Java 客户端配置

关键环境变量覆盖项：

| 变量 | 作用 |
| --- | --- |
| `CURVINE_CONF_FILE` | 覆盖 `curvine-cluster.toml` 路径 |
| `CURVINE_MASTER_HOSTNAME` | 覆盖 Master 实际 hostname |
| `CURVINE_MDS_HOSTNAME` | 覆盖 MDS 实际 hostname |
| `CURVINE_WORKER_HOSTNAME` | 覆盖 Worker 实际 hostname |
| `CURVINE_CLIENT_HOSTNAME` | 覆盖客户端 hostname，用于本地性判断 |
| `CURVINE_TRANSFER_HOSTNAME` | 覆盖 Transfer 服务 hostname |

### 配置加载流程

```text
文件（TOML）-> 环境变量白名单 -> 反序列化 -> 空白字符规范化
            -> 校验 -> discovery.init -> 推导 client.master_addrs
```

- 未知配置键会由 `validation::warn_unknown_keys` 输出警告，但不会导致启动失败。拼错的键会静默保留默认值，因此请始终检查启动日志中的警告。
- `client.master_addrs` 可以省略。为空时，Curvine 使用 `master.rpc_port` 从 `journal.journal_addrs` 推导；如果 `journal_addrs` 也为空，则使用 `master.hostname:master.rpc_port`。
- 独立 Transfer 服务使用简化加载流程（`ClusterConf::from_transfer`），只校验 client 与 transfer 段落。

### `net_interface`

当 `net_interface` 非空（例如 `"eth0"`）时，Curvine 会解析该网卡的第一个 IPv4 地址，并将其应用到 `master`、`mds`、`journal`、`worker`、`client` 和 `transfer` 的 hostname。设置该字段后，`CURVINE_*_HOSTNAME` 环境变量会被忽略。

`net_interface` 只填充**本节点自身**的 hostname。集群成员列表（`journal.journal_addrs` 与 `client.master_addrs`）仍必须显式填写，且每个节点的条目必须使用其网卡实际解析出的 IPv4。否则节点无法在 Raft 组中定位自己，启动时会给出明确错误。

## 当前配置布局

当前 `ClusterConf` 的主要段落如下：

| 段落 | 作用 |
| --- | --- |
| 顶层字段 | `format_master`、`format_worker`、`testing`、`cluster_id`、`net_interface` |
| `[master]` | Master RPC / Web、元数据、TTL、配额、复制、锁 |
| `[mds]` | 可选的独立元数据服务（FoundationDB 或内存 KV） |
| `[journal]` | Raft / journal 配置 |
| `[worker]` | Worker RPC、数据目录、复制与数据路径执行参数 |
| `[client]` | 客户端默认值、重试、读写缓冲区、统一文件系统行为 |
| `[fuse]` | FUSE 挂载与缓存参数 |
| `[log]` | client / fuse 共用日志 |
| `[job]` | 旧版 Master 侧 load 任务生命周期与并发控制 |
| `[transfer]` | 独立 Load / Export 服务、状态存储和客户端路由 |
| `[cli]` | CLI 日志配置 |
| `[discovery]` | 基于 etcd 的服务发现（默认关闭） |
| `[fault_injection]` | 仅测试使用的故障 HTTP 控制面 |
| `[master.compatibility]`、`[worker.compatibility]` | 版本兼容策略 |

:::warning
当前代码中已不存在 `[s3_gateway]` 段落和 `worker.enable_s3_gateway`。S3 兼容网关不属于当前服务端。请从旧配置中删除这些键；即使保留也只会被忽略并产生警告。
:::

## 顶层字段

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `format_master` | `true` | 启动时格式化 Master 元数据存储 |
| `format_worker` | `true` | 启动时格式化 Worker 数据存储 |
| `testing` | `false` | 仅测试模式；数据不会正常流动 |
| `cluster_id` | `curvine` | 集群标识，用于存储路径与服务命名 |
| `net_interface` | 空 | 用于解析本节点 IPv4 的网卡名 |

`format_master` 会删除 RocksDB 元数据，`format_worker` 会删除 Worker 数据目录。已有生产集群必须将两者设为 `false`；仓库自带的 `etc/curvine-cluster.toml` 已经如此配置。

## `[master]`

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `hostname` | `localhost` | Master hostname；可被 `net_interface` 或 `CURVINE_MASTER_HOSTNAME` 覆盖 |
| `rpc_port` | `8995` | Master RPC 端口 |
| `web_port` | `9001` | Master Web UI / REST 端口 |
| `io_threads` | `32` | Master RPC I/O 线程数 |
| `worker_threads` | `max(32, 2 × CPU)` | Master RPC worker 线程数 |
| `actor_threads` | `4` | Actor 运行时线程数 |
| `io_timeout` | `10m` | 网络读写超时 |
| `io_close_idle` | `true` | 关闭空闲的 Master RPC 连接 |
| `meta_request_concurrent` | `true` | 在单个连接上并发处理元数据请求 |
| `meta_dir` | `<cwd>/fs-meta` | RocksDB 元数据目录 |
| `min_block_size` | `1MB` | 最小 block 大小 |
| `max_block_size` | `100GB` | 最大 block 大小 |
| `min_replication` | `1` | 最小副本数 |
| `max_replication` | `100` | 最大副本数 |
| `max_path_len` | `8000` | 最大路径长度 |
| `max_path_depth` | `1000` | 最大路径深度 |
| `retry_cache_enable` | `true` | 启用文件系统请求重试缓存 |
| `retry_cache_size` | `100000` | 重试缓存容量 |
| `retry_cache_ttl` | `10m` | 重试缓存 TTL |
| `block_report_limit` | `100000` | 单次 block report 的最大 block 数 |
| `worker_policy` | `local` | Worker 选择策略：`local`、`robin`、`random`、`load_based`、`weighted` |
| `executor_threads` | `10` | Master 执行器线程数 |
| `executor_channel_size` | `1000` | Master 执行器队列大小 |
| `heartbeat_interval` | `3s` | Worker 心跳间隔 |
| `worker_check_interval` | `10s` | Worker 状态检查间隔 |
| `worker_blacklist_interval` | `30s` | 不健康 Worker 被拉黑前的等待时间 |
| `worker_lost_interval` | `10m` | Worker 判定丢失时间 |
| `audit_logging_enabled` | `true` | 启用审计日志 |
| `block_replication_enabled` | `false` | 启用 block 复制管理 |
| `block_replication_concurrency_limit` | `1000` | 复制任务并发上限 |
| `block_replication_retry_interval` | `5s` | 复制重试间隔 |
| `block_replication_submit_timeout` | `30s` | 源 Worker 接受复制任务的截止时间 |
| `block_replication_job_timeout` | `30m` | 已提交复制任务上报结果的截止时间 |
| `ttl_checker_retry_attempts` | `3` | TTL 检查重试次数 |
| `ttl_checker_interval` | `1h` | TTL 扫描周期 |
| `ttl_bucket_interval` | `1h` | TTL 分桶周期 |
| `ttl_max_retry_duration` | `10m` | TTL 最大重试时长 |
| `ttl_retry_interval` | `1s` | TTL 重试间隔 |
| `enable_quota_eviction` | `false` | 启用 quota 驱动逐出 |
| `quota_eviction_mode` | `free` | 逐出模式 |
| `quota_eviction_policy` | `lru` | 逐出策略 |
| `quota_eviction_high_rate` | `0.8` | 高水位 |
| `quota_eviction_low_rate` | `0.6` | 低水位 |
| `quota_eviction_scan_page` | `2` | 扫描页数 |
| `quota_eviction_dry_run` | `false` | 只报告可逐出对象，不实际删除 |
| `quota_eviction_capacity` | `5000000` | 逐出扫描容量（条目数） |
| `lock_expire_time` | `5m` | 过期文件锁回收时间 |
| `buffer_size` | `128KB` | 内部缓冲区大小 |
| `conn_limit` | `8` | 单连接在途请求上限，必须 > 0 |
| `global_limit` | `4096` | 全局在途请求上限，必须 > 0 |

`worker_policy = "local"` 会为第一个副本优先选择本地 Worker，其余副本通过 weighted 策略分配；`weighted` 按 `worker.weight` 分配。

`[master.rocksdb]` 控制元数据 RocksDB 行为，默认值来自 `MasterConf::rocksdb_default()`（4 KB block、关闭 WAL、启用 bloom filter、缓存并 pin index/filter block）。

`[master.compatibility]` 见下文“版本兼容策略”。

## `[mds]`

MDS 是可选的独立元数据服务，通过 `curvine-server --service mds` 启动，默认关闭。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 启用 MDS 服务 |
| `hostname` | `localhost` | MDS hostname |
| `rpc_port` | `8998` | MDS RPC 端口 |
| `web_port` | `9004` | MDS Web / 健康检查端口 |
| `io_threads` | `4` | MDS RPC I/O 线程数 |
| `worker_threads` | `8` | MDS RPC worker 线程数 |
| `kv_backend` | `fdb` | KV 后端：`fdb` 或 `memory` |
| `fdb_cluster_file` | `/etc/foundationdb/fdb.cluster` | FoundationDB cluster file；`kv_backend = "fdb"` 时必填 |
| `fdb_txn_timeout_ms` | `5000` | FoundationDB 单事务超时 |
| `log` | `mds.log` | MDS 日志配置 |

`kv_backend = "memory"` 仅用于测试，进程退出后会丢失全部元数据。`fdb_txn_timeout_ms` 决定操作在 FoundationDB 不可达时等待多久后快速失败；除非有明确原因，否则保持默认值。

## `[journal]`

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enable` | `true` | 启用 Raft journal |
| `group_name` | `raft-group` | Raft 组名 |
| `hostname` | `localhost` | 本地 Raft hostname |
| `rpc_port` | `8996` | Raft RPC 端口 |
| `io_threads` | `8` | Raft RPC I/O 线程数 |
| `worker_threads` | `8` | Raft RPC worker 线程数 |
| `message_size` | `200` | Raft RPC message size |
| `journal_addrs` | `[{id=1, hostname="localhost", port=8996}]` | Raft 节点列表 |
| `journal_dir` | `testing/journal-<random>` | Journal / Raft 日志目录 |
| `writer_channel_size` | `0` | Journal writer 队列大小；`0` 表示无界 |
| `writer_flush_batch_size` | `1000` | Journal flush batch 大小 |
| `writer_flush_batch_ms` | `10` | Journal flush 周期 |
| `snapshot_interval` | `6h` | Follower 触发 snapshot 的周期 |
| `snapshot_min_interval` | `10m` | 两次 snapshot 的最小间隔；`0` 关闭限制 |
| `leader_create_snapshot` | 未设置 | Leader 是否创建 snapshot；未设置表示仅单节点组创建 |
| `snapshot_entries` | `1000000` | 两次 snapshot 之间的 entry 数 |
| `snapshot_read_chunk_size` | `1MB` | Snapshot 读取 chunk 大小 |
| `conn_retry_max_duration_ms` | `0` | 连接重试最大时长 |
| `conn_retry_min_sleep_ms` | `10000` | 连接重试最小休眠 |
| `conn_retry_max_sleep_ms` | `10000` | 连接重试最大休眠 |
| `rpc_close_idle` | `false` | 关闭空闲 Raft RPC 连接 |
| `rpc_retry_max_duration_ms` | `60000` | RPC 重试最大时长 |
| `rpc_retry_min_sleep_ms` | `20000` | RPC 重试最小休眠 |
| `rpc_retry_max_sleep_ms` | `20000` | RPC 重试最大休眠 |
| `conn_timeout_ms` | `30000` | 连接超时 |
| `io_timeout_ms` | `60000` | RPC 读写超时 |
| `conn_size` | `1` | 每个 peer 的共享连接数 |
| `raft_tick_interval_ms` | `1000` | Raft tick 周期 |
| `raft_election_tick` | `10` | 选举超时（tick 数） |
| `raft_heartbeat_tick` | `3` | 心跳间隔（tick 数） |
| `raft_min_election_ticks` | `10` | Raft 随机选举下界 |
| `raft_max_election_ticks` | `30` | Raft 随机选举上界 |
| `raft_check_quorum` | `true` | 启用 quorum 检查 |
| `raft_max_size_per_msg` | `1MB` | 单条消息最大大小 |
| `raft_max_inflight_msgs` | `256` | 最大在途消息数 |
| `raft_max_committed_size_per_ready` | `16MB` | 单次 ready 的最大已提交大小 |
| `raft_batch_size` | `8` | Batch append 大小 |
| `raft_retry_cache_size` | `100000` | Raft 重试缓存容量 |
| `raft_retry_cache_ttl` | `10m` | Raft 重试缓存 TTL |
| `retain_checkpoint_num` | `3` | 保留 checkpoint 数；`0` 会被拒绝 |
| `ignore_reply_error` | `false` | 跳过无法重放的 journal batch，而不是失败 |
| `max_retry_num` | `1000` | 最大重放重试次数 |
| `skip_failed_ufs_replay_after_retry` | `true` | 重试后推进 UFS 重放水位；元数据重放永不跳过 |
| `scan_batch_size` | `1000` | Journal 扫描 batch 大小 |
| `retry_interval_secs` | `10` | 重放重试间隔 |
| `ufs_copy_timeout` | `20m` | 数据复制到 UFS 的超时 |
| `recover_from_peers` | 未设置 | 显式指定需要从健康 peer 重建的单个丢失 HA 成员的 Raft ID |

要点：

- `journal_addrs` 必须列出 Raft 节点，且本地实际 hostname 必须匹配其中一项（或 `net_interface` 解析出的 IPv4 必须匹配）。否则启动失败。
- `retain_checkpoint_num` 同时决定保留的日志窗口（`retain_checkpoint_num × snapshot_entries` 条 entry）。调大会增加 journal 磁盘占用。
- `leader_create_snapshot` 默认只为单节点组创建 snapshot。多节点组未设置该键时，Leader 侧没有日志压缩路径，并且每隔几分钟输出一次错误日志；生产 HA 集群应显式设置 `leader_create_snapshot = true`。
- `ignore_reply_error = true` 可能使 Master 与其余节点永久分叉，只应在灾难恢复时使用，不能作为常规配置。
- `recover_from_peers` 通常只用于运维人员主动重建“日志非空但已陈旧”的成员。被清空的成员在集群健康时会自动进入隔离恢复流程。

## `[worker]`

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `hostname` | `localhost` | Worker hostname；可被 `net_interface` 或 `CURVINE_WORKER_HOSTNAME` 覆盖 |
| `weight` | `1` | `weighted` 策略下的相对分配权重；`0` 表示不再接收新分配 |
| `rpc_port` | `8997` | Worker RPC 端口 |
| `web_port` | `9002` | Worker Web / 指标端口 |
| `dir_reserved` | `0` | 每个数据目录固定预留的空闲空间 |
| `free_ratio` | `0.0` | 按设备比例设置的严格空闲下限（`[0.0, 1.0)`）；`0` 关闭 |
| `data_dir` | `[]` | Worker 数据目录列表 |
| `io_slow_threshold` | `300ms` | 慢 I/O 阈值 |
| `io_threads` | `32` | Worker RPC I/O 线程数 |
| `worker_threads` | `max(32, 2 × CPU)` | Worker RPC worker 线程数 |
| `io_timeout` | `10m` | Worker 网络超时 |
| `io_close_idle` | `false` | 关闭空闲 Worker RPC 连接 |
| `scheduler_threads` | `2` | 调度线程数 |
| `executor_threads` | `10` | 后台执行线程数 |
| `executor_channel_size` | `1000` | 后台执行队列大小 |
| `enable_splice` | `false` | 启用 splice 优化 |
| `enable_send_file` | `true` | 启用 sendfile 优化 |
| `pipe_buf_size` | `64KB` | Pipe buffer 大小 |
| `pipe_pool_init_cap` | `0` | Pipe pool 初始容量 |
| `pipe_pool_max_cap` | `2000` | Pipe pool 最大容量 |
| `pipe_pool_idle_time` | `0` | Pipe 空闲回收时间 |
| `block_replication_concurrency_limit` | `100` | 复制任务并发上限 |
| `block_replication_chunk_size` | `1MB` | 复制 chunk 大小 |
| `spdk_disk` | 关闭 | SPDK NVMe-oF/RDMA 磁盘配置 |
| `compatibility` | diagnose | 数据面 peer 的版本兼容策略 |

`data_dir` 支持三种写法：

```toml
data_dir = [
  "[SSD]/data/data1",          # 指定存储类型，容量不设限
  "[HDD:500GB]/data/data2",    # 指定存储类型与容量
  "/data/data3"                # 默认为 DISK，容量不设限
]
```

存储类型包括 `SSD`、`HDD`、`DISK`、`MEM`。Worker 会在每个路径下追加 `cluster_id`，因此实际数据目录为 `<path>/<cluster_id>`。

`dir_reserved` 是固定字节预留；`free_ratio` 按物理设备比例预留，并且会考虑同盘其他应用占用的空间。两者都会在写入准入时作用于新 block 和 FileLayout 重写 staging 副本。

`[worker.spdk_disk]` 仅在启用 SPDK 的服务端构建中有效（`build.sh --spdk` 或 `--spdk-rdma`），包含 `enabled`、`app_name`、`reactor_mask`、`qpair_acquire_timeout`，以及 `targets` 数组（`trtype`、`adrfam`、`traddr`、`trsvcid`、`subnqn`）。

## `[client]`

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `master_addrs` | `[]` | Master RPC 地址；为空时自动推导 |
| `hostname` | `localhost` | 客户端 hostname；可被 `net_interface` 或 `CURVINE_CLIENT_HOSTNAME` 覆盖 |
| `io_threads` | `16` | 客户端 RPC I/O 线程数 |
| `worker_threads` | `max(16, 2 × CPU)` | 客户端 RPC worker 线程数 |
| `replicas` | `1` | 默认副本数 |
| `block_size` | `128MB` | 默认 block 大小 |
| `write_chunk_size` | `128KB` | 写 chunk 大小 |
| `write_chunk_num` | `8` | 单 pipeline 写 chunk 数 |
| `read_chunk_size` | `128KB` | 读 chunk 大小 |
| `read_chunk_num` | `8` | 单 pipeline 读 chunk 数 |
| `read_parallel` | `1` | 基础读并发 |
| `read_slice_size` | `0` | 读切片大小；`0` 表示 `read_chunk_size × read_chunk_num` |
| `max_cache_block_handles` | `10` | block handle 缓存上限 |
| `short_circuit` | `true` | 启用 short-circuit 读 |
| `storage_type` | `disk` | 默认存储类型 |
| `ttl_ms` | `0` | 默认 TTL |
| `ttl_action` | `none` | 默认 TTL 动作 |
| `auto_cache_enabled` | `false` | 对 UFS 读取自动提交缓存请求 |
| `auto_cache_ttl` | `7d` | 自动缓存条目的 TTL |
| `conn_retry_max_duration_ms` | `60000` | 连接重试最大时长 |
| `conn_retry_min_sleep_ms` | `100` | 连接重试最小休眠 |
| `conn_retry_max_sleep_ms` | `2000` | 连接重试最大休眠 |
| `rpc_retry_max_duration_ms` | `120000` | RPC 重试最大时长 |
| `rpc_retry_min_sleep_ms` | `100` | RPC 重试最小休眠 |
| `rpc_retry_max_sleep_ms` | `10000` | RPC 重试最大休眠 |
| `rpc_close_idle` | `true` | 关闭空闲 RPC 连接 |
| `conn_timeout_ms` | `30000` | 连接超时 |
| `rpc_timeout_ms` | `120000` | RPC 超时 |
| `data_timeout_ms` | `120000` | 数据传输超时 |
| `pipeline_timeout_ms` | `120000` | Pipeline 超时 |
| `master_conn_pool_size` | `1` | 每个 Master 的连接数 |
| `enable_read_ahead` | `true` | 启用预读 |
| `read_ahead_len` | `0` | 预读长度；`0` 表示 `read_chunk_size × read_chunk_num` |
| `drop_cache_len` | `1MB` | 读后丢弃 page cache 的数据长度阈值 |
| `failed_worker_ttl_ms` | `600000` | 失败 Worker 的拉黑时长 |
| `enable_unified_fs` | `true` | 启用统一文件系统视图 |
| `enable_rust_read_ufs` | `true` | cache miss 时允许直接读 UFS |
| `audit_logging_enabled` | `true` | 输出客户端审计日志 |
| `mount_update_ttl_ms` | `10000` | Mount 元数据刷新周期 |
| `umask` | `022` | 文件创建 umask（八进制） |
| `metric_report_enable` | `true` | 上报客户端指标 |
| `clean_task_interval_ms` | `60000` | 清理任务周期 |
| `close_timeout_secs` | `5` | 关闭超时 |
| `sync_check_interval_min_ms` | `100` | UFS 同步轮询最小间隔 |
| `sync_check_interval_max_ms` | `1000` | UFS 同步轮询最大间隔 |
| `max_sync_wait_timeout_ms` | `300000` | 同步任务最大等待时间 |
| `sync_check_log_tick` | `3` | 同步进度日志的轮询间隔（tick） |
| `enable_block_conn_pool` | `true` | 启用 block 连接池 |
| `block_conn_idle_size` | `128` | 空闲 block 连接保留数量 |
| `block_conn_idle_time_ms` | `60000` | Block 连接空闲时间 |
| `small_file_size` | `4MB` | 小文件阈值 |
| `enable_smart_prefetch` | `true` | 启用 smart prefetch |
| `large_file_size` | `10GB` | 大文件阈值 |
| `max_read_parallel` | `8` | 最大动态读并发 |
| `sequential_read_threshold` | `7` | 顺序读判定阈值 |

大小字段使用字符串，例如 `"128MB"`、`"4MB"`、`"10GB"`；以 `_ms` 结尾的时长字段使用整数毫秒。旧的无后缀别名（`mount_update_ttl`、`sync_check_interval_min` 等）仍被接受。

## `[fuse]`

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `debug` | `false` | 输出 FUSE 请求/响应日志 |
| `audit_logging_enabled` | `false` | 输出 FUSE 审计日志 |
| `metrics_enabled` | `true` | 输出 FUSE 请求/错误/延迟指标 |
| `io_threads` | `32` | FUSE I/O 线程数 |
| `mnt_path` | `/curvine-fuse` | 挂载点路径 |
| `fs_path` | `/` | 挂载点内可见的 Curvine 根路径 |
| `mnt_number` | `1` | 挂载点数量（在 `mnt_path` 下创建 `mnt-0`、`mnt-1`…） |
| `tasks_per_mnt` | `0` | 每个挂载点的 I/O 任务数；`0` 跟随 `io_threads` |
| `clone_fd` | `true` | 启用 clone-fd 优化 |
| `fuse_channel_size` | `0` | FUSE 请求队列大小；`0` 使用后端默认值 |
| `stream_channel_size` | `0` | 读写请求队列大小；`0` 使用后端默认值 |
| `fuse_opts` | `[]` | 额外挂载选项（见下文） |
| `readonly` | `false` | 在内核层以只读方式挂载 |
| `umask` | `022` | 为 `.`/`..` 合成权限位时使用的 umask |
| `uid` / `gid` | 当前进程 | 挂载条目的默认属主 |
| `web_port` | `9003` | FUSE Web / 指标端口 |
| `read_dir_fill_ino` | `true` | 列目录时填充 node ID |
| `entry_timeout` | `1s` | 内核 dentry 缓存超时 |
| `negative_timeout` | `0` | 内核负查找缓存超时；`0` 表示关闭 |
| `attr_timeout` | `1s` | 内核属性缓存超时 |
| `remember` | `false` | 记住已打开的文件与目录 |
| `max_background` | `256` | 最大后台请求数 |
| `congestion_threshold` | `192` | 拥塞阈值；必须 ≤ `max_background` |
| `enable_meta_cache` | `false` | 启用用户态元数据缓存 |
| `meta_cache_timeout` | `60s` | 用户态元数据缓存 TTL |
| `node_cache_timeout` | `1h` | inode/node map 逐出 TTL |
| `direct_io` | `false` | 所有打开操作绕过内核 page cache |
| `open_direct_on_stale` | `false` | 本地元数据陈旧时对该次打开使用 direct I/O |
| `write_back_cache` | `false` | 允许内核缓冲写 |
| `cache_readdir` | `false` | 缓存目录列表 |
| `non_seekable` | `false` | 将文件标记为不可 seek |
| `check_permission` | `true` | 执行权限检查 |
| `state_dir` | 系统临时目录 | 持久化 FUSE 状态的目录 |
| `max_readahead_kb` | 未设置 | 覆盖 BDI `read_ahead_kb`；未设置时保持内核默认 |
| `list_limit` | `1000` | 目录列举数量限制 |
| `enable_splice` | `true` | FUSE 数据传输使用 splice/vmsplice |
| `path_lock_stripes` | `1024` | 路径锁分片数 |

说明：

- `meta_cache_capacity` 与 `node_cache_size` 已被移除，请改用 `meta_cache_timeout` 与 `node_cache_timeout`。
- `negative_timeout = 0` 表示关闭负查找缓存，而不是“永久缓存”。
- `direct_io` 与 `write_back_cache` 不能同时启用，启动时会被拒绝。
- `fuse_opts` 支持 VFS 选项对 `ro`/`rw`、`nodev`/`dev`、`nosuid`/`suid`、`noexec`/`exec`、`noatime`/`atime`、`sync`/`async`，以及 `dirsync`、`allow_other`、`default_permissions`、`big_write`。旧版 libfuse 选项 `auto_unmount`、`allow_root`、`max_write` 不受直接挂载后端支持。
- 时长值支持字符串（`"1s"`、`"500ms"`、`"1h"`）或按毫秒解释的裸整数。旧的 `*_ms` 键仍作为别名接受。

## `[log]`、`[cli]`、`[job]`

### 全局 `[log]`

顶层 `[log]` 由 Rust 客户端与 FUSE 共用。每个服务还有自己的嵌套 `log` 表（`master.log`、`worker.log`、`mds.log`、`transfer.log`），CLI 使用 `[cli].log`。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `level` | `INFO` | 日志级别 |
| `log_dir` | `stdout` | `stdout`、`stderr` 或用于文件日志的目录 |
| `file_name` | 空 | 日志文件基础名；为空时使用 `curvine` |
| `max_log_files` | `10` | 保留的轮转文件数 |
| `max_file_size_mb` | `100` | 按大小轮转的阈值（MB）；`0` 表示不限制大小 |
| `time_rotation` | 空 | `daily` 或 `hourly`；空表示不按时间轮转 |
| `display_thread` | `false` | 输出线程名与 ID |
| `display_position` | `true` | 输出源码位置 |
| `targets` | `[]` | 将指定日志 target 拆分到独立文件 |

仅当 `log_dir` 为目录时才会轮转。大小与时间轮转都未设置时，文件按 100 MB 大小轮转；如果 `max_file_size_mb = 0` 且没有有效的 `time_rotation`，文件会按天轮转，避免无限增长。

### `[cli]`

`CliConf` 只包含 `log`。CLI 默认日志级别为 `warn`，输出到 stdout。

### `[job]`

`[job]` 配置 `transfer.enabled = false` 的客户端所使用的旧版 Master 侧任务实现。Transfer Job 的任务所有权、恢复和保留策略由 `[transfer]` 控制。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `job_life_ttl` | `24h` | Job 记录生命周期 |
| `job_cleanup_ttl` | `10m` | 过期 Job 清理周期 |
| `terminal_retention` | `10m` | 终态 Job 可查询时长 |
| `job_max_files` | `100000` | 单 Job 最大文件数 |
| `master_max_concurrent_load_jobs` | `16` | Master 侧并发 load 规划任务数 |
| `master_max_background_load_jobs` | `1024` | 允许等待的后台 load 任务数 |
| `master_max_pending_load_job_submits` | `4096` | 准入前允许等待的提交请求数 |
| `master_load_job_runtime_threads` | `4` | 预留给 load 规划的运行时线程数 |
| `master_load_job_blocking_threads` | `16` | 预留给 load 规划的阻塞线程数 |
| `master_failed_load_job_retry_interval` | `30s` | 确定性 source-not-found 失败的重用窗口 |
| `task_timeout` | `1h` | 任务最大执行时间 |
| `task_report_interval` | `10s` | 任务进度上报间隔 |
| `worker_max_concurrent_tasks` | `100` | 单 Worker 最大并发任务数 |

## `[transfer]`

`[transfer]` 由独立 Transfer 服务读取，也由需要将 Load / Export 提交给该服务的客户端读取。Transfer 服务除本段外，还需要正常的 `[client]` Master 地址。灰度阶段应保持 Master 与 Worker 配置中的 Transfer 关闭，只在 Transfer 服务和选定客户端配置中启用。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 在当前进程启用 Transfer 路由。客户端启用后 `load`、`export` 使用 Transfer；Transfer 服务端启用后启动该服务。 |
| `store_url` | 空；推导为 `sqlite://data/transfer/transfer.db` | 状态存储 URL。支持 `memory://`、`sqlite://`、`mysql://`、`postgres://`、`postgresql://`。多实例使用一个共享的 `mysql://` 或 `postgres://` URL。 |
| `hostname` | `localhost` | 未显式配置 endpoint 时使用的 RPC / Web 监听 hostname |
| `rpc_port` | `9010` | Transfer RPC 端口 |
| `web_port` | `9011` | 健康检查和指标 HTTP 端口 |
| `endpoints` | `["<hostname>:<rpc_port>"]` | 客户端访问的 Transfer RPC 地址；应填写 Service 或负载均衡地址 |
| `instance_id` | 空 | 可选的稳定服务 owner ID；为空时自动生成 UUID |
| `max_running_transfers` | `64` | 当前实例可并发执行的最大 Job 数 |
| `client_pending_queue_size` | `1024` | 等待或正在提交的自动缓存请求上限 |
| `client_submit_concurrency` | `64` | 客户端自动缓存提交的最大并发数 |
| `max_tasks_per_transfer` | `100000` | 单个 Transfer Job 的最大任务数 |
| `ufs_max_concurrency_per_endpoint` | `32` | 单个 UFS endpoint 的最大并发任务数 |
| `task_max_retries` | `3` | 任务最大重试次数 |
| `lease_timeout` | `120s` | 用于恢复和多实例协调的 owner 租约时长 |
| `terminal_retention` | `168h` | Completed、Failed、Canceled Job 记录的保留时间 |
| `log` | `transfer.log` | Transfer 日志配置 |

新配置不要使用兼容字段 `store_type`、`sqlite_path`、`mysql_url`。`store_url` 根据 URL scheme 推导存储后端。内部队列、探测和调度参数不属于公开的用户配置面。

PostgreSQL 使用私有 CA 时，在 `store_url` 后追加 `sslrootcert=/path/to/ca.pem`；默认情况下 TLS 校验系统信任库。

## `[discovery]`

服务发现默认关闭。启用时唯一支持的 provider 是 etcd。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 启用 etcd 服务发现 |
| `provider` | `etcd` | 发现 provider；启用时必须为 `etcd` |
| `endpoints` | `[]` | etcd endpoints，例如 `["http://etcd-0:2379"]` |
| `prefix` | `/curvine` | etcd key 绝对前缀 |
| `connect_timeout_ms` | `3000` | etcd 连接超时 |
| `request_timeout_ms` | `3000` | etcd 请求超时 |
| `watch_reconnect_min_ms` | `1000` | Watch 重连退避下界 |
| `watch_reconnect_max_ms` | `30000` | Watch 重连退避上界 |
| `watch_reconnect_jitter_ratio` | `0.2` | Watch 重连抖动比例（`0.0`–`1.0`） |
| `allow_stale_cache` | `true` | Watch 断开时允许返回陈旧缓存 |

启用服务发现时，`cluster_id` 只能包含小写字母、数字、`_` 和 `-`。实际 key 为 `{prefix}/{cluster_id}/services/{kind}/{service_id}`。

## `[fault_injection]`

仅测试使用的故障控制面，默认关闭，正常部署不得启用。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 暴露故障 HTTP 路由 |
| `auth_token_env` | `CURVINE_FAULT_TOKEN` | 保存 bearer token 的环境变量名 |

故障 HTTP 路由要求二进制使用 `fault-injection` Cargo feature 构建（例如 `curvine-server/fault-injection`）。如果启用了 `[fault_injection]` 但构建时未包含该 feature，服务启动会直接失败，而不是静默省略路由。

## 版本兼容策略

`[master.compatibility]` 与 `[worker.compatibility]` 字段相同：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `mode` | `diagnose` | `diagnose` 只记录不兼容；`enforce` 拒绝不兼容的 peer |
| `min_worker_version` | 空 | Master 接受的最低 Worker 版本（空表示不限制） |
| `min_client_version` | 空 | 接受的最低客户端版本（空表示不限制） |
| `blocked_versions` | `[]` | 无论模式如何都拒绝的版本 |

协议版本范围是代码级契约，不是运维配置项。无效的 mode 字符串与无法解析的版本边界会退化为宽松默认值，而不是直接拒绝启动。

`enforce` 模式要求 Worker 在心跳中上报 `component_info`。早于该字段引入版本的 Worker 会被解析为 `MissingInfo` 并被拒绝，因此在全部 Worker 升级完成前应保持 `diagnose`。

## 示例骨架

```toml
format_master = false
format_worker = false
# net_interface = "eth0"

[master]
meta_dir = "data/meta"
# [master.compatibility]
# mode = "diagnose"

[mds]
enabled = false
rpc_port = 8998
web_port = 9004
kv_backend = "fdb"
fdb_cluster_file = "/etc/foundationdb/fdb.cluster"

[journal]
journal_addrs = [
  { id = 1, hostname = "master1", port = 8996 },
  { id = 2, hostname = "master2", port = 8996 },
  { id = 3, hostname = "master3", port = 8996 },
]
journal_dir = "data/journal"
leader_create_snapshot = true

[worker]
data_dir = ["[SSD]/data/data1"]
weight = 1

[client]
master_addrs = [
  { hostname = "master1", port = 8995 },
  { hostname = "master2", port = 8995 },
  { hostname = "master3", port = 8995 },
]

[transfer]
enabled = false

[fuse]
mnt_path = "/curvine-fuse"
web_port = 9003

[log]
level = "info"
log_dir = "stdout"

[cli]
log = { level = "warn", log_dir = "stdout", file_name = "cli.log" }

[discovery]
enabled = false
```
