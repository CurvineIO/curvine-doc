# Configuration Reference

This page describes the configuration layout of the current `main` branch. It is derived from the actual config structs in `crates/common/curvine-config/src/*.rs` and the sample file `etc/curvine-cluster.toml`.

:::tip
`conf/curvine-cluster.toml` is the runtime source of truth. This page is a map of the sections and high-signal options; for every field, read the corresponding struct in `crates/common/curvine-config/src/`.
:::

## Config Sources

Curvine commonly uses these inputs together:

- `conf/curvine-cluster.toml`: main cluster config
- `conf/curvine-env.sh`: shell-side environment setup for scripts under `bin/`
- `conf/curvine-site.xml`: Hadoop / Java client config

Important environment overrides:

| Variable | Purpose |
| --- | --- |
| `CURVINE_CONF_FILE` | Override the path to `curvine-cluster.toml` |
| `CURVINE_MASTER_HOSTNAME` | Override the effective Master hostname |
| `CURVINE_MDS_HOSTNAME` | Override the effective MDS hostname |
| `CURVINE_WORKER_HOSTNAME` | Override the effective Worker hostname |
| `CURVINE_CLIENT_HOSTNAME` | Override the client hostname used for locality checks |
| `CURVINE_TRANSFER_HOSTNAME` | Override the effective Transfer service hostname |

### How the config is loaded

The load pipeline is:

```text
file (TOML) -> environment allowlist -> deserialize -> normalize whitespace
            -> validate -> discovery.init -> resolve client.master_addrs
```

- Unknown keys are reported as warnings by `validation::warn_unknown_keys`; they are not rejected. A misspelled key silently keeps its default value, so always check the startup warnings.
- `client.master_addrs` may be omitted. If it is empty, Curvine derives it from `journal.journal_addrs` using `master.rpc_port`; if `journal_addrs` is also empty, it uses `master.hostname:master.rpc_port`.
- The standalone Transfer service uses a reduced loader (`ClusterConf::from_transfer`) that validates only the client and transfer sections.

### `net_interface`

When `net_interface` is non-empty (for example `"eth0"`), Curvine resolves the first IPv4 address of that interface and applies it to the `master`, `mds`, `journal`, `worker`, `client`, and `transfer` hostnames. When it is set, the `CURVINE_*_HOSTNAME` environment variables are ignored.

`net_interface` only fills in **this node's own** hostname. Cluster membership lists (`journal.journal_addrs` and `client.master_addrs`) must still be written explicitly, and each node's entry must use the exact IPv4 that its interface resolves to. Otherwise the node cannot locate itself in the Raft group, and startup fails with a clear error.

## Top-Level Layout

The current `ClusterConf` contains these sections:

| Section | Purpose |
| --- | --- |
| top-level flags | `format_master`, `format_worker`, `testing`, `cluster_id`, `net_interface` |
| `[master]` | Master RPC, web, metadata, TTL, quota, replication, locking |
| `[mds]` | Optional standalone metadata service (FoundationDB or memory KV) |
| `[journal]` | Raft / journal settings |
| `[worker]` | Worker RPC, storage directories, replication, data-path execution |
| `[client]` | Client defaults, retries, read/write buffers, unified FS behavior |
| `[fuse]` | FUSE mount and cache settings |
| `[log]` | Shared client / FUSE logging |
| `[job]` | Legacy Master-side load-job lifecycle and concurrency |
| `[transfer]` | Standalone Load and Export service, state store, and client routing |
| `[cli]` | CLI log settings |
| `[discovery]` | etcd-based service discovery (disabled by default) |
| `[fault_injection]` | Test-only fault HTTP control plane |
| `[master.compatibility]`, `[worker.compatibility]` | Version compatibility policy |

:::warning
The `[s3_gateway]` section and `worker.enable_s3_gateway` no longer exist in the current code. The S3-compatible gateway is not part of the current server. Remove these keys from older configurations; they are ignored (with a warning) if present.
:::

## Cluster-Level Flags

