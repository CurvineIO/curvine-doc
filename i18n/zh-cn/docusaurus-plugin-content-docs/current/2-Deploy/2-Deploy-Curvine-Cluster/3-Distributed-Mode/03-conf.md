# 配置参考
本章介绍curvine配置项的详细说明。

## 集群配置

| 配置项           | 默认值   | 描述                      |
|---------------|-------|-------------------------|
| format_master | true  | 控制是否格式化 Master 元数据存储    |
| format_worker | true  | 控制是否格式化 Worker 数据存储     |
| testing       | false | 标记是否处于测试模式，测试模式下数据流会被禁用 |
| cluster_id    | curve | 集群的唯一标识符                |

## master配置项

| 配置项                              | 默认值                                  | 描述                                               |
|----------------------------------|--------------------------------------|--------------------------------------------------|
| master.hostname                  | localhost                            | Master 服务的主机名，可通过环境变量 CURVINE_MASTER_HOSTNAME 覆盖 |
| master.rpc_port                  | 8995                                 | Master 服务的 RPC 端口                                |
| master.web_port                  | 9000                                 | Master 服务的 Web 端口                                |
| master.io_threads                | 32                                   | Master 服务的 I/O 线程数                               |
| master.worker_threads            | cpu核心数 * 2                           | Master 服务的工作线程数                                  |
| master.io_timeout                | 10m                                  | Master 网络读写数据超时时间                                |
| master.io_close_idle             | true                                 | 是否关闭空闲连接                                         |
| master.meta_dir                  | ./fs-meta                            | 元数据存储目录                                          |
| master.meta_disable_wal          | true                                 | 是否禁用 RocksDB 的预写日志（WAL）                          |
| master.meta_compression_type     | none                                 | 元数据存储的压缩类型                                       |
| master.meta_db_write_buffer_size | 0                                    | 元数据存储的数据库写缓冲区大小                                  |
| master.meta_write_buffer_size    | 64MB                                 | 元数据存储的写缓冲区大小                                     |
| master.min_block_size            | 1024 * 1024                          | 最小block_size大小                                   |
| master.max_block_size            | 100 * 1024 * 1024 * 1024             | 最大block_size大小                                   |
| master.min_replication           | 1                                    | 最小副本数                                            |
| master.max_replication           | 100                                  | 最大副本数                                            |
| master.block_replication_enabled | false                                | 是否启用block副本数限制                                |
| master.block_replication_concurrency_limit     | 1000                   | Master 端并发复制任务最大数量                   
| master.max_path_len              | 8000                                 | 最大路径长度                                           |
| master.max_path_depth            | 1000                                 | 最大路径深度                                           |
| master.retry_cache_enable        | true                                 | 是否启用文件系统请求重试缓存                                   |
| master.retry_cache_size          | 100_000                              | 重试缓存的大小                                          |
| master.retry_cache_ttl           | 10m                                  | 重试缓存的过期时间                                        |
| master.block_report_limit        | 1000                                 | 块报告限制,允许的每次最多上报的block数量                          |
| master.worker_policy             | local                                | Worker 选择策略，默认local，优先选择和客户端所有节点的worker          |
| master.executor_threads          | 10                                   | master后台任务执行器线程数                                 |
| master.executor_channel_size     | 1000                                 | master后台任务执行器通道大小                                |
| master.heartbeat_check_interval  | 5m                                   | Master 检查 Worker 心跳的间隔时间                         |
| master.heartbeat_interval        | 3s                                   | Worker 发送心跳的间隔时间                                 |
| master.audit_logging_enabled     | true                                 | 是否启用审计日志                                         |
| master.log                       | `{level: "info", log_dir: "stdout"}` | master日志配置，默认输出到stdout                           |

## journal 配置

