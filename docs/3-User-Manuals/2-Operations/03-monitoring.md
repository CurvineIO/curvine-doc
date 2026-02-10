# Monitoring Metrics
This chapter describes the observable monitoring metrics of Curvine, used for monitoring cluster status, performance, and resource usage.

## Metrics Collection

Master, worker, FUSE, and S3 gateway nodes expose monitoring metrics through HTTP interfaces. These metrics can be collected by Prometheus and visualized through Grafana.

- Master metrics: `http://URL_ADDRESS:9000/metrics`
- Worker metrics: `http://URL_ADDRESS:9001/metrics`
- Fuse metrics: `http://URL_ADDRESS:9002/metrics`
- S3 gateway metrics: `http://URL_ADDRESS:9003/metrics`

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
| used_memory_bytes | Used memory in bytes |
| rocksdb_used_memory_bytes | RocksDB memory usage |
| worker_num | Number of workers (classified by status) |
| rpc_request_total_count | Total RPC request count |
| rpc_request_total_time | Total RPC request time |
| replication_staging_number | Number of blocks waiting for replication |
| replication_inflight_number | Number of blocks currently being replicated |
| replication_failure_count | Total cumulative replication failures |
| operation_duration | Operation duration (classified by type, excluding heartbeats) |

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
| used_memory_bytes | Used memory in bytes |
