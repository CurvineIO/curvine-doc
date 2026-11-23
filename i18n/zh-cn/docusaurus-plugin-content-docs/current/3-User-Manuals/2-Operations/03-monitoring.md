# 监控指标
本章介绍Curvine的可观测监控指标，用于监控集群状态、性能和资源使用情况。

### 指标收集
master、worker、fuse 以及可选的 transfer 服务会通过各自的 HTTP Web 端口暴露监控指标，可以在 Prometheus 中采集这些指标，然后通过 Grafana 可视化。

- master 指标：`http://<master-host>:9010/metrics`
- worker 指标：`http://<worker-host>:9002/metrics`
- fuse 指标：`http://<fuse-host>:9003/metrics`
- transfer 指标：`http://<transfer-host>:9011/metrics`
- MDS 指标（启用时）：`http://<mds-host>:9004/metrics`

:::note
以上为单机代码默认端口。Helm Chart 仍沿用旧的 Web 端口，请以生成的 ConfigMap 中的实际端口为准。
:::

## Master 指标

| 指标名称 | 描述 |
|---------|------|
| inode_dir_num | 目录数量 |
| inode_file_num | 文件数量 |
| num_blocks | block 总数 |
| blocks_size_avg | block 平均大小 |
| capacity | 总存储容量 |
| available | 可用存储空间 |
| fs_used | 文件系统已用空间 |
| worker_num | worker 数量（按状态分类） |
| allocatable_capacity | 可用于新写入的存储容量（仅统计 live worker） |
| allocatable_available | 可用于新写入的可用空间（仅统计 live worker） |
| scheduled_bytes | 已分配但尚未反映到 worker 心跳可用空间中的字节数（标签 `worker_addr`，仅 live worker） |
| rpc_request_total_count | RPC 总请求计数 |
| rpc_request_time | RPC 累计处理时间（微秒） |
| rpc_queue_duration | 请求在 RPC 队列中等待到处理开始的时间（微秒；标签 `executor`：`main` 或 `actor`） |
| master_active_connections | 连接到 master 的活跃 RPC 连接数 |
| replication_staging_number | 等待复制的块数量 |
| replication_inflight_number | 正在进行复制的块数量 |
| replication_uncertain_number | 远端执行状态不确定的复制任务数 |
| replication_failure_count | 累计复制失败的总次数 |
| replication_timeout_count | 复制提交和结果超时的累计次数 |
| operation_duration | 每个 RPC 的处理耗时（微秒；标签 `operation` 为 RPC 类型，包括 `WorkerHeartbeat`） |

### 会话指标

| 指标名称 | 描述 |
|---------|------|
| master_active_sessions | 当前在本 master 上持有租约的客户端会话数 |
| master_expired_sessions_total | 因租约过期而回收的客户端会话数 |
| master_reaped_locks_total | 因所属会话过期而释放的 inode 锁集合数 |
| master_reaped_writers_total | 因所属会话过期而释放的写入者标记数 |
| master_reaped_stale_hints_total | 因 inode 或归属已不存在而丢弃的归属提示数 |

### Checkpoint 与元数据存储

| 指标名称 | 描述 |
|---------|------|
| checkpoint_count | 元数据 checkpoint 尝试次数（包括失败） |
| checkpoint_fail_count | 失败的元数据 checkpoint 次数 |
| checkpoint_time | 创建元数据 checkpoint 的累计耗时（毫秒）；除以 `checkpoint_count` 得到平均值 |
| checkpoint_flush_time | `checkpoint_time` 中 checkpoint 前刷写 memtable 的耗时（毫秒） |
| checkpoint_last_duration_ms | 最近一次 checkpoint 尝试的耗时（毫秒） |
| rocksdb_metrics | 元数据存储的 RocksDB 属性（标签 `tag`）；以 `journal_` 开头的 tag 属于 journal 的 RocksDB |
| fs_dir_stalled | 元数据（`fs_dir`）锁超过卡顿阈值仍无法获取时为 `1` |
| fs_dir_stall_total | 检测到的元数据锁卡顿次数 |
| fs_dir_probe_acquire_us | 最近一次元数据锁探测的耗时（微秒） |

