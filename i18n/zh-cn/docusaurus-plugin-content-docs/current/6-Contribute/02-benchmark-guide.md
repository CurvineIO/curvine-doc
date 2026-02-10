---
sidebar_position: 2
---

# 压测指南

本文说明如何在 Curvine 仓库中运行压测与性能测试。相关脚本与工具位于 [Curvine 源码](https://github.com/CurvineIO/curvine) 的 `build/` 与 `build/tests/` 下。

## 概述

- **元数据压测**：基于 Java 的元数据操作（NNBench 风格），脚本 `build/tests/meta-bench.sh`。
- **吞吐压测**：Rust 客户端或 FUSE 读写，脚本 `build/tests/curvine-bench.sh`；Java 客户端为 `build/tests/java-bench.sh`。
- **FIO 压测**：对 FUSE 挂载点执行 FIO，脚本 `build/tests/fio-test.sh`。

需先有运行中的 Curvine 集群（Master + Worker；FUSE 压测需挂载 FUSE）。先执行 `make all` 构建，再从 `build/dist/` 运行脚本或设置 `CURVINE_HOME` 指向安装目录。

## 前置条件

- Curvine 集群已运行（见 [快速开始](/zh-cn/docs/Deploy/quick-start) 或 [裸机部署](/zh-cn/docs/Deploy/Deploy-Curvine-Cluster/Distributed-Mode/Bare-Metal-Deployment)）。
- 配置文件 `conf/curvine-cluster.toml`。元数据/Java 压测需 Java 与 Maven，以及 `lib/curvine-hadoop-*shade.jar`（随 Java SDK 构建）。

## 运行压测

### 元数据性能（meta-bench）

脚本：`build/tests/meta-bench.sh`。运行 Java 类 `io.curvine.bench.NNBenchWithoutMR`（createWrite、openRead、rename、delete、rmdir）。在仓库根目录设置 `CURVINE_HOME` 为安装目录（如 `build/dist`）后执行：

```bash
build/tests/meta-bench.sh createWrite   # 或 openRead, rename, delete, rmdir
```

详细步骤与结果见 [元数据性能测试](/zh-cn/docs/Benchmark/meta)。

### 吞吐（curvine-bench、java-bench）

**Rust 客户端**：`bin/curvine-bench.sh` 调用 `lib/curvine-bench`：

```bash
bin/curvine-bench.sh fs.write /fs-bench
bin/curvine-bench.sh fs.read /fs-bench
bin/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
bin/curvine-bench.sh fuse.read /curvine-fuse/fs-bench
```

**Java 客户端**：`bin/java-bench.sh` 使用 `io.curvine.bench.CurvineBenchV2` 与 `lib/curvine-hadoop-*shade.jar`。

参数与示例见 [并发性能测试](/zh-cn/docs/Benchmark/concurrent)。

### FIO（fio-test）

脚本：`build/tests/fio-test.sh`。对 FUSE 挂载路径（默认 `/curvine-fuse/fio-test`）执行 FIO，需已挂载 FUSE。

```bash
bin/fio-test.sh
```

命令与结果示例见 [FIO 性能测试](/zh-cn/docs/Benchmark/fio)。

## 建议

1. 环境一致：压测使用独立集群与稳定硬件。  
2. 配置一致：同一 `curvine-cluster.toml` 与路径便于对比。  
3. 多次运行：同一场景多次执行并取平均或中位数。  
4. 监控：关注 CPU、内存、磁盘及 Curvine 指标（Master/Worker web 端口）。  
5. 记录：保存集群规模、配置、脚本参数与结果以便复现。

## 故障排查

- 集群不可达：确认 Master/Worker 已启动，`master_addrs` 或客户端配置指向正确地址；参见 [调试指南](./03-debugging-guide.md)。  
- Java/classpath 报错：确认 `make all` 包含 Java SDK 且存在 `lib/curvine-hadoop-*shade.jar`，并正确设置 `CURVINE_HOME`。  
- FUSE 路径：FUSE 类压测需已挂载（如 `mount | grep curvine-fuse`），脚本中路径需与挂载路径一致。