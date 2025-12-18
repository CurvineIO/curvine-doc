---
sidebar_position: 2
---

# Performance Tuning

This chapter introduces how to optimize Curvine's performance.

## Server-Side Performance Tuning

The default configuration is suitable for most scenarios. In high-load environments, you can adjust the following parameters:

- **Thread count tuning**: Adjust the number of worker threads based on CPU cores and business load
- **Kernel parameter optimization**: Adjust network buffers, resource limits, and other parameters

Curvine configuration adjustment example:
```toml
# io_threads = CPU cores, worker_threads = CPU cores * 2
[master]
io_threads = 32
worker_threads = 64

[worker]
io_threads = 32
worker_threads = 64
```

Kernel parameter adjustment example (configuration examples show which parameters affect performance, for reference only, adjust according to actual needs):
```bash
# Adjust maximum file open count
ulimit -n 128000

# Adjust network parameters
echo "
net.ipv4.tcp_rmem=8192    128000  33554432
net.ipv4.tcp_wmem=8192    128000  33554432
net.core.rmem_max=67108864
net.core.wmem_max=67108864
net.ipv4.tcp_mem=94500000     915000000       927000000
" > /etc/sysctl.d/99-curvine-sysctl.conf
```

## Client-Side Performance Tuning

### Sequential Read/Write Scenarios

Sequential read/write scenarios can achieve optimal performance using default configurations.

### High Concurrency Read/Write Scenarios

When clients need to handle a large number of file I/O operations simultaneously:
- Set `read_chunk_num=1` and `write_chunk_num=1` to reduce memory usage
- Suitable for scenarios with concurrent file count > 1000
- Single file throughput will decrease, but overall throughput remains unchanged, memory usage will decrease by 90%

Configuration example:
```toml
[client]
read_chunk_num = 1
write_chunk_num = 1
```

### Large File Sequential Read

For sequential reading of single large files (>100GB):
- Recommended parallelism = 4-16
- Performance can improve 3-5 times, reaching 2-3GB/s

Configuration example:
```toml
# Set read parallelism
[client]
read_parallel = 8
```

### Random Read

For completely random reads, it's recommended to:
- Set buffer to 1 to avoid read amplification
- Make chunk_size close to average I/O size (e.g., 4KB/256KB)
- For large files, set block_size ≥ 1GB to reduce connection count

Configuration example:
```toml
[client]
read_chunk_num = 1
# Adjust according to actual I/O patterns
read_chunk_size = "256KB"
```

:::tip
In completely random read scenarios, the client will cache connections with workers to reduce connection establishment overhead. However, if a file is very large, it will have many blocks, leading to too many connections. It's recommended to set block_size to 1GB or above when writing such large files to reduce connection count.
:::

## FUSE Performance Optimization

Curvine FUSE currently supports FUSE2 and FUSE3. FUSE2's performance is approximately only 50% of FUSE3, so it's recommended to use FUSE3 in production environments.

### Memory Control

If FUSE is deployed on memory-constrained machines, you can set queue sizes to reduce memory usage:

Configuration example:
```toml
[fuse]
# Set FUSE request queue size
fuse_channel_size = 1024

# Set read/write data queue buffer size
stream_channel_size = 16
```

:::warning
Curvine FUSE currently does not support page cache.
:::

### Metadata Performance Optimization

In traditional libfuse implementations, metadata may be blocked by data read/write requests, causing request delays. Users are usually advised to set `attr_timeout` and `entry_timeout` to let the kernel cache metadata and improve performance.

However, in Curvine's FUSE implementation, FUSE request processing is completely asynchronous, so there's no need to set `attr_timeout` and `entry_timeout`.

Of course, if needed, you can also increase cache time. Configuration example:

```toml
# Set metadata expiration time to 60s, default is 1s
[fuse]
entry_timeout = 60
attr_timeout = 60
```

If you want modifications to be visible in real-time, you can set expiration time to 0, which won't affect FUSE performance:

```toml
[fuse]
entry_timeout = 0
attr_timeout = 0
```

### FUSE2 Optimization Solution

If your environment can only use FUSE2 and you want to improve performance, you can use multiple mount points as a solution. In actual testing, 4-8 mount points can achieve about 80% of FUSE3's performance.

Configuration example:
```toml
[fuse]
mnt_number = 4
```

:::tip
Multiple mount points will mount multiple directories in the operating system. Programs need to use random or round-robin methods to select mount points to distribute the load.
:::