### 淘汰、回收站与 TTL

| 指标名称 | 描述 |
|---------|------|
| eviction_lru_cache_size | 配额淘汰 LRU 列表中跟踪的文件数 |
| eviction_trigger_count | 触发淘汰的次数 |
| eviction_files_deleted | 淘汰删除的文件数 |
| eviction_bytes_freed | 淘汰释放的字节数 |
| trash_pending_entries | `/.Trash/.pending` 中等待异步清理的回收站条目数 |
| trash_purging_entries | `/.Trash/.purging` 中留给清理器的同步删除条目数 |
| trash_purge_batches | 已执行的回收站清理批次数 |
| trash_purge_batch_duration_ms | 执行回收站清理批次的累计耗时（毫秒）；除以 `trash_purge_batches` 得到平均值 |
| trash_purge_inodes | 回收站清理器回收的 inode 数 |
| trash_purge_errors | 失败的回收站清理批次数 |
| ttl_bucket_len | TTL bucket 数量 |
| ttl_total_inodes | TTL bucket 中跟踪的 inode 数 |
| ttl_skipped_inodes | 更新 TTL bucket 时跳过的 inode 数 |

### 读缓存预留

| 指标名称 | 描述 |
|---------|------|
| master_read_cache_reservation_batches_issued_total | 新发出的读缓存确认批次（不含 token 重投） |
| master_read_cache_reservation_batches_confirmed_total | 被新快照确认的批次；一个批次可能释放 0 字节 |
| master_read_cache_reservation_released_bytes_total | 读缓存确认实际释放的副本预留字节数 |
| master_read_cache_reservation_batches_expired_total | 在确认截止时间被丢弃的批次，不释放容量 |
| master_read_cache_reservation_skipped_total | 读缓存优化被跳过的次数（标签 `reason`：`allocation_floor`、`anonymous_reclaim`、`pending_limit`、`lease_revoked`、`no_credit`、`unsequenced_worker`、`tracker_ttl`、`tracker_limit`、`publication_invalidated`）；统计尝试次数而非文件数 |

`master_follower_read_accepted_total` 和 `master_follower_read_refused_total` 见 [Follower 元数据读](../1-Key-Features/04-follower-reads.md)。

master 还会暴露 `buffer_handler_blocked_requests`：当前等待服务端全局并发限制的 RPC 请求数。

在 Linux 上，每个服务还会额外暴露标准的 Prometheus 进程采集指标（`process_resident_memory_bytes`、`process_cpu_seconds_total`、`process_open_fds`、`process_threads`）。内存和 CPU 告警请用这些指标；旧的 `used_memory_bytes` 和 `rocksdb_used_memory_bytes` 已不存在。

### 兼容性指标

master 会对每个 worker 心跳和客户端握手执行兼容性评估，并将结果暴露为指标
（详见[版本管理与兼容性](04-version-management.md)）：

| 指标名称 | 类型 | 标签 | 描述 |
|---------|------|------|------|
| compat_worker_verdict | Gauge | `worker_id`、`verdict` | 每个 worker 当前兼容性结论，为 1 |
| compat_client_verdict | Gauge | `release_version`、`verdict` | 最近一小时内按版本和结论统计的 client 数量；client 未发送版本或版本无法解析时，`release_version` 为 `none` 或 `unknown` |
| compat_client_verdict_total | Counter | `verdict` | client 地址变为某个结论的累计次数 |
| compat_enforce_rejected_total | Counter | `component`、`verdict` | enforce 模式下累计拒绝次数 |

`verdict` 标签取值：`compatible`、`missing_info`、`blocked`、
`protocol_mismatch`、`version_too_old`、`version_unknown`。建议对
`compat_worker_verdict` / `compat_client_verdict` 中非 `compatible` 的结论设置告警，
以发现混合版本集群；对 `compat_enforce_rejected_total` 的增长设置告警，
及早发现升级冲突。

