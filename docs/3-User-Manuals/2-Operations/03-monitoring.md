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
| rpc_request_total_count | Total RPC request count |
| rpc_request_time | Accumulated RPC request time |
| rpc_queue_duration | Time a request waited in the RPC queue |
| replication_staging_number | Number of blocks waiting for replication |
| replication_inflight_number | Number of blocks currently being replicated |
| replication_failure_count | Total cumulative replication failures |
| operation_duration | Operation duration (classified by type, excluding heartbeats) |

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
| compat_client_verdict | Gauge | `client_addr`, `verdict` | 1 for the current compatibility verdict of each client |
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

## Worker Metrics

| Metric Name | Description |
|-------------|-------------|
| write_bytes | Bytes written |
| write_time_us | Write time in microseconds |
| write_count | Write count |
| write_blocks | Blocks written (classified by type) |
| read_bytes | Bytes read |
| read_time_us | Read time in microseconds |
| read_count | Read count |
| read_blocks | Blocks read (classified by type) |
| capacity | Total storage capacity |
| available | Available storage space |
| fs_used | File system used space |
| failed_disks | Number of failed storage devices |
| total_disks | Total number of storage disks |
| num_blocks | Total number of blocks |
| num_blocks_to_delete | Number of blocks pending deletion |