| 配置项                               | 默认值                                        | 描述                                |
|-----------------------------------|--------------------------------------------|-----------------------------------|
| enable                            | true                                       | 若启用 raft 日志同步，日志将进行同步；若禁用，相当于单机系统 |
| group_name                        | raft-group                                 | raft 组名称                          |
| rpc_port                          | 8996                                       | RPC 端口号                           |
| io_threads                        | 8                                          | I/O 线程数量                          |
| worker_threads                    | 8                                          | 工作线程数量                            |
| message_size                      | 200                                        | 消息大小                              |
| journal_addrs                     | `{id: 1, hostname: "localhost", port: 8996}` | Master 候选节点地址列表                   |
| journal_dir                       | ./journal                                  | raft 日志存储目录                       |
| writer_debug                      | false                                      | 写操作是否启用调试模式，启用后会打印每条日志            |
| writer_channel_size               | 0                                          | journal 写入时的缓冲区队列大小，默认使用无界队列      |
| writer_flush_batch_size           | 1000                                       | 写操作批量刷新的条目数量                      |
| writer_flush_batch_ms             | 100                                        | 写操作批量刷新的时间间隔（毫秒）                  |
| snapshot_interval                 | 6h                                         | 快照创建间隔                            |
| snapshot_entries                  | 100_000                                    | 创建快照后生成的条目数量                      |
| snapshot_read_chunk_size          | 1024 * 1024                                | 快照读取块大小                           |
| conn_retry_max_duration_ms        | 0                                          | 连接重试的最大持续时间（毫秒）                   |
| conn_retry_min_sleep_ms           | 10 * 1000                                  | 连接重试的最小休眠时间（毫秒）                   |
| conn_retry_max_sleep_ms           | 10 * 1000                                  | 连接重试的最大休眠时间（毫秒）                   |
| rpc_close_idle                    | false                                      | 是否关闭空闲的 RPC 连接                    |
| rpc_retry_max_duration_ms         | 60 * 1000                                  | RPC 请求重试的最大持续时间（毫秒）               |
| rpc_retry_min_sleep_ms            | 20 * 1000                                  | RPC 请求重试的最小休眠时间（毫秒）               |
| rpc_retry_max_sleep_ms            | 20 * 1000                                  | RPC 请求重试的最大休眠时间（毫秒）               |
| conn_timeout_ms                   | 30 * 1000                                  | 连接超时时间（毫秒），默认 30 秒                |
| io_timeout_ms                     | 60 * 1000                                  | 套接字数据读写超时时间（毫秒），默认 60 秒           |
| conn_size                         | 1                                          | 连接共享时可用的连接数量                      |
| raft_poll_interval_ms             | 100                                        | raft 轮询间隔（毫秒）                     |
| raft_tick_interval_ms             | 1000                                       | raft 心跳间隔（毫秒）                     |
| raft_election_tick                | 10                                         | raft 选举超时周期数                      |
| raft_heartbeat_tick               | 3                                          | raft 心跳超时周期数                      |
| raft_min_election_ticks           | 10                                         | raft 最小选举超时周期数                    |
| raft_max_election_ticks           | 30                                         | raft 最大选举超时周期数                    |
| raft_check_quorum                 | true                                       | 是否检查法定人数                          |
| raft_max_size_per_msg             | 1024 * 1024                                | 每条消息的最大大小                         |
| raft_max_inflight_msgs            | 256                                        | 未确认消息的最大数量                        |
| raft_max_committed_size_per_ready | 16 * 1024 * 1024                           | 每次 ready 状态的最大提交大小                |
| raft_retry_cache_size             | 100_000                                    | raft 请求重试缓存大小，防止重复请求              |
| raft_retry_cache_ttl              | 10m                                        | raft 请求重试缓存的过期时间                  |
| retain_checkpoint_num             | 3                                          | 保存的检查点数量                          |
| ignore_replay_error               | false                                      | 是否忽略日志重放过程中的错误                    |

## worker配置项

