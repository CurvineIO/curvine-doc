# Monitoring Metrics
This chapter describes the observable monitoring metrics of Curvine, used for monitoring cluster status, performance, and resource usage.

## Metrics Collection

Master, Worker, FUSE, the web console, and the optional Transfer service expose monitoring metrics through their HTTP ports. These metrics can be collected by Prometheus and visualized through Grafana or the built-in dashboards of `curvine-web`.

- Master metrics: `http://<master-host>:9010/metrics`
- Worker metrics: `http://<worker-host>:9002/metrics`
- FUSE metrics: `http://<fuse-host>:9003/metrics`
- Web console / built-in metrics: `http://<web-host>:9000`
- Transfer metrics: `http://<transfer-host>:9011/metrics`
- MDS metrics (when enabled): `http://<mds-host>:9004/metrics`

:::note
The Master `web_port` (`9010`) is a metrics-only listener; the admin UI lives in the separate `curvine-web` process on port `9000`. These are the standalone code defaults. The Helm chart pins older web ports; read the effective ports from the generated ConfigMap.
:::

## Master Metrics

| Metric Name | Description |
|-------------|-------------|
| inode_dir_num | Number of directories |
| inode_file_num | Number of files |
| num_blocks | Total number of blocks |
| blocks_size_avg | Average block size |
| capacity | Total storage capacity |
| available | Available storage space |
| fs_used | File system used space |
| worker_num | Number of workers (classified by status) |
| allocatable_capacity | Storage capacity eligible for new writes (live workers only) |
| allocatable_available | Available space eligible for new writes (live workers only) |
| scheduled_bytes | In-flight allocations not yet reflected in the workers' heartbeat available space (label `worker_addr`, live workers only) |
| rpc_request_total_count | Total RPC request count |
| rpc_request_time | Accumulated RPC processing time, in microseconds |
| rpc_queue_duration | Time a request waited in the RPC queue before its handler started, in microseconds (label `executor`: `main` or `actor`) |
| master_active_connections | Number of active RPC connections to the master |
| replication_staging_number | Number of blocks waiting for replication |
| replication_inflight_number | Number of blocks currently being replicated |
| replication_uncertain_number | Replication jobs whose remote execution state is uncertain |
| replication_failure_count | Total cumulative replication failures |
| replication_timeout_count | Total replication submit and result timeouts |
| operation_duration | Processing time per RPC, in microseconds (label `operation`: the RPC code, including `WorkerHeartbeat`) |

### Sessions

| Metric Name | Description |
|-------------|-------------|
| master_active_sessions | Client sessions currently holding a lease with this master |
| master_expired_sessions_total | Client sessions reclaimed after their lease expired |
| master_reaped_locks_total | Inode lock sets released because their owning session expired |
| master_reaped_writers_total | Writer markers released because their owning session expired |
| master_reaped_stale_hints_total | Ownership hints dropped because the inode or ownership was already gone |

### Checkpoints and Metadata Store

| Metric Name | Description |
|-------------|-------------|
| checkpoint_count | Metadata checkpoint attempts, including failed ones |
| checkpoint_fail_count | Failed metadata checkpoint attempts |
| checkpoint_time | Total time spent creating metadata checkpoints, in milliseconds; divide by `checkpoint_count` for the average |
| checkpoint_flush_time | Part of `checkpoint_time` spent flushing memtables before the checkpoint, in milliseconds |
| checkpoint_last_duration_ms | Duration of the last checkpoint attempt, in milliseconds |
| rocksdb_metrics | RocksDB properties of the metadata store (label `tag`); tags that start with `journal_` belong to the journal's RocksDB |
| fs_dir_stalled | `1` while the metadata (`fs_dir`) lock has been unavailable beyond the stall threshold |
| fs_dir_stall_total | Metadata lock stall episodes detected |
| fs_dir_probe_acquire_us | Latency of the last metadata lock probe, in microseconds |

### Eviction, Trash, and TTL

| Metric Name | Description |
|-------------|-------------|
| eviction_lru_cache_size | Files tracked in the LRU list for quota eviction |
| eviction_trigger_count | Times eviction was triggered |
| eviction_files_deleted | Files deleted by eviction |
| eviction_bytes_freed | Bytes freed by eviction |
| trash_pending_entries | Trash entries staged for the asynchronous purger in `/.Trash/.pending` |
| trash_purging_entries | Staged synchronous deletes left in `/.Trash/.purging` for the purger |
| trash_purge_batches | Trash purge batches applied |
| trash_purge_batch_duration_ms | Total time spent applying trash purge batches, in milliseconds; divide by `trash_purge_batches` for the average |
| trash_purge_inodes | Inodes reclaimed by the trash purger |
| trash_purge_errors | Failed trash purge batches |
| ttl_bucket_len | Number of TTL buckets |
| ttl_total_inodes | Inodes tracked in the TTL buckets |
| ttl_skipped_inodes | Inodes skipped while updating the TTL buckets |

### Read-Cache Reservation

| Metric Name | Description |
|-------------|-------------|
| master_read_cache_reservation_batches_issued_total | New read-cache confirmation batches (token redelivery excluded) |
| master_read_cache_reservation_batches_confirmed_total | Batches acknowledged by a fresh snapshot; a batch may release zero bytes |
| master_read_cache_reservation_released_bytes_total | Replica reservation bytes released by read-cache confirmation |
| master_read_cache_reservation_batches_expired_total | Batches discarded at their acknowledgement deadline; no capacity is released |
| master_read_cache_reservation_skipped_total | Read-cache optimization skips (label `reason`: `allocation_floor`, `anonymous_reclaim`, `pending_limit`, `lease_revoked`, `no_credit`, `unsequenced_worker`, `tracker_ttl`, `tracker_limit`, `publication_invalidated`); counts attempts, not files |

