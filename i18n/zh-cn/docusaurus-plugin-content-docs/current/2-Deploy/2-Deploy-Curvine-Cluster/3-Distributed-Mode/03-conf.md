# 配置参考

本页基于当前 `main` 分支里的配置结构体 `curvine-common/src/conf/*.rs` 与示例文件 `etc/curvine-cluster.toml` 整理，而不是继续沿用旧版本里已经漂移的大表。

:::tip
运行时真正的配置来源仍然是 `conf/curvine-cluster.toml`。本页更适合作为“配置布局与关键字段索引”；如果需要完整字段列表，请直接查看 Curvine 源码中的配置结构体。
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
| `CURVINE_WORKER_HOSTNAME` | 覆盖 Worker 实际 hostname |
| `CURVINE_CLIENT_HOSTNAME` | 覆盖客户端 hostname，用于本地性判断 |

## 当前配置布局

当前 `ClusterConf` 的主要段落如下：

| 段落 | 作用 |
| --- | --- |
| 顶层字段 | `format_master`、`format_worker`、`testing`、`cluster_id` |
| `[master]` | Master RPC / Web、元数据、TTL、配额、复制、锁 |
| `[journal]` | Raft / journal 配置 |
| `[worker]` | Worker RPC、数据目录、复制与数据路径执行参数 |
| `[client]` | Rust 客户端默认值、重试、缓冲区、统一文件系统行为 |
| `[fuse]` | FUSE 挂载与缓存参数 |
| `[log]` | 全局 client / fuse 日志 |
| `[s3_gateway]` | S3 兼容网关配置 |
| `[job]` | load 任务生命周期与并发控制 |
| `[cli]` | CLI 日志配置 |

:::warning
本页只覆盖当前文档站公开使用的配置段。
:::

## 顶层字段

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `format_master` | `true` | 启动时格式化 Master 元数据存储 |
| `format_worker` | `true` | 启动时格式化 Worker 数据存储 |
| `testing` | `false` | 测试模式 |
| `cluster_id` | `curvine` | 集群标识 |

生产环境中，这两个 `format_*` 一般会在实际部署的 TOML 里改成 `false`。

## `[master]`

`MasterConf` 中最关键的默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `hostname` | `localhost` | Master hostname，可被 `CURVINE_MASTER_HOSTNAME` 覆盖 |
| `rpc_port` | `8995` | Master RPC 端口 |
| `web_port` | `9000` | Master Web 端口 |
| `io_threads` | `32` | Master I/O 线程数 |
| `io_timeout` | `10m` | 网络超时 |
| `meta_dir` | `<cwd>/fs-meta` | 元数据目录 |
| `retry_cache_enable` | `true` | 是否启用重试缓存 |
| `retry_cache_size` | `100000` | 重试缓存容量 |
| `retry_cache_ttl` | `10m` | 重试缓存 TTL |
| `block_report_limit` | `1000` | 每次 block report 最大数量 |
| `worker_policy` | `local` | Worker 选择策略 |
| `heartbeat_interval` | `3s` | Worker 心跳间隔 |
| `worker_check_interval` | `10s` | Worker 状态检查间隔 |
| `worker_blacklist_interval` | `30s` | Worker 拉黑时间 |
| `worker_lost_interval` | `10m` | Worker 判定丢失时间 |
| `audit_logging_enabled` | `true` | 是否启用审计日志 |
| `block_replication_enabled` | `false` | 是否启用 block 复制控制 |
| `block_replication_concurrency_limit` | `1000` | 复制任务并发上限 |
| `block_replication_retry_interval` | `5s` | 复制重试间隔 |
| `ttl_checker_retry_attempts` | `3` | TTL 检查重试次数 |
| `ttl_checker_interval` | `1h` | TTL 检查周期 |
| `ttl_bucket_interval` | `1h` | TTL 分桶周期 |
| `ttl_max_retry_duration` | `10m` | TTL 最大重试时长 |
| `ttl_retry_interval` | `1s` | TTL 重试间隔 |
| `enable_quota_eviction` | `false` | 是否启用 quota 驱动逐出 |
| `quota_eviction_mode` | `free` | 逐出模式 |
| `quota_eviction_policy` | `lru` | 逐出策略 |
| `quota_eviction_high_rate` | `0.8` | 高水位 |
| `quota_eviction_low_rate` | `0.6` | 低水位 |
| `quota_eviction_scan_page` | `2` | 扫描页数 |
| `quota_eviction_capacity` | `5000000` | 扫描容量 |
| `lock_expire_time` | `5m` | 过期锁回收时间 |
| `buffer_size` | `128KB` | 内部缓冲区大小 |

