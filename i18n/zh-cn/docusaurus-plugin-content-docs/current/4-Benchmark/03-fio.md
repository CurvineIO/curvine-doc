# FIO 测试

## 一、测试环境配置

本次测试基于阿里云 ECS 服务器搭建 Curvine 存储环境，详细配置如下，确保测试环境的稳定性和可复现性：

- 测试机型：阿里云 ECS i5.8xlarge（32 核 CPU / 256GB 内存）
- 网络带宽：80Gbps，保障数据传输无网络瓶颈
- 部署架构：1 台服务器单独部署 `curvine-master`、`curvine-worker` 服务；1 台服务器部署 FUSE 客户端，用于模拟业务访问
- 存储配置：`curvine-worker` 挂载 1 块 SSD 磁盘，磁盘性能上限为：读最大 16GB/s，写最大 28GB/s

## 二、100G 大文件性能测试

本次大文件测试统一设置 `block_size` 为 1G，采用 fio 工具进行性能测试（fio 工具为 Linux/Unix 下常用 IO 基准测试工具，可精准模拟各类存储读写负载），测试场景包括写入测试、256k 顺序读、256k 随机读，详细测试过程及结果如下：

### 2.1 写入测试

测试目的：验证 100G 大文件的顺序写入性能，采用 256k 块大小，绕过内核缓存（`direct=1`），确保测试结果反映存储真实写入能力。

执行命令：

```bash
fio --name=seq_write \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--numjobs=1 \
--rw=write \
--group_reporting \
--time_based=0
```

### 2.2 256k 顺序读测试

测试目的：验证不同线程数下，100G 大文件的 256k 顺序读取性能，测试时长 60 秒，绕过内核缓存，重点观测带宽随线程数的变化规律。

执行命令：

```bash
fio --name=seq_read \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--group_reporting \
--time_based=0 \
--runtime=60 \
--rw=read \
--numjobs={numjobs}
```

测试结果（线程数与读取速度对应关系）：

| 线程数 | 读取速度（GiB/s） |
| ---: | ---: |
| 1 | 2.1 |
| 2 | 3.7 |
| 4 | 6.1 |
| 8 | 8.5 |
| 16 | 9.8 |
| 32 | 9.2 |
| 64 | 9.3 |
| 128 | 9.3 |

### 2.3 256k 随机读测试

测试目的：验证不同线程数下，100G 大文件的 256k 随机读取性能，同步观测 IOPS（每秒 IO 操作数）指标，反映存储对随机访问的支撑能力。

客户端配置：

说明：本次 fio 随机读测试采用完全随机模式，会频繁切换 block；以下两个客户端配置，可确保 block 连接被有效缓存，避免频繁建立和断开连接，保障测试过程的稳定性和数据准确性。

```toml
[client]
block_size = "1g"
max_cache_block_handles = 200
```

执行命令：

```bash
fio --name=seq_read \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--rw=randread \
--group_reporting \
--time_based=0 \
--runtime=60 \
--numjobs={numjobs}
```

测试结果（线程数、读取速度与 IOPS 对应关系）：

| 线程数 | 读取速度（GiB/s） | IOPS（K） |
| ---: | ---: | ---: |
| 1 | 0.2 | 0.9 |
| 2 | 0.5 | 1.9 |
| 4 | 1.0 | 4.2 |
| 8 | 2.4 | 9.8 |
| 16 | 4.9 | 19.9 |
| 32 | 8.1 | 32.4 |
| 64 | 9.3 | 37.9 |
| 128 | 9.3 | 40 |

## 三、并发读写测试

测试目的：验证不同线程数下，Curvine 存储的并发读写性能，覆盖顺序写、顺序读、随机写、随机读四种核心场景，测试文件大小为 1G，块大小 256k，绕过内核缓存，重点关注 16 和 128 线程数的性能表现，同时补充其他线程数数据作为参考。

### 3.1 测试命令

#### 3.1.1 顺序写

```bash
fio --name=seq_write \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=write \
--group_reporting \
--time_based=0 \
--numjobs=8{numjobs}
```

#### 3.1.2 顺序读

```bash
fio --name=seq_read \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=read \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

#### 3.1.3 随机写

```bash
fio --name=rand_write \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=randwrite \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

#### 3.1.4 随机读

```bash
fio --name=rand_read \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=randread \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

### 3.2 测试结果

| 线程数 | 顺序写（GiB/s） | 顺序读（GiB/s） | 随机写（GiB/s） | 随机读（GiB/s） |
| ---: | ---: | ---: | ---: | ---: |
| 8 | 4.6 | 3.8 | 4.6 | 2.5 |
| 16 | 7.2 | 6.7 | 7.2 | 5.0 |
| 32 | 10.5 | 9.7 | 10.5 | 8.8 |
| 64 | 12.6 | 12.6 | 12.6 | 11.3 |
| 128 | 10.2 | 14.0 | 9.6 | 14.0 |

## 四、测试说明

本次测试均启用 `direct=1` 参数，绕过内核 page cache，确保测试结果反映 Curvine 存储及 SSD 磁盘的真实性能，避免缓存对测试数据的干扰。

fio 测试工具采用 `libaio` IO 引擎，支持异步 IO 操作，更贴合实际业务中的高并发 IO 场景，测试结果具有较高的参考价值。
