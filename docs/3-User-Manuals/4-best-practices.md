---
sidebar_position: 5
---

# Best Practices

This guide consolidates production-proven recommendations for deploying, configuring, and operating Curvine across common workload scenarios. Each section is self-contained — apply the practices relevant to your environment.

## 1. Deployment Best Practices

### 1.1 Cluster Sizing Guidelines

| Role | Minimum (Dev/Test) | Recommended (Production) | Notes |
|------|--------------------|--------------------------|-------|
| Master | 1 node | 3 nodes (Raft group) | Odd number for quorum; 3-node tolerates 1 failure |
| Worker | 1 node | 3+ nodes | Scale horizontally based on cache capacity needs |
| FUSE | Co-located with app | 1 per compute node | Deploy close to the workload for locality |

### 1.2 High Availability

- Always deploy **3 Master nodes** in production to form a Raft group. A single Master is a single point of failure.
- Set `journal_addrs` to list all Raft peers explicitly:

```toml
[journal]
journal_addrs = [
  { id = 1, hostname = "master1", port = 8996 },
  { id = 2, hostname = "master2", port = 8996 },
  { id = 3, hostname = "master3", port = 8996 },
]
```

- Place Master nodes on separate physical hosts or availability zones to survive rack/zone failures.
- Use `snapshot_interval = "6h"` (default) to keep Raft log size bounded.

### 1.3 Production Configuration Checklist

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

- Set `CURVINE_MASTER_HOSTNAME`, `CURVINE_WORKER_HOSTNAME`, and `CURVINE_CLIENT_HOSTNAME` to routable addresses in multi-node environments.
- Never use `localhost` for any hostname in distributed deployments.

### 1.4 Kubernetes Deployment

- Use the official Helm chart for K8s environments:

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm upgrade --install curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine --create-namespace \
  --wait --timeout 10m
```

- Use `ReadWriteMany` PVCs with the CSI driver for shared data access across pods.
- For latency-sensitive workloads, prefer `embedded` mount mode; for FUSE isolation, use `standalone` mode.

### 1.5 Kernel and OS Tuning

```bash
# Increase file descriptor limit
ulimit -n 128000

# Optimize TCP buffers for high-throughput data transfer
sysctl -w net.ipv4.tcp_rmem="8192 128000 33554432"
sysctl -w net.ipv4.tcp_wmem="8192 128000 33554432"
sysctl -w net.core.rmem_max=67108864
sysctl -w net.core.wmem_max=67108864
```

- Use **Linux kernel 5.0+** (e.g., Ubuntu 22.04, Rocky Linux 9) for optimal FUSE performance.
- Avoid kernels below 4.15 in production — FUSE concurrency is severely limited.

---

## 2. Mount Mode Selection

Choosing the right mount mode is the single most impactful decision for your workload.

### 2.1 Decision Matrix

| Scenario | Recommended Mode | Rationale |
|----------|-----------------|-----------|
| Read-heavy analytics over S3/HDFS | `cache_mode` | UFS remains source of truth; Curvine accelerates reads |
| AI/ML training data (immutable datasets) | `cache_mode` | Data rarely changes; cache hit ratio is high |
| General-purpose POSIX filesystem | `fs_mode` | Full random write, rename, file lock support |
| Database storage / log writing | `fs_mode` | Requires in-place modification semantics |
| Shuffle data / intermediate results | `fs_mode` | High write throughput with async UFS flush |
| Multi-cloud unified namespace | `cache_mode` | Transparent proxy over heterogeneous backends |

### 2.2 cache_mode Best Practices

```bash
bin/cv mount \
  s3://bucket/analytics /analytics \
  --write-type cache_mode \
  --ttl-ms 7d \
  --read-verify-ufs false \
  -s ssd \
  -c s3.endpoint_url=https://s3.example.com \
  -c s3.credentials.access=YOUR_KEY \
  -c s3.credentials.secret=YOUR_SECRET \
  -c s3.region_name=us-east-1
```

- Enable `--read-verify-ufs true` **only** when UFS data changes frequently and staleness is unacceptable. It adds one extra UFS HEAD request per read.
- Use `bin/cv fs free -r /path` to release cache space safely without deleting UFS data.
- **Warning**: `delete` in cache_mode deletes UFS data. Use `free` for cache-only cleanup.

### 2.3 fs_mode Best Practices

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

- Run `bin/cv mount resync /workspace` after external UFS changes to synchronize metadata.
- **Never rename large directories** on S3/OSS backends — it triggers full data copy.
- Set `--replicas 2` or higher for critical data to survive Worker failures.

---

## 3. Tiered Storage Strategy

### 3.1 Configure Multi-Tier Workers

```toml
[worker]
data_dir = [
  "[MEM]/dev/shm/curvine",
  "[SSD]/data/nvme0/curvine",
  "[SSD]/data/nvme1/curvine",
  "[HDD]/data/hdd0/curvine"
]
```

### 3.2 Match Storage Tier to Data Temperature

| Data Temperature | Storage Tier | TTL | Replicas | Example |
|-----------------|--------------|-----|----------|---------|
| Hot (frequent access) | MEM | 1d | 2-3 | Model weights, feature tables |
| Warm (regular access) | SSD | 7d | 2 | Training datasets, Parquet files |
| Cold (infrequent access) | HDD | 30d | 1 | Archives, historical logs |

### 3.3 Client-Side Tier Preference

```toml
[client]
storage_type = "ssd"   # Preferred write tier; auto-fallback to next tier on space exhaustion
```

---

## 4. Performance Tuning

### 4.1 Server-Side Tuning

```toml
[master]
io_threads = 32          # Match CPU core count
worker_threads = 64      # 2x CPU cores for mixed workloads

