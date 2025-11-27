# 监控指标
本章介绍Curvine的可观测监控指标，用于监控集群状态、性能和资源使用情况。

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
| used_memory_bytes | 已用内存字节数 |
| rocksdb_used_memory_bytes | rocksdb 内存占用 |
| worker_num | worker 数量（按状态分类） |
| rpc_request_total_count | RPC 总请求计数 |
| rpc_request_total_time | RPC 总请求时间 |
| replication_staging_number | 等待复制的块数量 |
| replication_inflight_number | 正在进行复制的块数量 |
| replication_failure_count | 累计复制失败的总次数 |
| operation_duration | 操作耗时（按类型分类，不包括心跳） |

## Journal Node 指标

| 指标名称 | 描述 |
|---------|------|
| journal_queue_len | Journal 队列长度 |
| journal_flush_count | Journal 刷新次数 |
| journal_flush_time | Journal 刷新时间 |

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

## Worker 指标

| 指标名称 | 描述 |
|---------|------|
| write_bytes | 写入字节数 |
| write_time_us | 写入时间（微秒） |
| write_count | 写入次数 |
| write_blocks | 写入块数（按类型分类） |
| read_bytes | 读取字节数 |
| read_time_us | 读取时间（微秒） |
| read_count | 读取次数 |
| read_blocks | 读取块数（按类型分类） |
| capacity | 总存储容量 |
| available | 可用存储空间 |
| fs_used | 文件系统已用空间 |
| failed_disks | 异常存储数量 |
| total_disks | 存储磁盘数量 |
| num_blocks | block 总数 |
| num_blocks_to_delete | 待删除 block 数 |
| used_memory_bytes | 已用内存字节数 |