| 配置项                          | 默认值                                | 描述                                           |
|------------------------------|------------------------------------|----------------------------------------------|
| worker.dir_reserved          | 0                                  | 目录保留空间配置                                     |
| worker.data_dir              | vec![]                             | Worker 数据目录列表                                |
| worker.io_slow_threshold     | 300ms                              | Worker I/O 操作慢阈值，超过该时间视为慢操作                  |
| worker.io_threads            | 32                                 | Worker 网络 I/O 线程数量                           |
| worker.worker_threads        | cpu核心数 * 2                         | Worker 工作线程数量                                |
| worker.io_timeout            | 10m                                | Worker 网络读写数据超时时间                            |
| worker.io_close_idle         | false                              | 是否关闭空闲连接，因客户端未实现心跳机制，默认不关闭；用keepalive检查连接有效性 |
| worker.block_replication_concurrency_limit | 100                  | Worker 端并发复制任务最大数量                           |
| worker.block_replication_chunk_size | 1024 * 1024                 | 复制时的数据块大小                                     |
| worker.scheduler_threads     | 2                                  | 后台调度任务线程数量                                   |
| worker.executor_threads      | 10                                 | 后台异步任务线程数量                                   |
| worker.executor_channel_size | 1000                               | 后台异步任务队列大小                                   |
| worker.log                   | `{level: "info", log_dir: "stdout"}` | worker日志配置，默认输出到stdout                       |

worker 加载数据配置：
| 配置项 | 默认值 | 描述 |
| --- | --- | --- |
| worker.load.task_status_report_interval_ms | 5000 | 进度报告间隔（毫秒） |
| worker.load.task_read_chunk_size_bytes | 1024 * 1024 | 默认块大小（字节） |
| worker.load.task_transfer_buffer_count | 16 | 默认缓冲区缓存数量 |
| worker.load.task_timeout_seconds | 3600 | 任务超时时间（秒），-1 表示无超时 |
| worker.load.task_transfer_max_concurrent_tasks | 5 | 最大并发任务数 |

## 客户端配置

| 配置项                               | 默认值            | 描述                                               |
|-----------------------------------|----------------|--------------------------------------------------|
| client.master_addrs               | localhost:8995 | 主节点地址列表                                          |
| client.hostname                   | localhost      | 客户端所在机器的主机名，某些场景需设置以识别客户端和工作节点是否在同一机器            |
| client.io_threads                 | 16             | 客户端 I/O 线程数量                                     |
| client.worker_threads             | cpu核心数 * 2     | 客户端工作线程数量                                        |
| client.replicas                   | 1              | 默认副本数量                                           |
| client.block_size                 | 128MB          | block大小（字节），实际值从 block_size_str 转换而来             |
| client.write_chunk_size           | 128KB          | 写入缓冲区大小                                          |
| client.write_chunk_num            | 8              | 写入缓冲队列长度                                         |
| client.read_chunk_size            | 128KB          | 读取缓冲区大小                                          |
| client.read_chunk_num             | 32             | 读取缓冲队列长度                                         |
| client.read_parallel              | 1              | 读取文件的并行度                                         |
| client.read_slice_size            | 0              | 读取切片大小（字节），默认值为 read_chunk_size * read_chunk_num |
| client.close_reader_limit         | 20             | 在随机读取场景中，若检测到因 seek 操作导致block切换超过此值，将缓存所有块读取器    |
| client.short_circuit              | true           | 是否启用短路功能                                         |
| client.storage_type               | disk           | 默认存储类型                                           |
| client.ttl_ms                     | 0              | 默认数据缓存时间（毫秒）                                     |
| client.ttl_action                 | none           | 缓存到期后的操作                                         |
| client.auto_cache_enabled         | false          | 是否启用自动缓存功能，启用后从外部文件系统读取文件时会自动向主节点提交加载请求并缓存文件     |
| client.auto_cache_ttl             | 7d             | 自动缓存的默认生存时间，格式为数字加单位或纯数字（秒）                      |
| client.conn_retry_max_duration_ms | 2 * 60 * 1000  | 连接重试的最大持续时间（毫秒）                                  |
| client.conn_retry_min_sleep_ms    | 300            | 连接重试的最小休眠时间（毫秒）                                  |
| client.conn_retry_max_sleep_ms    | 10 * 1000      | 连接重试的最大休眠时间（毫秒）                                  |
| client.rpc_retry_max_duration_ms  | 5 * 60 * 1000  | RPC 请求重试的最大持续时间（毫秒）                              |
| client.rpc_retry_min_sleep_ms     | 300            | RPC 请求重试的最小休眠时间（毫秒）                              |
| client.rpc_retry_max_sleep_ms     | 30 * 1000      | RPC 请求重试的最大休眠时间（毫秒）                              |
| client.rpc_close_idle             | true           | 是否关闭空闲的 RPC 连接                                   |
| client.conn_timeout_ms            | 30 * 1000      | 连接超时时间（毫秒）                                       |
| client.rpc_timeout_ms             | 120 * 1000     | RPC 请求超时时间（毫秒）                                   |
| client.data_timeout_ms            | 5 * 60 * 1000  | 数据传输超时时间（毫秒）                                     |
| client.master_conn_pool_size      | 1              | 主节点连接池大小，经测试 3 个连接性能最佳，默认值为 1                    |
| client.enable_read_ahead          | true           | 是否启用预读功能                                         |
| client.read_ahead_len             | 0              | 预读长度（字节），默认值为 read_chunk_size * read_chunk_num   |
| client.drop_cache_len             | 0              | 丢弃缓存长度（字节）                                       |
| client.failed_worker_ttl_str      | 10m            | worker节点黑名单过期时间                                  |

