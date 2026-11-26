---
sidebar_position: 5
---

# 最佳实践

本指南汇总了在常见业务场景下部署、配置和运维 Curvine 的生产实践建议。各章节相互独立，请按需选用适合您环境的实践。

## 1. 部署最佳实践

### 1.1 集群规模建议

| 角色 | 最低配置（开发/测试） | 推荐配置（生产） | 说明 |
|------|--------------------|--------------------------|-------|
| Master | 1 个节点 | 3 个节点（Raft 组） | 使用奇数节点以满足多数派；3 节点可容忍 1 个节点故障 |
| Worker | 1 个节点 | 3 个及以上节点 | 根据缓存容量需求水平扩展 |
| FUSE | 与应用同机部署 | 每个计算节点 1 个 | 靠近业务负载部署以获得本地性 |

### 1.2 高可用

- 生产环境中始终部署 **3 个 Master 节点**组成 Raft 组。单个 Master 存在单点故障。
- 在 `journal_addrs` 中显式列出所有 Raft 节点：

```toml
[journal]
journal_addrs = [
  { id = 1, hostname = "master1", port = 8996 },
  { id = 2, hostname = "master2", port = 8996 },
  { id = 3, hostname = "master3", port = 8996 },
]
```

- 将 Master 节点部署在不同的物理主机或可用区，以应对机架/可用区故障。
- 使用 `snapshot_interval = "6h"`（默认值）控制 Raft 日志大小。

### 1.3 生产配置检查清单

```toml
# Disable format flags in production
format_master = false
format_worker = false

[master]
meta_dir = "/data/curvine-meta"   # Use dedicated SSD for metadata

[worker]
data_dir = [
  "[SSD]/data/ssd1",
  "[SSD]/data/ssd2",
  "[HDD]/data/hdd1"
]

[client]
master_addrs = [
  { hostname = "master1", port = 8995 },
  { hostname = "master2", port = 8995 },
  { hostname = "master3", port = 8995 },
]
```

- 在多节点环境中，将 `CURVINE_MASTER_HOSTNAME`、`CURVINE_WORKER_HOSTNAME` 和 `CURVINE_CLIENT_HOSTNAME` 设置为可路由的地址。
- 分布式部署中任何主机名都不要使用 `localhost`。

### 1.4 Kubernetes 部署

- 在 K8s 环境中使用官方 Helm chart：

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm upgrade --install curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine --create-namespace \
  --wait --timeout 10m
```

- 结合 CSI 驱动使用 `ReadWriteMany` PVC，实现跨 Pod 共享数据访问。
- 对延迟敏感的负载优先使用 `embedded` 挂载模式；需要隔离 FUSE 时使用 `standalone` 模式。

### 1.5 内核与操作系统调优

```bash
# Increase file descriptor limit
ulimit -n 128000

# Optimize TCP buffers for high-throughput data transfer
sysctl -w net.ipv4.tcp_rmem="8192 128000 33554432"
sysctl -w net.ipv4.tcp_wmem="8192 128000 33554432"
sysctl -w net.core.rmem_max=67108864
sysctl -w net.core.wmem_max=67108864
```

- 使用 **Linux 内核 5.0+**（例如 Ubuntu 22.04、Rocky Linux 9）以获得最佳 FUSE 性能。
- 生产环境避免使用低于 4.15 的内核，其 FUSE 并发能力严重受限。

---

## 2. 挂载模式选择

选择合适的挂载模式是对业务负载影响最大的单项决策。

### 2.1 决策矩阵

| 场景 | 推荐模式 | 理由 |
|----------|-----------------|-----------|
| 基于 S3/HDFS 的读密集型分析 | `cache_mode` | UFS 仍是数据源；Curvine 加速读取 |
| AI/ML 训练数据（不可变数据集） | `cache_mode` | 数据很少变化，缓存命中率高 |
| 通用 POSIX 文件系统 | `fs_mode` | 完整支持随机写、重命名和文件锁 |
| 数据库存储 / 日志写入 | `fs_mode` | 需要原地修改语义 |
| Shuffle 数据 / 中间结果 | `fs_mode` | 高写入吞吐，异步刷写到 UFS |
| 多云统一命名空间 | `cache_mode` | 对异构后端透明代理 |

### 2.2 cache_mode 最佳实践

```bash
bin/cv mount \
  s3://bucket/analytics /analytics \
  --write-type cache_mode \
  --ttl-ms 7d \
  --read-verify-ufs=false \
  -s ssd \
  -c s3.endpoint_url=https://s3.example.com \
  -c s3.credentials.access=YOUR_KEY \
  -c s3.credentials.secret=YOUR_SECRET \
  -c s3.region_name=us-east-1