| Field | Default | Meaning |
| --- | --- | --- |
| `format_master` | `true` | Format Master metadata storage on startup |
| `format_worker` | `true` | Format Worker data storage on startup |
| `testing` | `false` | Test-only mode; data does not flow normally |
| `cluster_id` | `curvine` | Cluster identifier used in storage paths and service naming |
| `net_interface` | empty | Network interface used to resolve the local IPv4 for all role hostnames |

`format_master` deletes RocksDB metadata and `format_worker` deletes the Worker data directory. Always set both to `false` in an existing production deployment; the shipped `etc/curvine-cluster.toml` does so.

## `[master]`

| Field | Default | Meaning |
| --- | --- | --- |
| `hostname` | `localhost` | Master hostname; overridden by `net_interface` or `CURVINE_MASTER_HOSTNAME` |
| `rpc_port` | `8995` | Master RPC port |
| `web_port` | `9001` | Master web UI / REST port |
| `io_threads` | `32` | Master RPC I/O threads |
| `worker_threads` | `max(32, 2 × CPU)` | Master RPC worker threads |
| `actor_threads` | `4` | Actor runtime threads |
| `io_timeout` | `10m` | Network read/write timeout |
| `io_close_idle` | `true` | Close idle Master RPC connections |
| `meta_request_concurrent` | `true` | Process metadata requests concurrently on one connection |
| `meta_dir` | `<cwd>/fs-meta` | RocksDB metadata directory |
| `min_block_size` | `1MB` | Minimum block size |
| `max_block_size` | `100GB` | Maximum block size |
| `min_replication` | `1` | Minimum replica count |
| `max_replication` | `100` | Maximum replica count |
| `max_path_len` | `8000` | Maximum path length |
| `max_path_depth` | `1000` | Maximum path depth |
| `retry_cache_enable` | `true` | Enable the filesystem request retry cache |
| `retry_cache_size` | `100000` | Retry cache capacity |
| `retry_cache_ttl` | `10m` | Retry cache TTL |
| `block_report_limit` | `100000` | Maximum block count per block report |
| `worker_policy` | `local` | Worker selection policy: `local`, `robin`, `random`, `load_based`, `weighted` |
| `executor_threads` | `10` | Master executor threads |
| `executor_channel_size` | `1000` | Master executor queue size |
| `heartbeat_interval` | `3s` | Worker heartbeat interval |
| `worker_check_interval` | `10s` | Worker state check interval |
| `worker_blacklist_interval` | `30s` | Time before an unhealthy Worker is blacklisted |
| `worker_lost_interval` | `10m` | Time before a Worker is marked lost |
| `audit_logging_enabled` | `true` | Enable audit logging |
| `block_replication_enabled` | `false` | Enable block replication management |
| `block_replication_concurrency_limit` | `1000` | Maximum concurrent replication jobs |
| `block_replication_retry_interval` | `5s` | Replication retry interval |
| `block_replication_submit_timeout` | `30s` | Deadline for the source Worker to accept a replication job |
| `block_replication_job_timeout` | `30m` | Deadline for a submitted replication attempt to report a result |
| `ttl_checker_retry_attempts` | `3` | TTL checker retry attempts |
| `ttl_checker_interval` | `1h` | TTL scan interval |
| `ttl_bucket_interval` | `1h` | TTL bucketing interval |
| `ttl_max_retry_duration` | `10m` | Maximum TTL retry duration |
| `ttl_retry_interval` | `1s` | TTL retry interval |
| `enable_quota_eviction` | `false` | Enable quota-driven eviction |
| `quota_eviction_mode` | `free` | Quota eviction mode |
| `quota_eviction_policy` | `lru` | Quota eviction policy |
| `quota_eviction_high_rate` | `0.8` | High watermark |
| `quota_eviction_low_rate` | `0.6` | Low watermark |
| `quota_eviction_scan_page` | `2` | Scan page count |
| `quota_eviction_dry_run` | `false` | Report eviction candidates without deleting |
| `quota_eviction_capacity` | `5000000` | Eviction scan capacity (entries) |
| `lock_expire_time` | `5m` | Stale file-lock expiration |
| `buffer_size` | `128KB` | Internal buffer size |
| `conn_limit` | `8` | Per-connection in-flight request limit; must be > 0 |
| `global_limit` | `4096` | Global in-flight request limit; must be > 0 |