`[master.rocksdb]` 是嵌套段落，用来控制元数据 RocksDB 行为；其默认值来自 `MasterConf::rocksdb_default()`。

## `[journal]`

`JournalConf` 中最关键的默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enable` | `true` | 是否启用 Raft journal |
| `group_name` | `raft-group` | Raft 组名 |
| `hostname` | `localhost` | 本地 Raft hostname |
| `rpc_port` | `8996` | Raft RPC 端口 |
| `message_size` | `200` | Raft RPC message size |
| `writer_channel_size` | `0` | journal writer 队列大小 |
| `writer_flush_batch_size` | `1000` | journal flush batch size |
| `writer_flush_batch_ms` | `10` | journal flush 周期 |
| `snapshot_interval` | `6h` | snapshot 周期 |
| `snapshot_entries` | `1000000` | 两次 snapshot 之间的 entry 数 |
| `conn_timeout_ms` | `30000` | 连接超时 |
| `io_timeout_ms` | `60000` | I/O 超时 |
| `raft_tick_interval_ms` | `1000` | raft tick 周期 |
| `raft_election_tick` | `10` | 选举 tick |
| `raft_heartbeat_tick` | `3` | 心跳 tick |
| `raft_batch_size` | `8` | batch append 大小 |
| `raft_retry_cache_ttl` | `10m` | retry cache TTL |
| `retain_checkpoint_num` | `3` | 保留 checkpoint 数 |
| `ufs_copy_timeout` | `20m` | 数据复制到 UFS 的超时 |

`journal_addrs` 必须列出 Raft 节点，且本地 Master 实际生效的 hostname 必须能匹配其中一项。

## `[worker]`

`WorkerConf` 中最关键的默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `hostname` | `localhost` | Worker hostname，可被 `CURVINE_WORKER_HOSTNAME` 覆盖 |
| `rpc_port` | `8997` | Worker RPC 端口 |
| `web_port` | `9001` | Worker Web 端口 |
| `dir_reserved` | `0` | 每个数据目录的预留空间 |
| `data_dir` | `[]` | Worker 数据目录列表 |
| `io_slow_threshold` | `300ms` | 慢 I/O 阈值 |
| `io_threads` | `32` | Worker I/O 线程数 |
| `io_timeout` | `10m` | Worker 网络超时 |
| `scheduler_threads` | `2` | 调度线程数 |
| `executor_threads` | `10` | 后台执行线程数 |
| `enable_splice` | `false` | 是否启用 splice |
| `enable_send_file` | `true` | 是否启用 sendfile |
| `pipe_buf_size` | `64KB` | pipe buffer 大小 |
| `pipe_pool_max_cap` | `2000` | pipe pool 最大容量 |
| `block_replication_concurrency_limit` | `100` | 复制任务并发上限 |
| `block_replication_chunk_size` | `1MB` | 复制块大小 |
| `enable_s3_gateway` | `false` | 是否随 Worker 启动 S3 网关 |

生产环境里最重要的字段通常是 `data_dir`，例如：

```toml
data_dir = [
  "[SSD]/data/data1",
  "[HDD]/data/data2"
]
```

## `[client]`

`ClientConf` 中最关键的默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `master_addrs` | `[]` | 为空时由 `journal_addrs` + Master RPC 端口推导 |
| `hostname` | `localhost` | 客户端 hostname，可被 `CURVINE_CLIENT_HOSTNAME` 覆盖 |
| `replicas` | `1` | 默认副本数 |
| `block_size` | `128MB` | 默认 block size |
| `write_chunk_size` | `128KB` | 写 chunk 大小 |
| `read_chunk_size` | `128KB` | 读 chunk 大小 |
| `read_parallel` | `1` | 基础读并发 |
| `max_cache_block_handles` | `10` | block handle 缓存上限 |
| `short_circuit` | `true` | 是否启用 short-circuit |
| `storage_type` | `disk` | 默认存储类型 |
| `ttl_ms` | `0` | 默认 TTL |
| `ttl_action` | `none` | 默认 TTL 动作 |
| `auto_cache_enabled` | `false` | 是否启用自动缓存提交 |
| `auto_cache_ttl` | `7d` | 自动缓存 TTL |
| `master_conn_pool_size` | `1` | Master 连接池大小 |
| `enable_read_ahead` | `true` | 是否启用预读 |
| `enable_unified_fs` | `true` | 是否启用统一文件系统视图 |
| `enable_rust_read_ufs` | `true` | cache miss 时是否允许直接读 UFS |
| `mount_update_ttl` | `10s` | mount 元数据刷新周期 |
| `enable_block_conn_pool` | `true` | 是否启用 block 连接池 |
| `block_conn_idle_size` | `128` | 空闲 block 连接保留数量 |
| `small_file_size` | `4MB` | 小文件阈值 |
| `enable_smart_prefetch` | `true` | 是否启用 smart prefetch |
| `large_file_size` | `10GB` | 大文件阈值 |
| `max_read_parallel` | `8` | 最大动态读并发 |
| `sequential_read_threshold` | `7` | 顺序读判定阈值 |

## `[fuse]`

`FuseConf` 中最关键的默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `mnt_path` | `/curvine-fuse` | 挂载点路径 |
| `fs_path` | `/` | 挂载点可见的 Curvine 根路径 |
| `mnt_number` | `1` | 挂载点数量 |
| `clone_fd` | `true` | 是否启用 clone-fd 优化 |
| `web_port` | `9002` | FUSE Web 端口 |
| `enable_meta_cache` | `false` | 是否启用元数据缓存 |
| `meta_cache_capacity` | `100000` | 元数据缓存容量 |
| `meta_cache_ttl` | `120s` | 元数据缓存 TTL |
| `node_cache_size` | `200000` | node cache 容量 |
| `node_cache_timeout` | `24h` | node cache TTL |
| `direct_io` | `false` | 是否启用 direct I/O |
| `write_back_cache` | `false` | 是否启用 write-back cache |
| `cache_readdir` | `false` | 是否缓存 readdir 结果 |
| `check_permission` | `true` | 是否执行权限检查 |
| `list_limit` | `1000` | 目录列举数量限制 |

## `[log]`、`[cli]`、`[job]`、`[s3_gateway]`

### 全局 `[log]`

顶层 `[log]` 是 client / fuse 共用的日志配置。示例配置常设为输出到 stdout，也可以切到文件目录。

### `[cli]`

`CliConf` 目前非常精简，只包含 `log`；CLI 默认日志级别为 `warn`。

### `[job]`

`JobConf` 中关键默认值：

| 字段 | 默认值 |
| --- | --- |
| `job_life_ttl` | `24h` |
| `job_cleanup_ttl` | `10m` |
| `job_max_files` | `100000` |
| `task_timeout` | `1h` |
| `task_report_interval` | `10s` |
| `worker_max_concurrent_tasks` | `100` |

### `[s3_gateway]`

`S3GatewayConf` 中关键默认值：

| 字段 | 默认值 |
| --- | --- |
| `listen` | `0.0.0.0:9900` |
| `region` | `us-east-1` |
| `put_temp_dir` | `/tmp/curvine-temp` |
| `put_memory_buffer_threshold` | `1048576` |
| `put_max_memory_buffer` | `16777216` |
| `enable_distributed_auth` | `false` |
| `cache_refresh_interval_secs` | `30` |
| `get_chunk_size_mb` | `1.0` |
| `web_port` | `9003` |

## 示例骨架

```toml
format_master = false
format_worker = false

[master]
meta_dir = "data/meta"

[journal]
journal_addrs = [
  { id = 1, hostname = "master1", port = 8996 },
  { id = 2, hostname = "master2", port = 8996 },
  { id = 3, hostname = "master3", port = 8996 },
]

[worker]
data_dir = ["[SSD]/data/data1"]

[client]
master_addrs = [
  { hostname = "master1", port = 8995 },
  { hostname = "master2", port = 8995 },
  { hostname = "master3", port = 8995 },
]

[fuse]
mnt_path = "/curvine-fuse"

[log]
log_dir = "stdout"

[cli]
log = { level = "warn", log_dir = "stdout", file_name = "cli.log" }
```