```

- **仅**在 UFS 数据频繁变化且不能接受读到旧数据时启用 `--read-verify-ufs`。它会为每次读取增加一次 UFS HEAD 请求。
- 使用 `bin/cv fs free -r /path` 安全释放缓存空间，不会删除 UFS 数据。
- **警告**：cache_mode 下的 `delete` 会删除 UFS 数据。仅清理缓存请使用 `free`。

### 2.3 fs_mode 最佳实践

```bash
bin/cv mount \
  s3://bucket/workspace /workspace \
  --write-type fs_mode \
  --ttl-ms 30d \
  --replicas 2 \
  --block-size 128M \
  -s ssd \
  -c s3.endpoint_url=https://s3.example.com \
  -c s3.credentials.access=YOUR_KEY \
  -c s3.credentials.secret=YOUR_SECRET
```

- UFS 在外部发生变化后，运行 `bin/cv mount resync /workspace` 同步元数据。
- 在 S3/OSS 后端上**切勿重命名大目录**，这会触发全量数据复制。
- 关键数据设置 `--replicas 2` 或更高，以便在 Worker 故障时保留数据。

---

## 3. 分层存储策略

### 3.1 配置多层 Worker

```toml
[worker]
data_dir = [
  "[MEM]/dev/shm/curvine",
  "[SSD]/data/nvme0/curvine",
  "[SSD]/data/nvme1/curvine",
  "[HDD]/data/hdd0/curvine"
]
```

### 3.2 按数据冷热选择存储层

| 数据热度 | 存储层 | TTL | 副本数 | 示例 |
|-----------------|--------------|-----|----------|---------|
| 热（频繁访问） | MEM | 1d | 2-3 | 模型权重、特征表 |
| 温（定期访问） | SSD | 7d | 2 | 训练数据集、Parquet 文件 |
| 冷（不常访问） | HDD | 30d | 1 | 归档、历史日志 |

### 3.3 客户端存储层偏好

```toml
[client]
storage_type = "ssd"   # Preferred write tier; auto-fallback to next tier on space exhaustion
```

---

## 4. 性能调优

### 4.1 服务端调优

```toml
[master]
io_threads = 32          # Match CPU core count
worker_threads = 64      # 2x CPU cores for mixed workloads

[worker]
io_threads = 32
worker_threads = 64
enable_send_file = true  # Zero-copy data transfer
```

### 4.2 按负载调优客户端

**顺序读（大于 100GB 的大文件）：**

```toml
[client]
read_parallel = 8          # 4-16 recommended
read_chunk_size = "256KB"
```

**高并发小文件（并发数大于 1000）：**

```toml
[client]
read_chunk_num = 1
write_chunk_num = 1        # Reduces memory by ~90%
```

**随机读：**

```toml
[client]
read_chunk_num = 1
read_chunk_size = "256KB"  # Match average I/O size
# For very large files, use block_size >= 1GB at write time to reduce connections
```

### 4.3 FUSE 优化

- 生产环境**始终使用 FUSE3**，FUSE2 的吞吐只有 FUSE3 的约 50%。
- 如果只能使用 FUSE2，可使用多个挂载点：

```toml
[fuse]
mnt_number = 4   # 4-8 mount points ≈ 80% of FUSE3 performance
```

- 内存受限的 FUSE 节点：

```toml
[fuse]
fuse_channel_size = 1024
stream_channel_size = 16
```

- Curvine FUSE 是完全异步的，`attr_timeout` 和 `entry_timeout` 均为可选项。对于元数据稳定的读密集型负载，可适当调大：

```toml
[fuse]
entry_timeout = 60
attr_timeout = 60
```

- 如果需要实时看到其他客户端的修改，请设置 `entry_timeout = 0` 和 `attr_timeout = 0`。

---

## 5. 缓存管理

### 5.1 TTL 策略

| 负载 | TTL | TTL 动作 | 理由 |
|----------|-----|------------|-----------|
| 流式 / 实时数据 | 1h | delete | 数据很快过期 |
| 每日批量分析 | 1d - 7d | delete | 与作业调度周期一致 |
| 模型训练数据集 | 7d - 30d | free | 保留元数据，释放数据块 |
| 持久化工作区 | 0（禁用） | none | 数据一直保留，直到显式删除 |

:::caution
使用 `rclone` 或其他保留 `mtime` 的工具时，导入的文件可能会立即过期。大规模导入前请确认 TTL 设置，或临时禁用 TTL。
:::

### 5.2 基于配额的淘汰

启用 LRU 淘汰，防止存储空间耗尽：

```toml
[master]
enable_quota_eviction = true
quota_eviction_high_rate = 0.8   # Start eviction at 80% usage
quota_eviction_low_rate = 0.6    # Stop at 60% usage
quota_eviction_policy = "lru"
```

- `ttl_action = "none"` 的文件**不受** LRU 淘汰影响，关键数据可使用该设置。

### 5.3 数据预加载

在业务高峰前预热缓存：

```bash
# Proactive load (async by default)
bin/cv load s3://bucket/datasets/imagenet