`worker_policy = "local"` prefers a local Worker for the first replica and assigns the remaining replicas through the weighted policy. `weighted` allocates according to `worker.weight`.

`[master.rocksdb]` controls metadata RocksDB behavior. Its defaults come from `MasterConf::rocksdb_default()` (4 KB blocks, WAL disabled, bloom filters enabled, index/filter blocks cached and pinned).

`[master.compatibility]` is described in the Version Compatibility Policy section below.

## `[mds]`

The MDS is an optional standalone metadata service, started with `curvine-server --service mds`. It is disabled by default.

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `false` | Enable the MDS service |
| `hostname` | `localhost` | MDS hostname |
| `rpc_port` | `8998` | MDS RPC port |
| `web_port` | `9004` | MDS web / health port |
| `io_threads` | `4` | MDS RPC I/O threads |
| `worker_threads` | `8` | MDS RPC worker threads |
| `kv_backend` | `fdb` | KV backend: `fdb` or `memory` |
| `fdb_cluster_file` | `/etc/foundationdb/fdb.cluster` | FoundationDB cluster file; required when `kv_backend = "fdb"` |
| `fdb_txn_timeout_ms` | `5000` | Per-transaction FoundationDB timeout |
| `log` | `mds.log` | MDS log config |

`kv_backend = "memory"` is intended for tests only and loses all metadata when the process exits. `fdb_txn_timeout_ms` bounds how long an operation waits on an unreachable FoundationDB cluster; leave it at the default unless you have a specific reason to change it.

## `[journal]`

| Field | Default | Meaning |
| --- | --- | --- |
| `enable` | `true` | Enable Raft journal |
| `group_name` | `raft-group` | Raft group name |
| `hostname` | `localhost` | Local Raft hostname |
| `rpc_port` | `8996` | Raft RPC port |
| `io_threads` | `8` | Raft RPC I/O threads |
| `worker_threads` | `8` | Raft RPC worker threads |
| `message_size` | `200` | Raft RPC message size |
| `journal_addrs` | `[{id=1, hostname="localhost", port=8996}]` | Raft peers |
| `journal_dir` | `testing/journal-<random>` | Journal / Raft log directory |
| `writer_channel_size` | `0` | Journal writer queue size; `0` means unbounded |
| `writer_flush_batch_size` | `1000` | Journal flush batch size |
| `writer_flush_batch_ms` | `10` | Journal flush interval |
| `snapshot_interval` | `6h` | Follower snapshot trigger interval |
| `snapshot_min_interval` | `10m` | Minimum gap between snapshots; `0` disables the limit |
| `leader_create_snapshot` | unset | Whether the leader creates snapshots; unset means "only for a single-node group" |
| `snapshot_entries` | `1000000` | Entries between snapshots |
| `snapshot_read_chunk_size` | `1MB` | Snapshot read chunk size |
| `conn_retry_max_duration_ms` | `0` | Connection retry max duration |
| `conn_retry_min_sleep_ms` | `10000` | Connection retry min sleep |
| `conn_retry_max_sleep_ms` | `10000` | Connection retry max sleep |
| `rpc_close_idle` | `false` | Close idle Raft RPC connections |
| `rpc_retry_max_duration_ms` | `60000` | RPC retry max duration |
| `rpc_retry_min_sleep_ms` | `20000` | RPC retry min sleep |
| `rpc_retry_max_sleep_ms` | `20000` | RPC retry max sleep |
| `conn_timeout_ms` | `30000` | Connection timeout |
| `io_timeout_ms` | `60000` | RPC read/write timeout |
| `conn_size` | `1` | Shared connections per peer |
| `raft_tick_interval_ms` | `1000` | Raft tick interval |
| `raft_election_tick` | `10` | Election timeout in ticks |
| `raft_heartbeat_tick` | `3` | Heartbeat interval in ticks |
| `raft_min_election_ticks` | `10` | Raft randomized election lower bound |
| `raft_max_election_ticks` | `30` | Raft randomized election upper bound |
| `raft_check_quorum` | `true` | Enable quorum checks |
| `raft_max_size_per_msg` | `1MB` | Maximum message size |
| `raft_max_inflight_msgs` | `256` | Maximum in-flight messages |
| `raft_max_committed_size_per_ready` | `16MB` | Maximum committed size per ready |
| `raft_batch_size` | `8` | Batch append size |
| `raft_retry_cache_size` | `100000` | Raft retry cache capacity |
| `raft_retry_cache_ttl` | `10m` | Raft retry cache TTL |
| `retain_checkpoint_num` | `3` | Checkpoints to retain; `0` is rejected |
| `ignore_reply_error` | `false` | Skip unreplayable journal batches instead of failing |
| `max_retry_num` | `1000` | Maximum replay retries |
| `skip_failed_ufs_replay_after_retry` | `true` | Advance the UFS replay watermark after retries; metadata replay is never skipped |
| `scan_batch_size` | `1000` | Journal scan batch size |
| `retry_interval_secs` | `10` | Replay retry interval |
| `ufs_copy_timeout` | `20m` | Timeout for copying data to UFS |
| `recover_from_peers` | unset | Raft ID of one lost HA member to explicitly rebuild from healthy peers |

