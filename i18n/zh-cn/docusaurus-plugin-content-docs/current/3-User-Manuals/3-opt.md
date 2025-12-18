---
sidebar_position: 2
---

# 性能调优
本章介绍如何优化curvine的性能。 

## 服务端性能调优
默认配置适用于大多数场景，在高负载环境下可调整以下参数：

- **线程数调优**：根据CPU核心数和业务负载调整工作线程数
- **内核参数优化**：调整网络缓冲区、资源限制等参数

curvine配置调整如下示例:
```
# io_threads = cpu核心数，worker_threads = cpu核心数 * 2
[master]
io_threads = 32
worker_threads = 64

[worker]
io_threads = 32
worker_threads = 64
```

内核参数调整示例（配置示例展示哪些参数会影响性能，仅供参考，以实际需求未准）：
``` 
# 调整最大文件打开数
ulimit -n 128000

# 调整网络参数
echo "
net.ipv4.tcp_rmem=8192    128000  33554432
net.ipv4.tcp_wmem=8192    128000  33554432
net.core.rmem_max=67108864
net.core.wmem_max=67108864
net.ipv4.tcp_mem=94500000     915000000       927000000
" > /etc/sysctl.d/99-curvine-sysctl.conf
```

## 客户端性能调优

### 顺序读写场景
顺序读写场景使用默认配置即可获得最佳性能。

### 高并发读写场景
当客户端需要同时处理大量文件IO时：
- 设置`read_chunk_num=1`和`write_chunk_num=1`减少内存占用
- 适用于并发文件数 > 1000的场景
- 单文件吞吐会下降，但是整体吞吐不变，内存使用会下降90%

配置示例：
```
# 将读取缓冲区大小设置为1
[client]
read_chunk_num = 1
write_chunk_num = 1
```

### 大文件顺序读
针对单个大文件(>100GB)的顺序读取：
- 推荐并行度 = 4-16
- 性能可提升3-5倍，达到2-3GB/s

配置示例：
```
# 设置读取并行度
[client]
read_parallel = 8
```

### 随机读
完全随机读取时建议：
- 设置缓冲区为1避免读放大
- 使chunk_size接近平均IO大小(如4KB/256KB)
- 对大文件设置block_size ≥ 1GB减少连接数

配置示例：
```
[client]
read_chunk_num = 1
# 根据实际IO模式调整
read_chunk_size = 256KB
```

:::tip
在完全随机读场景中，客户端会缓存和worker的连接，以减少连接建的开销。但是一个文件很大，会有很多block，会导致连接数过多，
建议这种大文件下写入时将block_size设置为1GB以上，这样可以减少连接数。
:::


## fuse性能优化
curvine fuse目前支持fuse2、fuse3；fuse2的性能大约只有fuse3的50%，因此建议在生产环境中使用fuse3。

### 内存控制
如果fuse部署在内存受限的机器上，可以设置队列大小，减少内存使用：

配置示例：
```
[fuse]
# 设置fuse请求队列大小
fuse_channel_size = 1024

# 设置读写数据队列缓冲大小
stream_channel_size = 16
```

:::warning
curvine fuse目前不支持page cache。
:::

### 元数据性能优化
在传统libfuse实现的fuse模块中，元数据可能会被数据读写请求阻塞，导致请求延迟；通常会建议用户设置`attr_timeout`和`entry_timeout`，
让内核缓存元数据，提升性能；
但是在curvine fuse实现中，fuse请求处理是完全异步，因此可以不需要设置`attr_timeout`和`entry_timeout`。

当然如果有需要，也可以增加缓存时间，配置示例如下：

```
# 设置元数据过期时间为60s，默认值为1s。
[fuse]
entry_timeout = 60
attr_timeout = 60
```

如果希望修改实时可见，可以设置过期时间为0，这并不会影响fuse性能，示例如下：

``` 
[fuse]
entry_timeout = 60
attr_timeout = 60
```

### FUSE2优化方案
如果环境只能使用fuse2，同时希望提升性能，可以使用多个挂载点来解决。在实际测试中，4-8个挂载点可以达到fuse3 80%左右的性能。

配置示例：
``` 
[fuse]
mnt_number = 4
```

:::tip
多挂载点会在操作系统挂载多个目录，程序需要使用随机、轮询的方式选择挂载点来分摊压力。
:::