# Check load job status
bin/cv transfer status <job-id>
```

- 新挂载默认开启自动缓存（`--auto-cache true`），与 TTL 无关：首次读取会触发后台加载任务。可通过 `--auto-cache false` 按挂载点关闭。
- 结合主动预加载与自动缓存，可获得最佳命中率。

---

## 6. AI/ML 负载优化

### 6.1 训练数据访问

```bash
# Mount immutable training dataset with memory-tier caching
bin/cv mount \
  s3://datasets/imagenet /datasets/imagenet \
  --write-type cache_mode \
  --storage-type mem \
  --block-size 1GB \
  --replicas 2 \
  --ttl-ms 30d
```

- 在 PyTorch/TensorFlow 数据加载器中直接使用 FUSE 挂载点，无需修改代码。
- 在 DataLoader 中设置 `num_workers=8`，并行读取 FUSE。
- 训练开始前预加载数据集：`bin/cv load s3://datasets/imagenet -w`

### 6.2 模型服务

```bash
# Low-latency model file access
bin/cv mount \
  s3://models/bert-large /models/bert-large \
  --write-type cache_mode \
  --storage-type mem \
  --ttl-ms 0 \
  --read-verify-ufs
```

- 对必须始终可用的模型文件使用 `--ttl-ms 0`（永不过期）。
- 启用 `--read-verify-ufs` 以发现推送到 UFS 的模型版本更新。

### 6.3 Checkpoint 存储

```bash
# Training checkpoints with fs_mode for POSIX write semantics
bin/cv mount \
  s3://checkpoints/run-001 /checkpoints/run-001 \
  --write-type fs_mode \
  --storage-type ssd \
  --replicas 2 \
  --ttl-ms 7d
```

---

## 7. 大数据生态集成

### 7.1 Spark 集成

```bash
spark-submit \
  --conf spark.hadoop.fs.cv.impl=io.curvine.CurvineFileSystem \
  --conf spark.hadoop.fs.cv.master_addrs=master1:8995,master2:8995,master3:8995 \
  --jars curvine-hadoop-client.jar \
  --class com.example.App app.jar
```

- 如需零代码改造加速，可使用 S3A 透明代理：

```xml
<property>
  <name>fs.s3a.impl</name>
  <value>io.curvine.S3AProxyFileSystem</value>
</property>
```

已挂载路径自动使用 Curvine 缓存；未挂载路径直接访问原生 S3。

### 7.2 Shuffle 加速

- Shuffle 数据使用 `fs_mode` 挂载，充分利用写加速。
- Shuffle 使用 `--storage-type ssd`，内存用于临时数据成本过高。
- Shuffle 数据是临时的，使用较短的 TTL（`1h`-`4h`）。

### 7.3 块大小选择

| 数据模式 | 推荐块大小 | 理由 |
|-------------|----------------------|-----------|
| 小文件（< 4MB） | 4MB | 每个文件一个块，元数据开销最小 |
| Parquet / ORC 分析 | 128MB（默认） | 兼顾并行度与本地性 |
| 大型顺序文件 | 1GB | 减少随机读的连接数 |
| 视频 / 模型二进制文件 | 256MB - 1GB | 高吞吐顺序访问 |

---

## 8. 监控与可观测性

### 8.1 指标端点

| 组件 | 端点 | 端口 |
|-----------|----------|------|
| Master | `http://<host>:9010/metrics` | 9010 |
| Worker | `http://<host>:9002/metrics` | 9002 |
| FUSE | `http://<host>:9003/metrics` | 9003 |
| Web 控制台（`curvine-web`） | `http://<host>:9000` | 9000 |
| Transfer（可选） | `http://<host>:9011/metrics` | 9011 |

### 8.2 关键告警指标

| 指标 | 告警条件 | 处理措施 |
|--------|----------------|--------|
| `available / capacity` | < 20% | 扩容 Worker 或缩短 TTL |
| `worker_num`（离线） | 持续 5 分钟 > 0 | 排查节点健康状况 |
| `replication_failure_count` | 持续增长 | 检查网络 / 磁盘健康状况 |
| `client_mount_cache_misses` | 相对命中数比例偏高 | 检查 TTL / 预加载策略 |
| `failed_disks` | > 0 | 立即更换磁盘 |