Key points:

- `journal_addrs` must list the Raft peers, and the effective local hostname must match one of the entries (or `net_interface` must resolve to a matching IPv4). Otherwise startup fails.
- `retain_checkpoint_num` also defines the retained log window (`retain_checkpoint_num × snapshot_entries` entries). Raising it increases journal disk usage.
- `leader_create_snapshot` defaults to creating snapshots only for a single-node group. A multi-node group with this key unset has no leader-side log compaction and logs an error every few minutes; set `leader_create_snapshot = true` for production HA clusters.
- `ignore_reply_error = true` can make a Master permanently diverge from its peers. Use it only for disaster recovery, never as a normal setting.
- `recover_from_peers` is normally only needed for an operator-directed rebuild of a stale but non-empty member. Wiped members are quarantined automatically on rejoin when the cluster is healthy.

## `[worker]`

| Field | Default | Meaning |
| --- | --- | --- |
| `hostname` | `localhost` | Worker hostname; overridden by `net_interface` or `CURVINE_WORKER_HOSTNAME` |
| `weight` | `1` | Relative allocation weight for `weighted` policy; `0` excludes the Worker from new allocations |
| `rpc_port` | `8997` | Worker RPC port |
| `web_port` | `9002` | Worker web / metrics port |
| `dir_reserved` | `0` | Fixed free space reserved per data directory |
| `free_ratio` | `0.0` | Strict free-space floor as a fraction of the device (`[0.0, 1.0)`); `0` disables |
| `data_dir` | `[]` | Worker data directories |
| `io_slow_threshold` | `300ms` | Slow I/O threshold |
| `io_threads` | `32` | Worker RPC I/O threads |
| `worker_threads` | `max(32, 2 × CPU)` | Worker RPC worker threads |
| `io_timeout` | `10m` | Worker network timeout |
| `io_close_idle` | `false` | Close idle Worker RPC connections |
| `scheduler_threads` | `2` | Scheduler threads |
| `executor_threads` | `10` | Background executor threads |
| `executor_channel_size` | `1000` | Background executor queue size |
| `enable_splice` | `false` | Enable splice optimization |
| `enable_send_file` | `true` | Enable sendfile optimization |
| `pipe_buf_size` | `64KB` | Pipe buffer size |
| `pipe_pool_init_cap` | `0` | Pipe pool initial capacity |
| `pipe_pool_max_cap` | `2000` | Pipe pool maximum capacity |
| `pipe_pool_idle_time` | `0` | Pipe idle recycle time |
| `block_replication_concurrency_limit` | `100` | Concurrent replication tasks |
| `block_replication_chunk_size` | `1MB` | Replication chunk size |
| `spdk_disk` | disabled | SPDK NVMe-oF/RDMA disk configuration |
| `compatibility` | diagnose | Version compatibility policy for data-plane peers |

`data_dir` entries support three forms:

