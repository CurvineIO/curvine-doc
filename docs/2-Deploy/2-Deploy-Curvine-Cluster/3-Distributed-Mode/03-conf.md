# Configuration Reference

This page describes the configuration layout used by the current `main` branch of Curvine. It is intentionally based on the actual config structs in `curvine-common/src/conf/*.rs` and the sample file `etc/curvine-cluster.toml`, rather than on older generated tables.

:::tip
Treat `conf/curvine-cluster.toml` as the runtime source of truth, and use this page as a map of the important sections and high-signal options. For the complete field list, check the config structs in the Curvine source tree.
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
| `CURVINE_WORKER_HOSTNAME` | Override the effective Worker hostname |
| `CURVINE_CLIENT_HOSTNAME` | Override the client hostname used for locality checks |

## Top-Level Layout

The current `ClusterConf` contains these main sections:

| Section | Purpose |
| --- | --- |
| top-level flags | `format_master`, `format_worker`, `testing`, `cluster_id` |
| `[master]` | Master RPC, web, metadata, TTL, quota, replication, locking |
| `[journal]` | Raft / journal settings |
| `[worker]` | Worker RPC, storage directories, replication, data path execution |
| `[client]` | Rust client defaults, retries, read/write buffers, unified FS behavior |
| `[fuse]` | FUSE mount and cache settings |
| `[log]` | Global client / FUSE log settings |
| `[s3_gateway]` | S3-compatible gateway settings |
| `[job]` | Load-job lifecycle and concurrency settings |
| `[cli]` | CLI log settings |

:::warning
This page documents only the configuration sections that are part of the current published documentation surface.
:::

## Cluster-Level Flags

| Field | Default | Meaning |
| --- | --- | --- |
| `format_master` | `true` | Format Master metadata storage on startup |
| `format_worker` | `true` | Format Worker data storage on startup |
| `testing` | `false` | Test-only mode for internal test flows |
| `cluster_id` | `curvine` | Cluster identifier used in paths and service naming |

In production, these format flags are usually set to `false` in the deployed TOML file.

## `[master]`

Important Master defaults from `MasterConf`:

| Field | Default | Meaning |
| --- | --- | --- |
| `hostname` | `localhost` | Master hostname, can be overridden by `CURVINE_MASTER_HOSTNAME` |
| `rpc_port` | `8995` | Master RPC port |
| `web_port` | `9000` | Master web port |
| `io_threads` | `32` | Master I/O threads |
| `io_timeout` | `10m` | Master network timeout |
| `meta_dir` | `<cwd>/fs-meta` | Metadata directory |
| `retry_cache_enable` | `true` | Enable retry cache for filesystem requests |
| `retry_cache_size` | `100000` | Retry cache capacity |
| `retry_cache_ttl` | `10m` | Retry cache TTL |
| `block_report_limit` | `1000` | Maximum block count per report |
| `worker_policy` | `local` | Worker selection policy |
| `heartbeat_interval` | `3s` | Worker heartbeat interval |
| `worker_check_interval` | `10s` | Interval to check worker state |
| `worker_blacklist_interval` | `30s` | Time to blacklist unhealthy workers |
| `worker_lost_interval` | `10m` | Time to mark workers as lost |
| `audit_logging_enabled` | `true` | Enable audit logging |
| `block_replication_enabled` | `false` | Enable block replication management |
| `block_replication_concurrency_limit` | `1000` | Maximum concurrent replication tasks |
| `block_replication_retry_interval` | `5s` | Replication retry interval |
| `ttl_checker_retry_attempts` | `3` | TTL checker retry attempts |
| `ttl_checker_interval` | `1h` | TTL scan interval |
| `ttl_bucket_interval` | `1h` | TTL bucketing interval |
| `ttl_max_retry_duration` | `10m` | TTL retry max duration |
| `ttl_retry_interval` | `1s` | TTL retry interval |
| `enable_quota_eviction` | `false` | Enable quota-driven eviction |
| `quota_eviction_mode` | `free` | Quota eviction mode |
| `quota_eviction_policy` | `lru` | Quota eviction policy |
| `quota_eviction_high_rate` | `0.8` | High watermark |
| `quota_eviction_low_rate` | `0.6` | Low watermark |
| `quota_eviction_scan_page` | `2` | Scan page count |
| `quota_eviction_capacity` | `5000000` | Eviction scan capacity |
| `lock_expire_time` | `5m` | Stale lock expiration |
| `buffer_size` | `128KB` | Internal buffer size |

`[master.rocksdb]` exists as a nested section and controls metadata RocksDB behavior. The defaults are defined by `MasterConf::rocksdb_default()`.

## `[journal]`

Important journal / Raft defaults from `JournalConf`:

| Field | Default | Meaning |
| --- | --- | --- |
| `enable` | `true` | Enable Raft journal |
| `group_name` | `raft-group` | Raft group name |
| `hostname` | `localhost` | Local Raft hostname |
| `rpc_port` | `8996` | Raft RPC port |
| `message_size` | `200` | Raft RPC message size |
| `writer_channel_size` | `0` | Journal writer queue size |
| `writer_flush_batch_size` | `1000` | Journal flush batch size |
| `writer_flush_batch_ms` | `10` | Journal flush interval |
| `snapshot_interval` | `6h` | Snapshot interval |
| `snapshot_entries` | `1000000` | Entries between snapshots |
| `conn_timeout_ms` | `30000` | Connection timeout |
| `io_timeout_ms` | `60000` | I/O timeout |
| `raft_tick_interval_ms` | `1000` | Raft tick interval |
| `raft_election_tick` | `10` | Election ticks |
| `raft_heartbeat_tick` | `3` | Heartbeat ticks |
| `raft_batch_size` | `8` | Batch append size |
| `raft_retry_cache_ttl` | `10m` | Retry cache TTL |
| `retain_checkpoint_num` | `3` | Checkpoints to retain |
| `ufs_copy_timeout` | `20m` | Timeout for copying data to UFS |