`master_follower_read_accepted_total` and `master_follower_read_refused_total` are described in [Follower Metadata Reads](../1-Key-Features/04-follower-reads.md).

The master also exposes `buffer_handler_blocked_requests`: RPC requests currently waiting for the server's global concurrency limit.

Every service also exposes the standard Prometheus process collector on Linux
(`process_resident_memory_bytes`, `process_cpu_seconds_total`,
`process_open_fds`, `process_threads`). Use those for memory and CPU alerting;
the old `used_memory_bytes` and `rocksdb_used_memory_bytes` gauges no longer
exist.

### Compatibility Metrics

The master evaluates every worker heartbeat and client handshake against its
compatibility contract and exposes the results as metrics (see
[Version Management and Compatibility](04-version-management.md)):

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| compat_worker_verdict | Gauge | `worker_id`, `verdict` | 1 for the current compatibility verdict of each worker |
| compat_client_verdict | Gauge | `release_version`, `verdict` | Number of clients seen in the last hour per release version and verdict; `release_version` is `none` or `unknown` when a client sends no or an unparseable version |
| compat_client_verdict_total | Counter | `verdict` | Times a client address changed to a verdict |
| compat_enforce_rejected_total | Counter | `component`, `verdict` | Total number of enforce-mode compatibility rejections |

The `verdict` label takes one of: `compatible`, `missing_info`, `blocked`,
`protocol_mismatch`, `version_too_old`, `version_unknown`. Alert on
`compat_worker_verdict` / `compat_client_verdict` with a non-`compatible`
verdict to surface mixed-version clusters, and on `compat_enforce_rejected_total`
increases to catch upgrade conflicts early.

## Journal Node Metrics

| Metric Name | Description |
|-------------|-------------|
| journal_queue_len | Journal queue length |
| journal_flush_count | Journal flush count |
| journal_flush_time | Journal flush time |
| journal_term | Current Raft term of the journal |
| journal_committed | Raft commit index of the journal |
| journal_applied | Last index applied by the journal state machine |
| journal_ufs_applied | Last index whose UFS effects have been applied |
| journal_ufs | UFS replay progress (label `kind`: `pending` backlog, `stalled` flag, `failed` attempts) |

These journal metrics are exported by the master process.

## Client Metrics

| Metric Name | Description |
|-------------|-------------|
| client_mount_cache_hits | Mount cache hits |
| client_mount_cache_misses | Mount cache misses |
| client_metadata_operation_duration | Metadata operation duration |
| client_write_bytes | Bytes written |
| client_write_time_us | Write time in microseconds |
| client_read_bytes | Bytes read |
| client_read_time_us | Read time in microseconds |
| client_read_discarded_bytes | Pipelined read bytes received but dropped after a seek or close |
| client_seek_absorbed_total | Forward seeks absorbed by the prefetch buffer |
| client_write_queued_bytes | Bytes queued by writers and not yet sent to the block layer |
| client_write_inflight_requests | Chunk writes currently sent to the block layer |
| client_write_backend_us | Histogram of the time one chunk write takes across all replicas, in microseconds |
| client_write_budget_waits_total | Writes that had to wait for the queued-byte budget |
| client_block_idle_conn | Idle block connections in the pool |
| client_async_cache_admission_skipped | Automatic-cache requests not submitted (label `reason`: `already_pending` for a file already queued, `overloaded` when the pending queue is full) |

## Worker Metrics

| Metric Name | Description |
|-------------|-------------|
| write_bytes | Bytes written |
| write_time_us | Write time in microseconds |
| write_count | Write count |
| write_blocks | Blocks written (classified by type) |
| slow_write_count | Writes slower than `[worker] io_slow_threshold` (label `dir_id`) |
| write_error_count | Writes that failed with an I/O error (label `dir_id`) |
| read_bytes | Bytes read |
| read_time_us | Read time in microseconds |
| read_count | Read count |
| read_blocks | Blocks read (classified by type) |
| read_error_count | Reads that failed with an I/O error (label `dir_id`) |
| capacity | Total storage capacity |
| available | Available storage space |
| fs_used | File system used space |
| failed_disks | Number of failed storage devices |
| total_disks | Total number of storage disks |
| disk_free_ratio | Free space per disk in basis points, where `10000` is 100% (labels `dir_id`, `dir_path`, `storage_type`) |
| disk_full_rejected_writes | Writes rejected because the storage layer reported insufficient capacity |
| num_blocks | Total number of blocks |
| num_blocks_to_delete | Number of blocks pending deletion |
| checksum_invalidated_count | Blocks removed after failing checksum verification |
| truncated_invalidated_count | Blocks removed because their file is shorter than the committed length |
| block_store_stripe_lock_wait_us | Histogram of time spent waiting for a block-store stripe lock, in microseconds (label `operation`) |
| block_dataset_write_lock_wait_us | Histogram of time spent waiting for the block-dataset write lock, in microseconds (label `operation`) |
| block_dataset_write_lock_hold_us | Histogram of time the block-dataset write lock was held, in microseconds (label `operation`) |
| file_layout_operation_us | Histogram of time spent in file-layout operations outside the dataset lock, in microseconds (label `operation`) |
