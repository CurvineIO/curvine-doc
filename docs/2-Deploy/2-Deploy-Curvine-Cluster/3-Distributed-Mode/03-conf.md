# Configuration Reference

This chapter provides detailed descriptions of Curvine configuration options.

## Cluster Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| format_master | true | Controls whether to format Master metadata storage |
| format_worker | true | Controls whether to format Worker data storage |
| testing | false | Marks whether in testing mode, data flow is disabled in testing mode |
| cluster_id | curve | Unique identifier for the cluster |

## Master Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| master.hostname | localhost | Master service hostname, can be overridden by environment variable CURVINE_MASTER_HOSTNAME |
| master.rpc_port | 8995 | Master service RPC port |
| master.web_port | 9000 | Master service Web port |
| master.io_threads | 32 | Number of Master service I/O threads |
| master.worker_threads | CPU cores * 2 | Number of Master service worker threads |
| master.io_timeout | 10m | Master network read/write data timeout |
| master.io_close_idle | true | Whether to close idle connections |
| master.meta_dir | ./fs-meta | Metadata storage directory |
| master.meta_disable_wal | true | Whether to disable RocksDB's Write-Ahead Log (WAL) |
| master.meta_compression_type | none | Compression type for metadata storage |
| master.meta_db_write_buffer_size | 0 | Database write buffer size for metadata storage |
| master.meta_write_buffer_size | 64MB | Write buffer size for metadata storage |
| master.min_block_size | 1024 * 1024 | Minimum block_size |
| master.max_block_size | 100 * 1024 * 1024 * 1024 | Maximum block_size |
| master.min_replication | 1 | Minimum number of replicas |
| master.max_replication | 100 | Maximum number of replicas |
| master.block_replication_enabled | false | Whether to enable block replica count limit |
| master.block_replication_concurrency_limit | 1000 | Maximum number of concurrent replication tasks on Master side |
| master.max_path_len | 8000 | Maximum path length |
| master.max_path_depth | 1000 | Maximum path depth |
| master.retry_cache_enable | true | Whether to enable filesystem request retry cache |
| master.retry_cache_size | 100_000 | Size of retry cache |
| master.retry_cache_ttl | 10m | Expiration time of retry cache |
| master.block_report_limit | 1000 | Block report limit, maximum number of blocks allowed per report |
| master.worker_policy | local | Worker selection policy, default local, prioritizes workers on the same node as client |
| master.executor_threads | 10 | Number of master background task executor threads |
| master.executor_channel_size | 1000 | Master background task executor channel size |
| master.heartbeat_check_interval | 5m | Interval for Master to check Worker heartbeats |
| master.heartbeat_interval | 3s | Interval for Worker to send heartbeats |
| master.audit_logging_enabled | true | Whether to enable audit logging |
| master.log | `{level: "info", log_dir: "stdout"}` | Master log configuration, defaults to stdout output |

## Journal Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| enable | true | If raft log sync is enabled, logs will be synchronized; if disabled, equivalent to single-node system |
| group_name | raft-group | Raft group name |
| rpc_port | 8996 | RPC port number |
| io_threads | 8 | Number of I/O threads |
| worker_threads | 8 | Number of worker threads |
| message_size | 200 | Message size |
| journal_addrs | `{id: 1, hostname: "localhost", port: 8996}` | List of Master candidate node addresses |
| journal_dir | ./journal | Raft log storage directory |
| writer_debug | false | Whether to enable debug mode for write operations, prints each log entry when enabled |
| writer_channel_size | 0 | Buffer queue size for journal writing, defaults to unbounded queue |
| writer_flush_batch_size | 1000 | Number of entries for write operation batch flush |
| writer_flush_batch_ms | 100 | Time interval for write operation batch flush (milliseconds) |
| snapshot_interval | 6h | Snapshot creation interval |
| snapshot_entries | 100_000 | Number of entries generated after creating snapshot |
| snapshot_read_chunk_size | 1024 * 1024 | Snapshot read chunk size |
| conn_retry_max_duration_ms | 0 | Maximum duration for connection retry (milliseconds) |
| conn_retry_min_sleep_ms | 10 * 1000 | Minimum sleep time for connection retry (milliseconds) |
| conn_retry_max_sleep_ms | 10 * 1000 | Maximum sleep time for connection retry (milliseconds) |
| rpc_close_idle | false | Whether to close idle RPC connections |
| rpc_retry_max_duration_ms | 60 * 1000 | Maximum duration for RPC request retry (milliseconds) |
| rpc_retry_min_sleep_ms | 20 * 1000 | Minimum sleep time for RPC request retry (milliseconds) |
| rpc_retry_max_sleep_ms | 20 * 1000 | Maximum sleep time for RPC request retry (milliseconds) |
| conn_timeout_ms | 30 * 1000 | Connection timeout (milliseconds), default 30 seconds |
| io_timeout_ms | 60 * 1000 | Socket data read/write timeout (milliseconds), default 60 seconds |
| conn_size | 1 | Number of available connections when sharing connections |
| raft_poll_interval_ms | 100 | Raft polling interval (milliseconds) |
| raft_tick_interval_ms | 1000 | Raft heartbeat interval (milliseconds) |
| raft_election_tick | 10 | Raft election timeout cycles |
| raft_heartbeat_tick | 3 | Raft heartbeat timeout cycles |
| raft_min_election_ticks | 10 | Raft minimum election timeout cycles |
| raft_max_election_ticks | 30 | Raft maximum election timeout cycles |
| raft_check_quorum | true | Whether to check quorum |
| raft_max_size_per_msg | 1024 * 1024 | Maximum size per message |
| raft_max_inflight_msgs | 256 | Maximum number of unacknowledged messages |
| raft_max_committed_size_per_ready | 16 * 1024 * 1024 | Maximum commit size per ready state |
| raft_retry_cache_size | 100_000 | Raft request retry cache size, prevents duplicate requests |
| raft_retry_cache_ttl | 10m | Expiration time for raft request retry cache |
| retain_checkpoint_num | 3 | Number of checkpoints to retain |
| ignore_replay_error | false | Whether to ignore errors during log replay |