## fuse配置

| 配置项                       | 默认值                                | 描述                             |
|---------------------------|------------------------------------|--------------------------------|
| fuse.debug                | false                              | 是否输出请求响应日志                     |
| fuse.io_threads           | 32                                 | I/O 线程数量                       |
| fuse.worker_threads       | CPU核心 * 2                          | 工作线程数量                         |
| fuse.mnt_path             | /curvine-fuse                      | 挂载路径                           |
| fuse.fs_path              | /                                  | 指定挂载点访问文件系统的根路径                |
| fuse.mnt_number           | 1                                  | 挂载点数量                          |
| fuse.mnt_per_task         | 0（若为 0 会初始化为 io_threads 的值）        | 每个挂载点可读写数据的任务数量                |
| fuse.clone_fd             | true                               | 是否启用 clone fd 功能               |
| fuse.fuse_channel_size    | 0                                  | Fuse 请求队列大小，0使用无界队列            |
| fuse.stream_channel_size  | 0                                  | 读写文件请求队列大小，0使用无界队列             |
| fuse.fuse_opts            | []                                 | 挂载配置，需传递给 Linux 内核             |
| fuse.umask                | 022                                | 覆盖文件系统在 st_mode 中设置的权限位，以八进制表示 |
| fuse.uid                  | sys::get_uid()                     | 用户 ID                          |
| fuse.gid                  | sys::get_gid()                     | 用户组 ID                         |
| fuse.auto_cache           | false                              | 是否启用自动缓存                       |
| fuse.read_dir_fill_ino    | true                               | 遍历目录时是否填充 fuse 节点 ID           |
| fuse.entry_timeout        | 1.0                                | 名称搜索缓存时间（秒）                    |
| fuse.negative_timeout     | 0.0                                | 缓存否定查找的超时时间（秒），0 表示禁用          |
| fuse.attr_timeout         | 1.0                                | 文件和目录属性的缓存时间（秒）                |
| fuse.ac_attr_timeout      | 1.0                                | 自动缓存刷新时文件属性缓存的超时时间（秒）          |
| fuse.ac_attr_timeout_set  | 1.0                                | 自动缓存刷新时文件属性缓存的超时时间（秒）          |
| fuse.remember             | false                              | 文件系统是否记住已打开的文件和目录              |
| fuse.max_background       | 256                                | 文件系统中后端任务的最大并发执行数              |
| fuse.congestion_threshold | 192                                | 拥塞阈值                           |
| fuse.node_cache_size      | 200000                             | inode缓存容量                      |
| fuse.node_cache_timeout   | 1h                                 | inode缓存存活时间                    |
| fuse.direct_io            | true                               | 文件和目录相关选项，是否启用直接 I/O           |
| fuse.kernel_cache         | false                              | 文件和目录相关选项，是否启用内核缓存             |
| fuse.cache_readdir        | false                              | 文件和目录相关选项，是否缓存目录读取结果           |
| fuse.non_seekable         | false                              | 文件和目录相关选项，是否为不可查找模式            |
| fuse.log                  | `{level: "info", log_dir: "stdout"}` | fuse日志配置，默认输出到stdout           |

