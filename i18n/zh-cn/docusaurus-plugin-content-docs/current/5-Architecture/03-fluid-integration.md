---
title: Fluid 集成
sidebar_position: 3
---

# Curvine 与 Fluid 集成

本文档描述的是 **当前** Curvine Fluid 集成方式，基线代码来自 Curvine 主分支中的 `curvine-docker/fluid`。它替代旧版只围绕 thin-runtime 的叙述，改为以当前主分支使用的统一 `curvine-fluid` 镜像与统一入口脚本为准。

## 概览

Curvine 目前支持 **两种 Fluid 集成模式**：

- **CacheRuntime 模式**：Fluid 使用统一的 `curvine-fluid` 镜像启动 Curvine 的 **master**、**worker**、**client/FUSE** 三类组件。该模式由 `CacheRuntimeClass` 与 `Dataset` 驱动。
- **ThinRuntime 模式**：Fluid 通过 `ThinRuntimeProfile`、`Dataset`、`ThinRuntime` 只启动 Curvine 的 FUSE 运行时，用来挂接一个已经存在的 Curvine 集群。

两种模式共用同一个镜像入口，`entrypoint.sh` 会根据以下输入自动判定运行模式：

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH`
- 显式命令参数 `fluid-thin-runtime`

## 代码基线

当前实现的源码位于：

- `curvine-docker/fluid/Dockerfile`
- `curvine-docker/fluid/entrypoint.sh`
- `curvine-docker/fluid/generate_config.py`
- `curvine-docker/fluid/config-parse.py`
- `curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml`
- `curvine-docker/fluid/cache-runtime/curvine-dataset.yaml`
- `curvine-docker/fluid/cache-runtime/test-pod.yaml`
- `curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml`

如果本文档与这些文件冲突，以代码为准。

## 运行模式

### 1. CacheRuntime 模式

满足以下任一条件时，`entrypoint.sh` 会进入 CacheRuntime 模式：

- 设置了 `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH` 指向的 Fluid 运行时配置文件存在

在该模式下，`entrypoint.sh` 会：

1. 在 `$CURVINE_HOME/conf/curvine-cluster.toml` 生成基础 Curvine 配置
2. 通过 `generate_config.py` 将 Fluid topology 和组件 options 合并进去
3. 根据角色启动 `master`、`worker` 或 `client`

示例 `curvine-cache-runtime-class.yaml` 中定义的是：

- **master**：`StatefulSet`
- **worker**：`StatefulSet`
- **client**：`DaemonSet`

其中 `client` 侧负责 FUSE 挂载与面向工作负载的访问路径。

### 2. ThinRuntime 模式

满足以下任一条件时，`entrypoint.sh` 会进入 ThinRuntime 模式：

- `FLUID_RUNTIME_TYPE=thin`
- 容器以 `fluid-thin-runtime` 参数启动

在该模式下，`entrypoint.sh` 会调用 `config-parse.py`，完成：

1. 解析 Fluid runtime config JSON
2. 提取 `mountPoint`、`targetPath` 和 Dataset options
3. 生成最小化的 Curvine TOML 配置
4. 生成 `mount-curvine.sh`
5. 直接启动 `curvine-fuse`

因此，ThinRuntime 是更轻量的接入路径：它不会由 Fluid 启动 Curvine master / worker，而是假定你已经有一个可达的 Curvine 集群。

## 前置条件

开始前请确保：

1. 已有可用 Kubernetes 集群
2. 集群中已安装 Fluid
3. 集群可拉取或加载 `curvine-fluid` 镜像
4. 对于 ThinRuntime：已有可达的 Curvine 集群（`master-endpoints`）
5. 对于 CacheRuntime：有权限创建 `CacheRuntimeClass`、`Dataset` 以及测试工作负载

本文默认你已经知道如何单独构建或部署 Curvine 本体。

## 构建统一 Fluid 镜像

当前主分支提供统一的 Fluid 镜像构建目标：

```bash
cd /path/to/curvine
make docker-build-fluid
```

该目标会构建：

```text
curvine-fluid:latest
```

镜像使用的 Dockerfile 是：

```text
curvine-docker/fluid/Dockerfile
```

基础镜像为：

```text
ghcr.io/curvineio/curvine:${BASE_IMAGE_TAG}
```

入口为：

```text
/entrypoint.sh
```

如果你要推送自定义镜像，请记得同步修改示例清单中的镜像地址。

## CacheRuntime 集成

当你希望 Fluid 在集群内直接拉起 Curvine 服务时，使用 CacheRuntime 模式。

### 第一步：创建 CacheRuntimeClass

从以下文件开始：

```text
curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

示例中定义了：

- `master` 工作负载类型：`StatefulSet`
- `worker` 工作负载类型：`StatefulSet`
- `client` 工作负载类型：`DaemonSet`
- 镜像：`ghcr.io/curvineio/curvine-fluid:latest`

应用：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

### 第二步：创建 Dataset

从以下文件开始：