[worker]
io_threads = 32
worker_threads = 64
enable_send_file = true  # Zero-copy data transfer
```

### 4.2 Client-Side Tuning by Workload

**Sequential read (large files > 100GB):**

```toml
[client]
read_parallel = 8          # 4-16 recommended
read_chunk_size = "256KB"
```

**High-concurrency small files (> 1000 concurrent):**

```toml
[client]
read_chunk_num = 1
write_chunk_num = 1        # Reduces memory by ~90%
```

**Random read:**

```toml
[client]
read_chunk_num = 1
read_chunk_size = "256KB"  # Match average I/O size
# For very large files, use block_size >= 1GB at write time to reduce connections
```

### 4.3 FUSE Optimization

- **Always use FUSE3** in production — FUSE2 delivers only ~50% of FUSE3 throughput.
- If stuck on FUSE2, use multiple mount points:

```toml
[fuse]
mnt_number = 4   # 4-8 mount points ≈ 80% of FUSE3 performance
```

- For memory-constrained FUSE nodes:

```toml
[fuse]
fuse_channel_size = 1024
stream_channel_size = 16
```

- Curvine FUSE is fully asynchronous — `attr_timeout` and `entry_timeout` are optional. Increase them for read-heavy workloads with stable metadata:

```toml
[fuse]
entry_timeout = 60
attr_timeout = 60
```

- Set `entry_timeout = 0` and `attr_timeout = 0` if you need real-time visibility of changes from other clients.

---

## 5. Cache Management

### 5.1 TTL Strategy

| Workload | TTL | TTL Action | Rationale |
|----------|-----|------------|-----------|
| Streaming / real-time data | 1h | delete | Data expires quickly |
| Daily batch analytics | 1d - 7d | delete | Aligns with job schedule |
| Model training datasets | 7d - 30d | free | Keep metadata, release blocks |
| Persistent workspace | 0 (disabled) | none | Data lives until explicitly deleted |

:::caution
When using `rclone` or similar tools that preserve `mtime`, imported files may immediately expire. Verify TTL settings before large-scale imports, or temporarily disable TTL.
:::

### 5.2 Quota-Based Eviction

Enable LRU eviction to prevent storage exhaustion:

```toml
[master]
enable_quota_eviction = true
quota_eviction_high_rate = 0.8   # Start eviction at 80% usage
quota_eviction_low_rate = 0.6    # Stop at 60% usage
quota_eviction_policy = "lru"
```

- Files with `ttl_action = "none"` are **exempt** from LRU eviction — use this for critical data.

### 5.3 Data Preloading

Warm up the cache before peak workloads:

```bash
# Proactive load (async by default)
bin/cv load s3://bucket/datasets/imagenet

# Check load job status
bin/cv load-status <job-id>
```

- Automatic caching is enabled per-mount when TTL > 0. First reads trigger background load jobs.
- Combine proactive + automatic caching for best hit ratio.

---

## 6. AI/ML Workload Optimization

### 6.1 Training Data Access

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

- Use FUSE mount point directly in PyTorch/TensorFlow data loaders — no code changes needed.
- Set `num_workers=8` in DataLoader for parallel FUSE reads.
- Pre-load datasets before training starts: `bin/cv load s3://datasets/imagenet -w`

### 6.2 Model Serving

```bash
# Low-latency model file access
bin/cv mount \
  s3://models/bert-large /models/bert-large \
  --write-type cache_mode \
  --storage-type mem \
  --ttl-ms 0 \
  --read-verify-ufs true
```

- Use `--ttl-ms 0` (no expiration) for model files that must always be available.
- Enable `--read-verify-ufs` to detect model version updates pushed to UFS.

### 6.3 Checkpoint Storage

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

## 7. Big Data Ecosystem Integration

### 7.1 Spark Integration

```bash
spark-submit \
  --conf spark.hadoop.fs.cv.impl=io.curvine.CurvineFileSystem \
  --conf spark.hadoop.fs.cv.master_addrs=master1:8995,master2:8995,master3:8995 \
  --jars curvine-hadoop-client.jar \
  --class com.example.App app.jar
```

- For zero-code acceleration, use the S3A transparent proxy:

```xml
<property>
  <name>fs.s3a.impl</name>
  <value>io.curvine.S3AProxyFileSystem</value>
</property>
```

Mounted paths automatically use Curvine cache; unmounted paths fall through to native S3.

### 7.2 Shuffle Acceleration