```toml
data_dir = [
  "[SSD]/data/data1",          # storage type, capacity unbounded
  "[HDD:500GB]/data/data2",    # storage type + capacity
  "/data/data3"                # defaults to DISK, capacity unbounded
]
```

Storage types are `SSD`, `HDD`, `DISK`, and `MEM`. The Worker appends `cluster_id` below each path, so the effective data directory is `<path>/<cluster_id>`.

`dir_reserved` is a fixed byte reservation. `free_ratio` is a fraction of the physical device and also covers space consumed by other applications on the same disk. Both are enforced at write admission for new blocks and FileLayout rewrite staging copies.

`[worker.spdk_disk]` is only meaningful in server builds that enable SPDK (`build.sh --spdk` or `--spdk-rdma`). It contains `enabled`, `app_name`, `reactor_mask`, `qpair_acquire_timeout`, and a `targets` array (`trtype`, `adrfam`, `traddr`, `trsvcid`, `subnqn`).

## `[client]`

| Field | Default | Meaning |
| --- | --- | --- |
| `master_addrs` | `[]` | Master RPC addresses; derived if empty |
| `hostname` | `localhost` | Client hostname; overridden by `net_interface` or `CURVINE_CLIENT_HOSTNAME` |
| `io_threads` | `16` | Client RPC I/O threads |
| `worker_threads` | `max(16, 2 × CPU)` | Client RPC worker threads |
| `replicas` | `1` | Default replica count |
| `block_size` | `128MB` | Default block size |
| `write_chunk_size` | `128KB` | Write chunk size |
| `write_chunk_num` | `8` | Write chunks per pipeline |
| `read_chunk_size` | `128KB` | Read chunk size |
| `read_chunk_num` | `8` | Read chunks per pipeline |
| `read_parallel` | `1` | Base read parallelism |
| `read_slice_size` | `0` | Read slice size; `0` means `read_chunk_size × read_chunk_num` |
| `max_cache_block_handles` | `10` | Maximum cached block handles |
| `short_circuit` | `true` | Enable short-circuit reads |
| `storage_type` | `disk` | Default storage type |
| `ttl_ms` | `0` | Default TTL |
| `ttl_action` | `none` | Default TTL action |
| `auto_cache_enabled` | `false` | Automatically submit cache requests for UFS reads |
| `auto_cache_ttl` | `7d` | TTL for automatic cache entries |
| `conn_retry_max_duration_ms` | `60000` | Connection retry max duration |
| `conn_retry_min_sleep_ms` | `100` | Connection retry min sleep |
| `conn_retry_max_sleep_ms` | `2000` | Connection retry max sleep |
| `rpc_retry_max_duration_ms` | `120000` | RPC retry max duration |
| `rpc_retry_min_sleep_ms` | `100` | RPC retry min sleep |
| `rpc_retry_max_sleep_ms` | `10000` | RPC retry max sleep |
| `rpc_close_idle` | `true` | Close idle RPC connections |
| `conn_timeout_ms` | `30000` | Connection timeout |
| `rpc_timeout_ms` | `120000` | RPC timeout |
| `data_timeout_ms` | `120000` | Data transfer timeout |
| `pipeline_timeout_ms` | `120000` | Pipeline timeout |
| `master_conn_pool_size` | `1` | Connections per Master |
| `enable_read_ahead` | `true` | Enable read-ahead |
| `read_ahead_len` | `0` | Read-ahead length; `0` means `read_chunk_size × read_chunk_num` |
| `drop_cache_len` | `1MB` | Data length above which the page cache is dropped after reads |
| `failed_worker_ttl_ms` | `600000` | How long a failed Worker stays blacklisted |
| `enable_unified_fs` | `true` | Enable the unified filesystem view |
| `enable_rust_read_ufs` | `true` | Allow direct UFS reads on cache miss |
| `audit_logging_enabled` | `true` | Emit client audit logs |
| `mount_update_ttl_ms` | `10000` | Mount metadata refresh interval |
| `umask` | `022` | File creation umask (octal) |
| `metric_report_enable` | `true` | Report client metrics |
| `clean_task_interval_ms` | `60000` | Cleanup task interval |
| `close_timeout_secs` | `5` | Close timeout |
| `sync_check_interval_min_ms` | `100` | Minimum UFS sync polling interval |
| `sync_check_interval_max_ms` | `1000` | Maximum UFS sync polling interval |
| `max_sync_wait_timeout_ms` | `300000` | Maximum wait for a sync job |
| `sync_check_log_tick` | `3` | Polls between sync progress logs |
| `enable_block_conn_pool` | `true` | Enable the block connection pool |
| `block_conn_idle_size` | `128` | Idle block connections retained |
| `block_conn_idle_time_ms` | `60000` | Block connection idle time |
| `small_file_size` | `4MB` | Small-file threshold |
| `enable_smart_prefetch` | `true` | Enable smart prefetch |
| `large_file_size` | `10GB` | Large-file threshold |
| `max_read_parallel` | `8` | Maximum dynamic read parallelism |
| `sequential_read_threshold` | `7` | Sequential-read detection threshold |