## Worker Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| worker.dir_reserved | 0 | Directory reserved space configuration |
| worker.data_dir | vec![] | Worker data directory list |
| worker.io_slow_threshold | 300ms | Worker I/O operation slow threshold, operations exceeding this time are considered slow |
| worker.io_threads | 32 | Number of Worker network I/O threads |
| worker.worker_threads | CPU cores * 2 | Number of Worker worker threads |
| worker.io_timeout | 10m | Worker network read/write data timeout |
| worker.io_close_idle | false | Whether to close idle connections, defaults to false since client doesn't implement heartbeat mechanism; uses keepalive to check connection validity |
| worker.block_replication_concurrency_limit | 100 | Maximum number of concurrent replication tasks on Worker side |
| worker.block_replication_chunk_size | 1024 * 1024 | Data chunk size during replication |
| worker.scheduler_threads | 2 | Number of background scheduling task threads |
| worker.executor_threads | 10 | Number of background asynchronous task threads |
| worker.executor_channel_size | 1000 | Background asynchronous task queue size |
| worker.log | `{level: "info", log_dir: "stdout"}` | Worker log configuration, defaults to stdout output |

### Worker Data Loading Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| worker.load.task_status_report_interval_ms | 5000 | Progress report interval (milliseconds) |
| worker.load.task_read_chunk_size_bytes | 1024 * 1024 | Default chunk size (bytes) |
| worker.load.task_transfer_buffer_count | 16 | Default buffer cache count |
| worker.load.task_timeout_seconds | 3600 | Task timeout (seconds), -1 means no timeout |
| worker.load.task_transfer_max_concurrent_tasks | 5 | Maximum concurrent tasks |

