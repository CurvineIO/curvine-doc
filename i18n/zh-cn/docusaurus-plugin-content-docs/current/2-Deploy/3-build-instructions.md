---
sidebar_position: 2
---

# 构建指南

本页内容与仓库 README 中的构建指南保持一致。如需完整的编译指南（Docker 编译、UFS 模块、安装包打包等），请参考[下载和编译 Curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md)。

本项目需要以下依赖项，请确保在继续之前已安装：

## 先决条件

- **GCC**：10 或更高版本（[安装指南](https://gcc.gnu.org/install/)）
- **Rust**：1.98（由 `rust-toolchain.toml` 固定；`build/check-env.sh` 接受 1.86 及以上）（[安装指南](https://www.rust-lang.org/tools/install)）
- **Protobuf**：3.x 版本
- **Maven**：3.8 或更高版本（[安装指南](https://maven.apache.org/install.html)）
- **LLVM**：12 或更高版本（[安装指南](https://llvm.org/docs/GettingStarted.html)）
- **FUSE**：libfuse2 或 libfuse3 开发包
- **JDK**：1.8 或更高版本（OpenJDK 或 Oracle JDK）
- **npm**：9 或更高版本（[Node.js 安装](https://nodejs.org/)）
- **Python**：3.7 或更高版本（[安装指南](https://www.python.org/downloads/)）

您可以选择：

1. 使用预配置的 `curvine-docker/compile/Dockerfile_rocky9` 来构建编译镜像
2. 参考此 Dockerfile 为其他操作系统版本创建编译镜像
3. curvine 在 dockerhub 上提供了 `curvine/curvine-compile` 镜像

## 构建步骤（Linux - Ubuntu/Debian 示例）

使用 `make` 编译：

```bash
# 编译所有模块
make all

# 只编译核心模块：server client cli
make build ARGS="-p core"

# 编译 fuse 和核心模块
make build ARGS="-p core -p fuse"

# 编译 server-native SPDK/RDMA 支持。curvine-cli 和 curvine-fuse
# 会按客户端安全 profile 单独构建，避免被 server-native feature 污染。
make build ARGS="-p core -p fuse --spdk-rdma --spdk-dir /opt/spdk"
```

使用 `build.sh` 编译：

```bash
# 编译所有模块
bash build/build.sh

# 输出命令帮助
bash build/build.sh -h

# 只编译核心模块：server client cli
bash build/build.sh -p core

# 编译 fuse 和核心模块
bash build/build.sh -p core -p fuse

# 只编译 server-native SPDK/RDMA artifact
bash build/build.sh -p server --spdk-rdma --spdk-dir /opt/spdk
```

构建镜像：

```bash
# 从源码构建运行时镜像
make docker-build

# 在已缓存依赖的编译镜像中编译，产物输出到 build/dist
make docker-compile
```

编译成功后，目标文件将生成在 `build/dist` 目录中。该文件是可用于部署或构建镜像的 Curvine 安装包。

## 启动单节点集群

:::note
本节等价于从源码构建后的[快速开始](./1-quick-start.md)流程。如果你已有 release 包，请直接参考快速开始。
:::

```bash
cd build/dist

# 启动 master 节点
bin/curvine-master.sh start

# 启动 worker 节点
bin/curvine-worker.sh start
```

挂载文件系统：

```bash
# 默认挂载点为 /curvine-fuse
bin/curvine-fuse.sh start
```

查看集群概览：

```bash
bin/cv report
```

使用兼容 HDFS 命令访问文件系统：

```bash
bin/cv fs mkdir /a
bin/cv fs ls /
```

访问 Web 界面：

```
http://your-hostname:9001
```

Curvine 使用 TOML 格式的配置文件。示例配置位于 `conf/curvine-cluster.toml`，主要配置项包括：

- 网络设置（端口、地址等）
- 存储策略（缓存大小、存储类型）
- 集群配置（节点数量、副本因子）
- 性能调优参数

停止集群：

```bash
# 停止 FUSE 挂载
bin/curvine-fuse.sh stop

# 停止 worker 和 master 节点
bin/curvine-worker.sh stop
bin/curvine-master.sh stop
```