```text
curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

该样例同时包含：

- `kind: Dataset`
- `kind: CacheRuntime`
- `runtimeClassName: curvine`
- `mountPoint: "curvine:///data"`

应用：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

### 第三步：理解配置如何生成

`generate_config.py` 会把 Fluid topology 和组件 options 合并进 Curvine 配置。

关键行为包括：

- `CURVINE_DATASET_NAME` 会变成 Curvine 的 `cluster_id`
- Master journal peer 地址会从 Fluid master pod topology 生成
- `worker.data_dir` 会根据 `worker.options.data_dir` 或 `tieredStore` 推导
- `client.targetPath` 会变成 `fuse.mnt_path`
- `client.master_addrs` 会由生成的 master endpoints 推导

这意味着最终的 Curvine 配置并不是固定手写的 TOML，而是运行时由 Fluid 配置和环境变量共同生成。

### 第四步：验证运行状态

检查核心资源：

```bash
kubectl get cacheruntimeclass
kubectl get dataset
kubectl get pods -A | grep curvine
```

### 第五步：运行测试 Pod

可直接使用：

```text
curvine-docker/fluid/cache-runtime/test-pod.yaml
```

应用并查看日志：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/test-pod.yaml
kubectl logs curvine-demo
```

该样例会把 Curvine-backed PVC 挂载到 `/data`，并做简单的读写验证。

## ThinRuntime 集成

当你已经有独立运行的 Curvine 集群，只想让 Fluid 把它挂进工作负载时，使用 ThinRuntime 模式。

### 第一步：创建 ThinRuntimeProfile

使用：

```text
curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

其中关键字段是：

```yaml
kind: ThinRuntimeProfile
spec:
  fileSystemType: fuse
  fuse:
    image: ghcr.io/curvineio/curvine-fluid
    imageTag: latest
```

### 第二步：创建 Dataset

同一个文件里还包含 Dataset：

```yaml
kind: Dataset
spec:
  mounts:
  - mountPoint: curvine:///data
    options:
      master-endpoints: "127.0.0.1:8995"
```

`config-parse.py` 当前重点解析的 Dataset options 有：

| 选项 | 必填 | 含义 |
| --- | --- | --- |
| `master-endpoints` | 是 | Curvine Master RPC 端点，格式 `host:port` |
| `master-web-port` | 否 | Master Web 端口覆盖 |
| `io-threads` | 否 | FUSE I/O 线程数 |
| `worker-threads` | 否 | FUSE worker 线程数 |
| `mnt-number` | 否 | FUSE mount 数量 |

### 第三步：创建 ThinRuntime

样例中还包含：

```yaml
kind: ThinRuntime
metadata:
  name: curvine-dataset
spec:
  profileName: curvine-profile
```

直接整体应用：

```bash
kubectl apply -f curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

### 第四步：理解生成文件

在 ThinRuntime 模式下，`config-parse.py` 会生成：

- `$CURVINE_HOME/conf/curvine-cluster.toml`
- `$CURVINE_HOME/mount-curvine.sh`

生成的 TOML 中会包含：

- `master.hostname`
- `client.master_addrs`
- `fuse.mnt_path`
- `fuse.fs_path`

这些值都来自 Fluid Dataset 配置。

### 第五步：验证 ThinRuntime

检查资源：

```bash
kubectl get thinruntime
kubectl get dataset
kubectl get pods -A | grep curvine
```

## 验证清单

不管使用哪种模式，都建议确认：

- 对应的 Fluid 资源已经进入 `Ready` / `Bound`
- Curvine 或 FUSE 相关 Pod 处于运行状态
- 工作负载中的挂载路径可访问
- 读写行为符合预期

常用检查命令：

```bash
kubectl get dataset
kubectl get thinruntime
kubectl get cacheruntime
kubectl get pods -A | grep curvine
kubectl describe dataset <name>
```

## 排障建议

### 镜像进入了错误的运行模式

检查：

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH` 是否存在
- 容器启动参数是否为 `master`、`worker`、`client` 或 `fluid-thin-runtime`

### ThinRuntime 无法连接 Curvine

优先检查 Dataset 中：

```yaml
master-endpoints: "host:port"
```

它必须指向实际可达的 Curvine Master RPC 端点。

### FUSE 没挂上

查看日志：

```bash
kubectl logs <pod>
```

重点确认：

- `/dev/fuse` 是否可用
- 运行容器是否具备所需特权
- `targetPath` 和 `mountPoint` 是否正确

### CacheRuntime 生成的配置不对

查看 master / worker / client 日志：

```bash
kubectl logs <master-pod>
kubectl logs <worker-pod>
kubectl logs <client-pod>
```

`generate_config.py` 强依赖 Fluid topology 元数据来生成 journal peers 和 service FQDN；如果 topology 缺失或字段不符合预期，生成出来的 Curvine 配置也会有问题。

## 后续维护建议

今后如果继续扩展这条集成链路，建议保持文档遵循以下结构：

1. 运行模式
2. 代码基线
3. 镜像构建
4. 清单部署
5. 验证方式
6. 排障入口

这样即使 manifest 布局继续调整，文档仍然容易跟着代码演进。