## Client Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| client.master_addrs | localhost:8995 | Master node address list |
| client.hostname | localhost | Hostname of the machine where client is located, needs to be set in certain scenarios to identify if client and worker nodes are on the same machine |
| client.io_threads | 16 | Number of client I/O threads |
| client.worker_threads | CPU cores * 2 | Number of client worker threads |
| client.replicas | 1 | Default number of replicas |
| client.block_size | 128MB | Block size (bytes), actual value converted from block_size_str |
| client.write_chunk_size | 128KB | Write buffer size |
| client.write_chunk_num | 8 | Write buffer queue length |
| client.read_chunk_size | 128KB | Read buffer size |
| client.read_chunk_num | 32 | Read buffer queue length |
| client.read_parallel | 1 | Parallelism for reading files |
| client.read_slice_size | 0 | Read slice size (bytes), default value is read_chunk_size * read_chunk_num |
| client.close_reader_limit | 20 | In random read scenarios, if block switching due to seek operations exceeds this value, all block readers will be cached |
| client.short_circuit | true | Whether to enable short-circuit functionality |
| client.storage_type | disk | Default storage type |
| client.ttl_ms | 0 | Default data cache time (milliseconds) |
| client.ttl_action | none | Action after cache expiration |
| client.auto_cache_enabled | false | Whether to enable auto-cache functionality, when enabled, reading files from external filesystem will automatically submit load requests to master and cache files |
| client.auto_cache_ttl | 7d | Default TTL for auto-cache, format is number plus unit or pure number (seconds) |
| client.conn_retry_max_duration_ms | 2 * 60 * 1000 | Maximum duration for connection retry (milliseconds) |
| client.conn_retry_min_sleep_ms | 300 | Minimum sleep time for connection retry (milliseconds) |
| client.conn_retry_max_sleep_ms | 10 * 1000 | Maximum sleep time for connection retry (milliseconds) |
| client.rpc_retry_max_duration_ms | 5 * 60 * 1000 | Maximum duration for RPC request retry (milliseconds) |
| client.rpc_retry_min_sleep_ms | 300 | Minimum sleep time for RPC request retry (milliseconds) |
| client.rpc_retry_max_sleep_ms | 30 * 1000 | Maximum sleep time for RPC request retry (milliseconds) |
| client.rpc_close_idle | true | Whether to close idle RPC connections |
| client.conn_timeout_ms | 30 * 1000 | Connection timeout (milliseconds) |
| client.rpc_timeout_ms | 120 * 1000 | RPC request timeout (milliseconds) |
| client.data_timeout_ms | 5 * 60 * 1000 | Data transfer timeout (milliseconds) |
| client.master_conn_pool_size | 1 | Master node connection pool size, testing shows 3 connections perform best, default is 1 |
| client.enable_read_ahead | true | Whether to enable read-ahead functionality |
| client.read_ahead_len | 0 | Read-ahead length (bytes), default value is read_chunk_size * read_chunk_num |
| client.drop_cache_len | 0 | Drop cache length (bytes) |
| client.failed_worker_ttl_str | 10m | Worker node blacklist expiration time |

## FUSE Configuration

| Configuration Item | Default Value | Description |
|-------------------|---------------|-------------|
| fuse.debug | false | Whether to output request/response logs |
| fuse.io_threads | 32 | Number of I/O threads |
| fuse.worker_threads | CPU cores * 2 | Number of worker threads |
| fuse.mnt_path | /curvine-fuse | Mount path |
| fuse.fs_path | / | Specifies the root path of filesystem accessed by mount point |
| fuse.mnt_number | 1 | Number of mount points |
| fuse.mnt_per_task | 0 (initialized to io_threads value if 0) | Number of tasks that can read/write data per mount point |
| fuse.clone_fd | true | Whether to enable clone fd functionality |
| fuse.fuse_channel_size | 0 | Fuse request queue size, 0 uses unbounded queue |
| fuse.stream_channel_size | 0 | Read/write file request queue size, 0 uses unbounded queue |
| fuse.fuse_opts | [] | Mount configuration, needs to be passed to Linux kernel |
| fuse.umask | 022 | Overrides permission bits set by filesystem in st_mode, represented in octal |
| fuse.uid | sys::get_uid() | User ID |
| fuse.gid | sys::get_gid() | Group ID |
| fuse.auto_cache | false | Whether to enable auto-cache |
| fuse.read_dir_fill_ino | true | Whether to fill fuse node ID when traversing directories |
| fuse.entry_timeout | 1.0 | Name lookup cache time (seconds) |
| fuse.negative_timeout | 0.0 | Timeout for caching negative lookups (seconds), 0 means disabled |
| fuse.attr_timeout | 1.0 | Cache time for file and directory attributes (seconds) |
| fuse.ac_attr_timeout | 1.0 | Timeout for file attribute cache during auto-cache refresh (seconds) |
| fuse.ac_attr_timeout_set | 1.0 | Timeout for file attribute cache during auto-cache refresh (seconds) |
| fuse.remember | false | Whether filesystem remembers opened files and directories |
| fuse.max_background | 256 | Maximum concurrent execution of background tasks in filesystem |
| fuse.congestion_threshold | 192 | Congestion threshold |
| fuse.node_cache_size | 200000 | Inode cache capacity |
| fuse.node_cache_timeout | 1h | Inode cache lifetime |
| fuse.direct_io | true | File and directory related options, whether to enable direct I/O |
| fuse.kernel_cache | false | File and directory related options, whether to enable kernel cache |
| fuse.cache_readdir | false | File and directory related options, whether to cache directory read results |
| fuse.non_seekable | false | File and directory related options, whether in non-seekable mode |
| fuse.log | `{level: "info", log_dir: "stdout"}` | FUSE log configuration, defaults to stdout output |