- Use `fs_mode` mounts for shuffle data to benefit from full write acceleration.
- Set `--storage-type ssd` for shuffle — memory is too expensive for ephemeral data.
- Use short TTL (`1h`-`4h`) since shuffle data is transient.

### 7.3 Block Size Selection

| Data Pattern | Recommended Block Size | Rationale |
|-------------|----------------------|-----------|
| Small files (< 4MB) | 4MB | One block per file, minimal metadata overhead |
| Parquet / ORC analytics | 128MB (default) | Balanced parallelism and locality |
| Large sequential files | 1GB | Reduces connection count for random reads |
| Video / model binaries | 256MB - 1GB | High throughput sequential access |

---

## 8. Monitoring and Observability

### 8.1 Metrics Endpoints

| Component | Endpoint | Port |
|-----------|----------|------|
| Master | `http://<host>:9000/metrics` | 9000 |
| Worker | `http://<host>:9001/metrics` | 9001 |
| FUSE | `http://<host>:9002/metrics` | 9002 |
| S3 Gateway | `http://<host>:9003/metrics` | 9003 |

### 8.2 Key Metrics to Alert On

| Metric | Alert Condition | Action |
|--------|----------------|--------|
| `available / capacity` | < 20% | Scale Workers or reduce TTL |
| `worker_num` (offline) | > 0 for 5min | Investigate node health |
| `replication_failure_count` | Increasing | Check network / disk health |
| `client_mount_cache_misses` | High ratio vs hits | Review TTL / preloading strategy |
| `failed_disks` | > 0 | Replace disk immediately |

### 8.3 Prometheus + Grafana Setup

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: 'curvine-master'
    static_configs:
      - targets: ['master1:9000', 'master2:9000', 'master3:9000']
  - job_name: 'curvine-worker'
    static_configs:
      - targets: ['worker1:9001', 'worker2:9001', 'worker3:9001']
  - job_name: 'curvine-fuse'
    static_configs:
      - targets: ['app1:9002', 'app2:9002']
```

### 8.4 Web UI

- Master UI: `http://<master-host>:9000` — cluster overview, file browser, worker status, configuration.
- Worker UI: `http://<worker-host>:9001` — node-level storage and block statistics.

---

## 9. S3 Gateway Best Practices

### 9.1 High-Availability Deployment

- Deploy 3+ gateway instances behind a load balancer (Nginx or HAProxy).
- Use distributed authentication for credential consistency:

```toml
[s3_gateway]
enable_distributed_auth = true
credentials_path = "/system/auth/credentials.jsonl"
```

### 9.2 Performance Tuning

```toml
[s3_gateway]
get_chunk_size_mb = 2.0              # Larger chunks for high-throughput reads
put_memory_buffer_threshold = 4194304  # 4MB buffer for small PUTs
put_max_memory_buffer = 33554432       # 32MB max buffer
```

### 9.3 Health Checks

```bash
# Configure LB health checks against:
curl http://<gateway-host>:9900/healthz
```

---

## 10. Common Pitfalls and Troubleshooting

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Using `localhost` in distributed mode | Workers cannot reach Master | Set proper hostnames via env vars or config |
| Renaming large S3 directories in fs_mode | Operation blocks for hours | Avoid rename on object storage; copy + delete instead |
| TTL too short for training data | Cache thrashing, low hit ratio | Increase `--ttl-ms` to match training epoch duration |
| FUSE2 in production | 50% throughput loss | Upgrade to FUSE3 or use `mnt_number = 4` |
| `rclone` preserving old mtime | Files immediately expire after import | Adjust mtime after import or disable TTL temporarily |
| Single Master in production | Cluster down on Master failure | Deploy 3-node Raft group |
| `format_master = true` in production | Metadata wiped on restart | Set to `false` after initial setup |
| Ignoring `failed_disks` metric | Data loss on disk failure | Monitor and replace disks proactively |
| Not running `resync` in fs_mode | Stale metadata after external UFS changes | Schedule periodic `cv mount resync` |
| Block size too small for large files | Excessive connections, slow random reads | Use `--block-size 1GB` for files > 10GB |

---

## 11. Security Recommendations

- Rotate S3 credentials regularly; use IAM roles where possible.
- Restrict S3 gateway access with credential management:

```bash
bin/curvine-s3-gateway.sh credential generate --description "Service A key"
```

- Use network policies (K8s) or firewall rules to restrict access to Master RPC (8995) and Worker RPC (8997) ports.
- Enable audit logging (`audit_logging_enabled = true`) for compliance-sensitive environments.
- In multi-tenant environments, isolate namespaces by using separate Curvine paths per team with quota controls.

---

## 12. Upgrade and Maintenance

- Always take a metadata snapshot before upgrading Master nodes.
- Perform rolling upgrades: upgrade Followers first, then trigger leader transfer and upgrade the last node.
- After upgrading Workers, verify heartbeat registration via the Web UI or `bin/cv report`.
- Test FUSE remount after upgrades: `bin/curvine-fuse.sh restart`.
- Keep `retain_checkpoint_num = 3` (default) to allow rollback to previous metadata states.
