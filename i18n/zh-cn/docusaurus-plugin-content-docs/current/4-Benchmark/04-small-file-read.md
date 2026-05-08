# Curvine 小文件读取性能测试

## 一、测试环境与配置

### 1. 硬件与网络环境

- 测试机型：阿里云 ECS i5.8xlarge（32 核 CPU / 256GB 内存）
- 网络带宽：80Gbps
- 部署架构：1 台单机部署 `curvine-master`、`curvine-worker` 及 MinIO 服务，1 台部署 FUSE 客户端

### 2. 基础环境

- 操作系统：Ubuntu 22.04 LTS
- 测试数据集：BDD100K 图像数据集（共 70,000 张图片，典型 AI 训练小文件场景，单文件大小约几十 KB）
- 数据集来源：ModelScope 开源数据集（链接：https://www.modelscope.cn/datasets/iic/BDD100K/feedback）

### 3. 测试工具与脚本

- 核心测试脚本：`tests/load_img.py`（模拟 AI 训练场景，高并发读取图片，支持多进程并行调度）
- 数据迁移工具：`rclone`（多线程传输，确保数据迁移效率与稳定性）
- 对象存储服务：MinIO（单机部署，模拟 S3 兼容对象存储场景）

## 二、测试方案

本次测试围绕 Curvine 两种核心挂载模式（fs-mode、cache-mode）展开，重点验证冷启动读取、Page Cache 命中读取及元数据缓存优化对性能的影响，同时以原生 MinIO 作为基准对照，全面评估 Curvine 小文件读取能力。

## 三、测试流程

### 1. fs-mode 测试流程

挂载 Curvine 至指定目录：

```bash
bin/cv mount s3://xuen/fs_mode /xuen/fs_mode \
  --write-type fs_mode \
  -c s3.endpoint_url=http://hostname:9000 \
  -c s3.credentials.access=minioadmin \
  -c s3.credentials.secret=minioadmin \
  -c s3.region_name=cn
```

数据迁移：通过 `rclone` 将 70,000 张图片从本地 `/data/img/bdd` 拷贝至 Curvine 挂载目录。fs-mode 下，70,000 张图片通过 `rclone` 拷贝至 Curvine 挂载目录，总耗时 55 秒，传输效率稳定，满足大规模小文件快速接入需求。

```bash
rclone copy /data/img/bdd /curvine-fuse/xuen/fs_mode/bdd -P --transfers=16
```

数据读取测试命令：

```bash
python3 tests/load_img.py /curvine-fuse/xuen/fs_mode/bdd \
  --num_workers 32 \
  --num_samples 70000
```

元数据缓存优化测试：分别开启内核元数据缓存、客户端元数据缓存、双缓存。

### 2. cache-mode 测试流程

先通过 `mc` 命令将 70,000 张图片预拷贝至 MinIO 对应桶（`xuen/cache_mode`）。

挂载 Curvine 至指定目录：

```bash
bin/cv mount s3://xuen/cache_mode /xuen/cache_mode \
  --write-type cache_mode \
  -c s3.endpoint_url=http://10.212.185.64:9000 \
  -c s3.credentials.access=minioadmin \
  -c s3.credentials.secret=minioadmin \
  -c s3.region_name=cn
```

读取测试命令：

```bash
python3 tests/load_img.py /curvine-fuse/xuen/cache_mode/bdd \
  --num_workers 32 \
  --num_samples 70000
```

元数据缓存优化测试：分别开启内核元数据缓存、客户端元数据缓存、双缓存。

## 四、测试结果

| 测试类型 | 处理速度（张/秒） | 性能提升对比（与 MinIO 冷读） |
| --- | ---: | ---: |
| MinIO 原生冷读（基准） | 1675 | - |
| Curvine 基础版 | 5615 | +235.2% |
| Curvine + 内核元数据缓存 | 5997 | +257.9% |
| Curvine + 客户端元数据缓存 | 6174 | +268.6% |
| Curvine + 双元数据缓存 | 6117 | +265.2% |

## 五、测试结论

- 远超原生存储：Curvine 最优读取性能达 6174 张/秒，是原生 MinIO（1675 张/秒）的 3.68 倍；基础版性能 5615 张/秒，已是原生 MinIO 的 3.35 倍
- 元数据缓存增益显著：开启元数据缓存后，性能较 Curvine 基础版提升 6.8%~10.0%，其中客户端元数据缓存优化效果最佳
- 元数据机制高效：Curvine 原生基础版已实现 5615 张/秒的高性能读取，无需依赖缓存即可满足 AI 小文件读取需求，降低配置复杂度与运维成本
- 模式兼容性强：fs-mode、cache-mode 均能稳定发挥高性能，适配不同业务场景的存储需求，兼顾性能与灵活性