Size values are strings such as `"128MB"`, `"4MB"`, or `"10GB"`. Duration fields ending in `_ms` accept integer milliseconds. The older unsuffixed aliases (`mount_update_ttl`, `sync_check_interval_min`, and so on) are still accepted.

## `[fuse]`

| Field | Default | Meaning |
| --- | --- | --- |
| `debug` | `false` | Log FUSE request/response traffic |
| `audit_logging_enabled` | `false` | Emit FUSE audit logs |
| `metrics_enabled` | `true` | Emit FUSE request/error/latency metrics |
| `io_threads` | `32` | FUSE I/O threads |
| `mnt_path` | `/curvine-fuse` | Mount path |
| `fs_path` | `/` | Visible Curvine root within the mount |
| `mnt_number` | `1` | Number of mount points (`mnt-0`, `mnt-1`, ... under `mnt_path`) |
| `tasks_per_mnt` | `0` | Per-mount I/O tasks; `0` follows `io_threads` |
| `clone_fd` | `true` | Enable clone-fd optimization |
| `fuse_channel_size` | `0` | FUSE request queue size; `0` uses the backend default |
| `stream_channel_size` | `0` | Read/write request queue size; `0` uses the backend default |
| `fuse_opts` | `[]` | Extra mount options (see below) |
| `readonly` | `false` | Mount read-only at the kernel level |
| `umask` | `022` | Umask for synthesized `.`/`..` permission bits |
| `uid` / `gid` | current process | Default owner of mounted entries |
| `web_port` | `9003` | FUSE web / metrics port |
| `read_dir_fill_ino` | `true` | Fill node IDs while listing directories |
| `entry_timeout` | `1s` | Kernel dentry cache timeout |
| `negative_timeout` | `0` | Kernel negative-lookup cache timeout; `0` disables |
| `attr_timeout` | `1s` | Kernel attribute cache timeout |
| `remember` | `false` | Remember opened files and directories |
| `max_background` | `256` | Maximum background requests |
| `congestion_threshold` | `192` | Congestion threshold; must be ≤ `max_background` |
| `enable_meta_cache` | `false` | Enable the userspace metadata cache |
| `meta_cache_timeout` | `60s` | Userspace metadata cache TTL |
| `node_cache_timeout` | `1h` | Inode/node map eviction TTL |
| `direct_io` | `false` | Bypass the kernel page cache for all opens |
| `open_direct_on_stale` | `false` | Per-open direct I/O when local metadata is stale |
| `write_back_cache` | `false` | Let the kernel buffer writes |
| `cache_readdir` | `false` | Cache directory listings |
| `non_seekable` | `false` | Mark files non-seekable |
| `check_permission` | `true` | Enforce permission checks |
| `state_dir` | system temp dir | Directory for persisted FUSE state |
| `max_readahead_kb` | unset | Override the BDI `read_ahead_kb`; unset keeps the kernel default |
| `list_limit` | `1000` | Directory listing limit |
| `enable_splice` | `true` | Use splice/vmsplice for FUSE data transfer |
| `path_lock_stripes` | `1024` | Path lock stripes |