### 8.3 Prometheus + Grafana 配置

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: 'curvine-master'
    static_configs:
      - targets: ['master1:9010', 'master2:9010', 'master3:9010']
  - job_name: 'curvine-worker'
    static_configs:
      - targets: ['worker1:9002', 'worker2:9002', 'worker3:9002']
  - job_name: 'curvine-fuse'
    static_configs:
      - targets: ['app1:9003', 'app2:9003']
```

### 8.4 Web UI

- 管理控制台（`curvine-web`，通过 `bin/curvine-web.sh start` 启动）：`http://<web-host>:9000`，提供集群概览、文件浏览、Worker 状态、配置和监控面板。
- Master 的 `:9010` 端口只提供指标，没有 UI。
- Worker UI：`http://<worker-host>:9002`，提供节点级存储和数据块统计。

---

## 9. Transfer 服务最佳实践

所有 Load 和 Export 任务都由 Transfer 执行。默认情况下它运行在 Leader
Master 内，任务记录保存在内存中。当任务状态需要持久化到数据库时，请部署独立的
Transfer 服务（配置 `[transfer] endpoints`）；参见
[Transfer 服务](../2-Deploy/3-Transfer-Service/0-Overview.md)。

### 9.1 高可用

- 内嵌服务运行在 Leader Master 上，其任务记录保存在该 Master 的内存中。
- 对于独立服务，在运行多个 Transfer 副本之前，请使用共享的 MySQL `store_url`。
- 默认的 SQLite 存储只适用于单个独立实例；使用 SQLite 时，在 Helm chart 中保持 `transfer.replicas = 1`。

### 9.2 容量与保留

- 根据可用的 UFS 带宽调整 `max_running_transfers`。
- 根据已完成任务需要保持可查询的时长设置 `terminal_retention`（独立服务默认 `168h`，Master 内默认 `10m`）。
- 关注 `cv transfer list` 中积压的任务；对于独立服务，还可查看其 `/metrics` 端点。

```bash
cv transfer list --state running
curl http://<transfer-host>:9011/metrics   # standalone service
```

---

## 10. 常见误区与故障排查

| 误区 | 现象 | 解决方法 |
|---------|---------|----------|
| 分布式模式下使用 `localhost` | Worker 无法连接 Master | 通过环境变量或配置设置正确的主机名 |
| 在 fs_mode 下重命名大型 S3 目录 | 操作阻塞数小时 | 避免在对象存储上重命名；改为复制后删除 |
| 训练数据 TTL 过短 | 缓存抖动，命中率低 | 将 `--ttl-ms` 调大到与训练轮次时长匹配 |
| 生产环境使用 FUSE2 | 吞吐损失 50% | 升级到 FUSE3 或使用 `mnt_number = 4` |
| `rclone` 保留旧的 mtime | 导入后文件立即过期 | 导入后调整 mtime 或临时禁用 TTL |
| 生产环境只有单个 Master | Master 故障时集群不可用 | 部署 3 节点 Raft 组 |
| 生产环境 `format_master = true` | 重启时元数据被清空 | 初始化完成后设置为 `false` |
| 忽视 `failed_disks` 指标 | 磁盘故障导致数据丢失 | 监控并提前更换磁盘 |
| fs_mode 下未运行 `resync` | UFS 外部变化后元数据过期 | 定期执行 `cv mount resync` |
| 大文件使用过小的块 | 连接过多，随机读变慢 | 大于 10GB 的文件使用 `--block-size 1GB` |

---

## 11. 安全建议

- 定期轮换 UFS 凭据；尽可能使用 IAM 角色。
- 使用网络策略（K8s）或防火墙规则限制对 Master RPC（8995）和 Worker RPC（8997）端口的访问。
- 对合规敏感的环境启用审计日志（`audit_logging_enabled = true`）。
- 在多租户环境中，为每个团队使用独立的 Curvine 路径并配合配额控制来隔离命名空间。

---

## 12. 升级与维护

- 升级 Master 节点前务必先做元数据快照。
- 执行滚动升级：先升级 Follower，然后触发 Leader 切换并升级最后一个节点。
- 升级 Worker 后，通过 Web UI 或 `bin/cv report` 确认心跳注册正常。
- 升级后测试 FUSE 重新挂载：`bin/curvine-fuse.sh restart`。
- 保持 `retain_checkpoint_num = 3`（默认值），以便回滚到之前的元数据状态。