## Journal Node 指标

| 指标名称 | 描述 |
|---------|------|
| journal_queue_len | Journal 队列长度 |
| journal_flush_count | Journal 刷新次数 |
| journal_flush_time | Journal 刷新时间 |
| journal_term | Journal 当前的 Raft term |
| journal_committed | Journal 的 Raft commit index |
| journal_applied | Journal 状态机最近应用的 index |
| journal_ufs_applied | 最近完成 UFS 副作用应用的 index |
| journal_ufs | UFS 回放进度（标签 `kind`：`pending` 积压、`stalled` 卡住标志、`failed` 失败次数） |

这些 journal 指标由 master 进程导出。

## Client 指标

| 指标名称 | 描述 |
|---------|------|
| client_mount_cache_hits | 挂载缓存命中数 |
| client_mount_cache_misses | 挂载缓存未命中数 |
| client_metadata_operation_duration | 元数据操作耗时 |
| client_write_bytes | 写入字节数 |
| client_write_time_us | 写入时间（微秒） |
| client_read_bytes | 读取字节数 |
| client_read_time_us | 读取时间（微秒） |
| client_read_discarded_bytes | 流水线读取已收到但因 seek 或关闭而丢弃的字节数 |
| client_seek_absorbed_total | 被预读缓冲吸收的向前 seek 次数 |
| client_write_queued_bytes | 写入方已排队但尚未发送到 block 层的字节数 |
| client_write_inflight_requests | 当前已发送到 block 层的 chunk 写请求数 |
| client_write_backend_us | 一次 chunk 写入完成所有副本的耗时直方图（微秒） |
| client_write_budget_waits_total | 需要等待排队字节预算的写入次数 |
| client_block_idle_conn | 连接池中空闲的 block 连接数 |
| client_async_cache_admission_skipped | 未提交的自动缓存请求数（标签 `reason`：`already_pending` 表示文件已在队列中，`overloaded` 表示等待队列已满） |

## Worker 指标

| 指标名称 | 描述 |
|---------|------|
| write_bytes | 写入字节数 |
| write_time_us | 写入时间（微秒） |
| write_count | 写入次数 |
| write_blocks | 写入块数（按类型分类） |
| slow_write_count | 慢于 `[worker] io_slow_threshold` 的写入次数（标签 `dir_id`） |
| write_error_count | 因 I/O 错误失败的写入次数（标签 `dir_id`） |
| read_bytes | 读取字节数 |
| read_time_us | 读取时间（微秒） |
| read_count | 读取次数 |
| read_blocks | 读取块数（按类型分类） |
| read_error_count | 因 I/O 错误失败的读取次数（标签 `dir_id`） |
| capacity | 总存储容量 |
| available | 可用存储空间 |
| fs_used | 文件系统已用空间 |
| failed_disks | 异常存储数量 |
| total_disks | 存储磁盘数量 |
| disk_free_ratio | 每块磁盘的剩余空间比例，单位为万分之一，`10000` 表示 100%（标签 `dir_id`、`dir_path`、`storage_type`） |
| disk_full_rejected_writes | 因存储层报告容量不足而被拒绝的写入次数 |
| num_blocks | block 总数 |
| num_blocks_to_delete | 待删除 block 数 |
| checksum_invalidated_count | 校验和验证失败后被删除的 block 数 |
| truncated_invalidated_count | 因文件短于已提交长度而被删除的 block 数 |
| block_store_stripe_lock_wait_us | 等待 block-store 分段锁的耗时直方图（微秒；标签 `operation`） |
| block_dataset_write_lock_wait_us | 等待 block-dataset 写锁的耗时直方图（微秒；标签 `operation`） |
| block_dataset_write_lock_hold_us | 持有 block-dataset 写锁的耗时直方图（微秒；标签 `operation`） |
| file_layout_operation_us | 在 dataset 锁之外执行文件布局操作的耗时直方图（微秒；标签 `operation`） |