Notes:

- `meta_cache_capacity` and `node_cache_size` were removed. Use `meta_cache_timeout` and `node_cache_timeout` instead.
- `negative_timeout = 0` disables negative-lookup caching; it does not mean "cache forever".
- `direct_io` and `write_back_cache` cannot both be enabled; startup rejects the combination.
- `fuse_opts` supports the VFS pairs `ro`/`rw`, `nodev`/`dev`, `nosuid`/`suid`, `noexec`/`exec`, `noatime`/`atime`, `sync`/`async`, plus `dirsync`, `allow_other`, `default_permissions`, and `big_write`. The legacy libfuse options `auto_unmount`, `allow_root`, and `max_write` are not supported by the direct mount backend.
- Duration values accept strings (`"1s"`, `"500ms"`, `"1h"`) or bare integers interpreted as milliseconds. The older `*_ms` keys remain aliases.

## `[log]`, `[cli]`, `[job]`

### Global `[log]`

The top-level `[log]` section is shared by the Rust client and FUSE. Each service also has its own nested `log` table (`master.log`, `worker.log`, `mds.log`, `transfer.log`) and the CLI has `[cli].log`.

| Field | Default | Meaning |
| --- | --- | --- |
| `level` | `INFO` | Log level |
| `log_dir` | `stdout` | `stdout`, `stderr`, or a directory for file logging |
| `file_name` | empty | Base log file name; empty means `curvine` |
| `max_log_files` | `10` | Rotated files to keep |
| `max_file_size_mb` | `100` | Size-based rotation threshold; `0` means no size limit |
| `time_rotation` | empty | `daily` or `hourly`; empty means no time-based rotation |
| `display_thread` | `false` | Include thread name and ID |
| `display_position` | `true` | Include source location |
| `targets` | `[]` | Split named log targets into separate files |

Rotation only applies when `log_dir` is a directory. With size and time rotation both unset, files rotate by size at 100 MB. If `max_file_size_mb = 0` and no valid `time_rotation` is configured, files rotate daily so they cannot grow without limit.

### `[cli]`

`CliConf` contains only `log`. The default CLI log level is `warn`, with output to stdout.

### `[job]`

`[job]` configures the legacy Master-side job implementation used by clients with `transfer.enabled = false`. Transfer jobs use `[transfer]` for ownership, recovery, and retention.

| Field | Default | Meaning |
| --- | --- | --- |
| `job_life_ttl` | `24h` | Job record lifetime |
| `job_cleanup_ttl` | `10m` | Cleanup interval for expired jobs |
| `terminal_retention` | `10m` | How long terminal jobs stay queryable |
| `job_max_files` | `100000` | Maximum files per job |
| `master_max_concurrent_load_jobs` | `16` | Concurrent Master-side load planning jobs |
| `master_max_background_load_jobs` | `1024` | Background load jobs allowed to wait |
| `master_max_pending_load_job_submits` | `4096` | Pending submit requests before admission |
| `master_load_job_runtime_threads` | `4` | Runtime threads reserved for load planning |
| `master_load_job_blocking_threads` | `16` | Blocking threads reserved for load planning |
| `master_failed_load_job_retry_interval` | `30s` | Reuse window for deterministic source-not-found failures |
| `task_timeout` | `1h` | Maximum task execution time |
| `task_report_interval` | `10s` | Task progress report interval |
| `worker_max_concurrent_tasks` | `100` | Maximum concurrent tasks per Worker |

## `[transfer]`