`journal_addrs` must contain the Raft peers, and the effective local Master hostname must match one of those entries.

## `[worker]`

Important Worker defaults from `WorkerConf`:

| Field | Default | Meaning |
| --- | --- | --- |
| `hostname` | `localhost` | Worker hostname, can be overridden by `CURVINE_WORKER_HOSTNAME` |
| `rpc_port` | `8997` | Worker RPC port |
| `web_port` | `9001` | Worker web port |
| `dir_reserved` | `0` | Reserved free space per data directory |
| `data_dir` | `[]` | Worker data directories |
| `io_slow_threshold` | `300ms` | Slow I/O threshold |
| `io_threads` | `32` | Worker I/O threads |
| `io_timeout` | `10m` | Worker network timeout |
| `scheduler_threads` | `2` | Scheduler threads |
| `executor_threads` | `10` | Background executor threads |
| `enable_splice` | `false` | Enable splice optimization |
| `enable_send_file` | `true` | Enable sendfile optimization |
| `pipe_buf_size` | `64KB` | Pipe buffer size |
| `pipe_pool_max_cap` | `2000` | Pipe pool max capacity |
| `block_replication_concurrency_limit` | `100` | Concurrent replication tasks |
| `block_replication_chunk_size` | `1MB` | Replication chunk size |
| `enable_s3_gateway` | `false` | Enable colocated S3 gateway |

The most important production field is usually `data_dir`, for example:

```toml
data_dir = [
  "[SSD]/data/data1",
  "[HDD]/data/data2"
]
```

## `[client]`

Important client defaults from `ClientConf`:

| Field | Default | Meaning |
| --- | --- | --- |
| `master_addrs` | `[]` | If empty, derived from `journal_addrs` + Master RPC port |
| `hostname` | `localhost` | Client hostname, can be overridden by `CURVINE_CLIENT_HOSTNAME` |
| `replicas` | `1` | Default replica count |
| `block_size` | `128MB` | Default block size |
| `write_chunk_size` | `128KB` | Write chunk size |
| `read_chunk_size` | `128KB` | Read chunk size |
| `read_parallel` | `1` | Base read parallelism |
| `max_cache_block_handles` | `10` | Max cached block handles |
| `short_circuit` | `true` | Enable short-circuit path selection |
| `storage_type` | `disk` | Default storage type |
| `ttl_ms` | `0` | Default TTL |
| `ttl_action` | `none` | Default TTL action |
| `auto_cache_enabled` | `false` | Enable automatic cache submission |
| `auto_cache_ttl` | `7d` | TTL for automatic cache |
| `master_conn_pool_size` | `1` | Master connection pool size |
| `enable_read_ahead` | `true` | Enable read-ahead |
| `enable_unified_fs` | `true` | Enable unified filesystem view |
| `enable_rust_read_ufs` | `true` | Allow direct UFS reads on cache miss |
| `mount_update_ttl` | `10s` | Mount metadata refresh interval |
| `enable_block_conn_pool` | `true` | Enable block connection pool |
| `block_conn_idle_size` | `128` | Idle block connections retained |
| `small_file_size` | `4MB` | Threshold for small-file behavior |
| `enable_smart_prefetch` | `true` | Enable smart prefetch |
| `large_file_size` | `10GB` | Large-file threshold |
| `max_read_parallel` | `8` | Maximum dynamic read parallelism |
| `sequential_read_threshold` | `7` | Sequential-read detection threshold |

## `[fuse]`

Important FUSE defaults from `FuseConf`:

| Field | Default | Meaning |
| --- | --- | --- |
| `mnt_path` | `/curvine-fuse` | Mount path |
| `fs_path` | `/` | Visible Curvine root within the mount |
| `mnt_number` | `1` | Number of mount points |
| `clone_fd` | `true` | Enable clone-fd optimization |
| `web_port` | `9002` | FUSE web port |
| `enable_meta_cache` | `false` | Enable metadata cache |
| `meta_cache_capacity` | `100000` | Metadata cache capacity |
| `meta_cache_ttl` | `120s` | Metadata cache TTL |
| `node_cache_size` | `200000` | Node cache capacity |
| `node_cache_timeout` | `24h` | Node cache TTL |
| `direct_io` | `false` | Enable direct I/O |
| `write_back_cache` | `false` | Enable write-back cache |
| `cache_readdir` | `false` | Cache readdir results |
| `check_permission` | `true` | Enforce permission checks |
| `list_limit` | `1000` | Directory listing limit |

## `[log]`, `[cli]`, `[job]`, `[s3_gateway]`

### Global `[log]`

The top-level `[log]` section is the shared client/FUSE log config. In the sample config it commonly points to stdout, but it can also be redirected to files.

### `[cli]`

`CliConf` is intentionally small: it currently contains only `log`, and the default CLI log level is `warn`.

### `[job]`

Important job defaults from `JobConf`:

| Field | Default |
| --- | --- |
| `job_life_ttl` | `24h` |
| `job_cleanup_ttl` | `10m` |
| `job_max_files` | `100000` |
| `task_timeout` | `1h` |
| `task_report_interval` | `10s` |
| `worker_max_concurrent_tasks` | `100` |

### `[s3_gateway]`

Important S3 gateway defaults from `S3GatewayConf`:

| Field | Default |
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

## Example Skeleton

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