`[transfer]` is read by the standalone Transfer service and by clients that submit Load and Export work to it. A Transfer service also needs the normal `[client]` Master addresses. During a staged rollout, keep this section disabled in the Master and Worker configuration and enable it only in the Transfer and selected client configurations.

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `false` | Enable Transfer routing in this process. On a client, `load` and `export` use Transfer; on a Transfer server, it starts the service. |
| `store_url` | empty; inferred as `sqlite://data/transfer/transfer.db` | State store URL. Schemes: `memory://`, `sqlite://`, `mysql://`, `postgres://`, `postgresql://`. Use one shared `mysql://` or `postgres://` URL for multiple instances. |
| `hostname` | `localhost` | RPC and web bind hostname when explicit endpoints are not supplied |
| `rpc_port` | `9010` | Transfer RPC port |
| `web_port` | `9011` | Health and metrics HTTP port |
| `endpoints` | `["<hostname>:<rpc_port>"]` | Client-facing Transfer RPC addresses; use a Service or load-balancer address |
| `instance_id` | empty | Optional stable service owner ID; a UUID is generated when empty |
| `max_running_transfers` | `64` | Maximum jobs this instance executes concurrently |
| `client_pending_queue_size` | `1024` | Maximum auto-cache requests waiting for or performing submission |
| `client_submit_concurrency` | `64` | Maximum concurrent client-side auto-cache submissions |
| `max_tasks_per_transfer` | `100000` | Maximum tasks per transfer job |
| `ufs_max_concurrency_per_endpoint` | `32` | Maximum concurrent tasks per UFS endpoint |
| `task_max_retries` | `3` | Maximum task retries |
| `lease_timeout` | `120s` | Ownership lease duration used for recovery and multi-instance coordination |
| `terminal_retention` | `168h` | Retention for completed, failed, and canceled job records |
| `log` | `transfer.log` | Transfer log config |

Do not use the deprecated inputs `store_type`, `sqlite_path`, or `mysql_url` in new configurations. `store_url` selects the backend from its scheme. Internal queue, probe, and scheduler values are not part of the supported user configuration surface.

For PostgreSQL with a private CA, append `sslrootcert=/path/to/ca.pem` to the `store_url`; TLS validates the system trust store by default.

## `[discovery]`

Service discovery is disabled by default. When enabled, the only supported provider is etcd.

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `false` | Enable etcd discovery |
| `provider` | `etcd` | Discovery provider; must be `etcd` when enabled |
| `endpoints` | `[]` | etcd endpoints, for example `["http://etcd-0:2379"]` |
| `prefix` | `/curvine` | Absolute etcd key prefix |
| `connect_timeout_ms` | `3000` | etcd connect timeout |
| `request_timeout_ms` | `3000` | etcd request timeout |
| `watch_reconnect_min_ms` | `1000` | Watch reconnect backoff lower bound |
| `watch_reconnect_max_ms` | `30000` | Watch reconnect backoff upper bound |
| `watch_reconnect_jitter_ratio` | `0.2` | Watch reconnect jitter ratio (`0.0`–`1.0`) |
| `allow_stale_cache` | `true` | Return stale cache while the watch is disconnected |

When discovery is enabled, `cluster_id` must contain only lowercase letters, digits, `_`, and `-`. Effective keys are `{prefix}/{cluster_id}/services/{kind}/{service_id}`.

## `[fault_injection]`

Test-only fault control plane. It is disabled by default and must not be enabled in normal deployments.

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `false` | Expose fault HTTP routes |
| `auth_token_env` | `CURVINE_FAULT_TOKEN` | Environment variable holding the bearer token |

The HTTP routes require binaries built with the `fault-injection` Cargo feature (for example `curvine-server/fault-injection`). Enabling `[fault_injection]` without that feature fails server startup instead of silently omitting the route.

## Version Compatibility Policy

`[master.compatibility]` and `[worker.compatibility]` share the same fields:

| Field | Default | Meaning |
| --- | --- | --- |
| `mode` | `diagnose` | `diagnose` logs incompatibilities; `enforce` rejects incompatible peers |
| `min_worker_version` | empty | Lowest Worker release accepted by the Master (empty = not enforced) |
| `min_client_version` | empty | Lowest client release accepted (empty = not enforced) |
| `blocked_versions` | `[]` | Versions rejected regardless of mode |

The protocol version range is a code-level contract, not an operator setting. Invalid mode strings and unparseable version bounds degrade to the lenient default instead of failing closed.

`enforce` mode requires Workers that report `component_info` on their heartbeat. Workers older than the release that introduced this field resolve to `MissingInfo` and are rejected, so keep `diagnose` until the whole Worker fleet has been upgraded.

## Example Skeleton

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
