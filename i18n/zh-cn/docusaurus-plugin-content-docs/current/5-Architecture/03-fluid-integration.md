---
title: Fluid 集成
sidebar_position: 3
---

# Curvine 与 Fluid 集成

Fluid 可以把 Kubernetes 里的 `Dataset` 暴露给业务 Pod。Curvine 可以作为这个 Dataset 背后的缓存运行时，也可以作为一个已经存在的存储集群，由 Fluid 负责挂载到业务 Pod。

如果是新接入 Fluid，建议优先使用 **CacheRuntime**。它会让 Fluid 拉起 Curvine master、worker 和 FUSE client Pod，也是支持 `DataLoad` 数据预热的主要方式。

## 选择接入方式

| 模式 | 适用场景 | Fluid 会启动什么 | 主要资源 |
| --- | --- | --- | --- |
| CacheRuntime | 希望 Fluid 在 Kubernetes 中管理一套 Curvine 缓存集群。 | Curvine master、worker、client/FUSE Pod。 | `CacheRuntimeClass`、`Dataset`、`CacheRuntime` |
| ThinRuntime | 已经有一套 Curvine 集群，只希望 Fluid 把它挂进业务 Pod。 | 只启动 Curvine FUSE runtime。 | `ThinRuntimeProfile`、`Dataset`、`ThinRuntime` |

大多数新用户应选择 CacheRuntime。ThinRuntime 更适合 Curvine 已经独立运维的场景。

## 文件与参考资料

Curvine 的 Fluid 物料在 Curvine 源码中：

| 文件 | 用途 |
| --- | --- |
| `curvine-docker/deploy/Dockerfile_*` | 构建普通 `curvine` 运行时镜像；Fluid 支持已经包含在这个镜像里。 |
| `curvine-docker/deploy/entrypoint.sh` | 启动普通 Curvine 服务；如果检测到 Fluid 运行时模式，则转到 `/fluid-entrypoint.sh`。 |
| `curvine-docker/fluid/entrypoint.sh` | Fluid 入口脚本，会作为 `/fluid-entrypoint.sh` 打进主镜像，并判断 CacheRuntime / ThinRuntime 模式。 |
| `curvine-docker/fluid/generate_config.py` | 解析 Fluid runtime JSON，为 CacheRuntime Pod 生成 Curvine TOML 配置。 |
| `curvine-docker/fluid/config-parse.py` | 解析 Fluid runtime JSON，为 ThinRuntime 生成 Curvine TOML 配置和挂载脚本。 |
| `curvine-docker/fluid/mountUfs.sh` | 把 Dataset 的 UFS 路径挂载到 Curvine，并把已挂载的 Curvine 路径返回给 Fluid。 |
| `curvine-docker/fluid/cache-runtime/` | CacheRuntime 示例。 |
| `curvine-docker/fluid/thin-runtime/` | ThinRuntime 示例。 |

Fluid 侧参考资料：

- [Generic CacheRuntime 集成文档](https://github.com/fluid-cloudnative/fluid/blob/master/docs/zh/dev/generic_cache_runtime_integration.md)
- [CacheRuntime 数据操作文档](https://github.com/fluid-cloudnative/fluid/blob/master/docs/zh/samples/cacheruntime_data_operations.md)
- [Fluid Curvine e2e 示例](https://github.com/fluid-cloudnative/fluid/blob/master/test/gha-e2e/curvine/cacheruntimeclass.yaml)

## 构建供 Fluid 使用的 Curvine 镜像

Fluid 直接使用普通 `curvine` 运行时镜像。这个镜像里已经包含 Fluid entrypoint 和辅助脚本。

```bash
cd /path/to/curvine
make docker-build
```

该命令会构建：

```text
curvine:latest
```

如果构建过程要求选择运行时基础镜像，请选择和集群匹配的基础镜像。本次集成验证使用 Rocky 9 镜像。

如果使用本地集群，可以把镜像加载进去：

```bash
kind load docker-image curvine:latest
```

或：

```bash
minikube image load curvine:latest
```

如果使用共享集群，需要推送到镜像仓库，并同步修改 Fluid 清单里的镜像地址：

```bash
docker tag curvine:latest <registry>/curvine:<tag>
docker push <registry>/curvine:<tag>
```

在 `CacheRuntimeClass` 和 `ThinRuntimeProfile` 里使用同一个镜像。

CacheRuntime `DataLoad` 路径已经用 Fluid chart `helm-chart-fluid-1.1.0-alpha.10` 验证过；该 chart 对应的 Fluid 镜像 tag 是 `v1.1.0-676f47a`。如果使用更旧的 chart 或自定义 DataLoad 模板，请看下面 DataLoad 章节里的 fallback 说明。

## CacheRuntime 快速开始

当你希望 Fluid 创建并管理 Curvine 缓存 Pod 时，使用 CacheRuntime。

### 1. 创建 CacheRuntimeClass

从这个文件开始：

```text
curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

应用：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

这个 class 定义了 Fluid 如何启动 Curvine 的各个角色：

| 角色 | Kubernetes 工作负载 | 作用 |
| --- | --- | --- |
| `master` | `StatefulSet` | Curvine 元数据和 journal 服务。 |
| `worker` | `StatefulSet` | 缓存存储。 |
| `client` | `DaemonSet` | 面向业务 Pod 的 FUSE 挂载。 |

这个 class 还定义了 `executionEntries.mountUFS`。Fluid 会调用这个入口，让 Curvine 在服务 Dataset 前先挂载底层 UFS 路径。Curvine 镜像中的脚本路径是：

```text
/app/curvine/mountUfs.sh
```

该脚本会读取 `FLUID_RUNTIME_CONFIG_PATH`，对非 Curvine 原生路径执行 `cv mount`，对 `curvine://` 原生路径直接跳过并返回路径。最后输出 Fluid 需要的 JSON：

```json
{"mounted":["/path"]}
```

### 2. 创建 Dataset 和 CacheRuntime

从这个文件开始：

```text
curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

应用：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

示例文件同时包含两个资源：

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: Dataset
metadata:
  name: curvine-demo
  namespace: default
spec:
  mounts:
    - name: curvine
      mountPoint: "curvine:///data"
---
apiVersion: data.fluid.io/v1alpha1
kind: CacheRuntime
metadata:
  name: curvine-demo
  namespace: default
spec:
  runtimeClassName: curvine
```

`Dataset.spec.mounts[].mountPoint` 是 Curvine 通过 Fluid 暴露的后端路径。业务 Pod 后续挂载的是 Dataset 生成的 PVC，不需要直接挂这个后端路径。

### 3. 等待运行时就绪

检查 Fluid 资源和 Curvine Pod：

```bash
kubectl get dataset curvine-demo
kubectl get cacheruntime curvine-demo
kubectl get pods -A | grep curvine-demo
```

如果 Dataset 没有 ready，查看 Dataset 和 Curvine Pod 日志：

```bash
kubectl describe dataset curvine-demo
kubectl logs <curvine-master-pod>
kubectl logs <curvine-worker-pod>
kubectl logs <curvine-client-pod>
```

### 4. 运行测试 Pod

使用示例工作负载：

```text
curvine-docker/fluid/cache-runtime/test-pod.yaml
```

应用并查看日志：

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/test-pod.yaml
kubectl logs curvine-demo
```

这个 Pod 会挂载由 Curvine 支撑的 Fluid PVC，并做简单读写检查。

## CacheRuntime 配置如何生成

CacheRuntime Pod 不使用固定手写的 TOML 文件。

Fluid 会把运行时信息写入下面这个环境变量指向的文件：

```text
FLUID_RUNTIME_CONFIG_PATH
```

Curvine 随后运行：

```text
curvine-docker/fluid/generate_config.py
```

该脚本读取 Fluid JSON，并写出：

```text
$CURVINE_HOME/conf/curvine-cluster.toml
```

几个关键生成项如下：

| Curvine 配置 | 来源 |
| --- | --- |
| `cluster_id` | Dataset 名称或 Dataset mount option。 |
| `journal.journal_addrs` | Fluid master topology 和 service 名称。 |
| `worker.data_dir` | worker options 或 Fluid `tieredStore`。 |
| `client.master_addrs` | 生成的 master RPC endpoint。 |
| `fuse.mnt_path` | Fluid client target path。 |

所以，`FLUID_RUNTIME_CONFIG_PATH` 对 master、worker、client Pod 都很关键。

## CacheRuntime DataLoad

`DataLoad` 用来把 Dataset 中的一个或多个路径预热到缓存里。对 Curvine 来说，DataLoad Job 最终应执行类似命令：

```bash
/app/curvine/bin/cv load <path> --watch --conf <curvine-conf>
```

这里要分清两件事：

1. `CacheRuntimeClass.dataOperationSpecs` 定义“这个缓存运行时如何执行 DataLoad”。
2. `DataLoad` 资源定义“要给哪个 Dataset 预热哪些路径”。

### 1. 在 CacheRuntimeClass 中打开 DataLoad

在已有 `CacheRuntimeClass` 顶层增加 `dataOperationSpecs`。

只需要增加这个字段。不要为了打开 DataLoad 去改 `topology`、`fileSystemType` 或 master/worker/client 定义。

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: CacheRuntimeClass
metadata:
  name: curvine
fileSystemType: curvinefs
dataOperationSpecs:
  - name: DataLoad
    command:
      - /bin/bash
      - -c
    args:
      - |
        # 这里的命令需要先为当前 Job 准备 Curvine 配置，
        # 然后加载 Fluid 传入的每一个路径。
        IFS=: read -ra paths <<< "$FLUID_DATALOAD_DATA_PATH"
        for p in "${paths[@]}"; do
          /app/curvine/bin/cv load "$p" --watch --conf /etc/curvine.toml || exit 1
        done
topology:
  master:
    # 保留已有 CacheRuntime topology。
```

不要把这段直接当成完整生产命令复制使用，除非你的 DataLoad 镜像或脚本会在执行 `cv load` 前生成 `/etc/curvine.toml`。Curvine 示例 `curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml` 已经包含这部分逻辑。

Fluid 会把这些环境变量注入 DataLoad Job：

| 环境变量 | 含义 |
| --- | --- |
| `FLUID_DATALOAD_METADATA` | 是否加载元数据。 |
| `FLUID_DATALOAD_DATA_PATH` | 要加载的路径，多个路径用 `:` 连接。 |
| `FLUID_DATALOAD_PATH_REPLICAS` | 每个路径的副本数，多个值用 `:` 连接。 |

Curvine 的 CacheRuntimeClass 示例会在 `dataOperationSpecs` 里内联 DataLoad 脚本，因为 Fluid 会把数据操作作为短生命周期 Job 执行。脚本会先从 Fluid runtime JSON 生成 Curvine 配置；如果这个文件没有挂载，再依次回退到 Dataset 元数据、Pod label，以及 `<dataset>-load` 这类 DataLoad 名称规则。

当 Fluid 传入 `/minio` 这样的 Dataset 内路径时，脚本会读取 Curvine mount 元数据，把它解析成真正需要加载的 Curvine source，再执行 `cv load --watch`。这样 DataLoad 和 `mountUFS` 的语义是一致的。

### 2. 创建 DataLoad 资源

示例：

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: DataLoad
metadata:
  name: curvine-dataload
  namespace: default
spec:
  dataset:
    name: curvine-demo
    namespace: default
  target:
    - path: /minio
```

应用：

```bash
kubectl apply -f dataload.yaml
```

`spec.dataset` 指定 Dataset。`spec.target[].path` 指定要预热的 Dataset 内路径。Fluid 会把这些路径通过 `FLUID_DATALOAD_DATA_PATH` 传给 Job。

### 3. 检查 DataLoad Job

```bash
kubectl get dataload curvine-dataload
kubectl get job -l role=dataload-job,targetDataset=curvine-demo
kubectl get pods -l role=dataload-pod,targetDataset=curvine-demo
kubectl logs -l role=dataload-pod,targetDataset=curvine-demo
```

只有每个目标路径的 `cv load --watch` 都成功退出，DataLoad 才算成功。如果 `cv load --watch` 返回错误，Job 应该失败，这样 Fluid 才能把问题暴露出来。

### 关于 `/etc/fluid/config/runtime.json`

Fluid chart `helm-chart-fluid-1.1.0-alpha.10` 会把 runtime config 文件挂载进 CacheRuntime DataLoad Pod，并设置 `FLUID_RUNTIME_CONFIG_PATH`。使用这个版本时，Curvine DataLoad 可以像 master、worker、client Pod 一样生成配置。

更旧的 Fluid 版本或自定义 DataLoad 模板，可能只设置了 `FLUID_RUNTIME_CONFIG_PATH`，但没有把 runtime config 文件挂载进 DataLoad Pod。

如果你的 DataLoad 命令需要读取 runtime JSON，请同时确认两件事：

1. DataLoad Pod 中设置了 `FLUID_RUNTIME_CONFIG_PATH`。
2. DataLoad Pod 内这个文件真实存在。

如果文件不存在，Curvine 示例会按下面顺序尝试 fallback：

1. `CURVINE_DATALOAD_DATASET`、`FLUID_DATASET_NAME` 或 `CURVINE_DATALOAD_MASTER_HOST`。
2. Fluid Pod label，例如 `targetDataset` 或 `fluid.io/dataset-id`。
3. 从 DataLoad 名称推断 Dataset，例如 `<dataset>-load`。

如果这些信息都拿不到，请显式设置 Dataset 或 master host，不要写死一个错误的 master endpoint。

## ThinRuntime 快速开始

当 Curvine 已经在 Fluid 外部运行，只需要 Fluid 负责挂载时，使用 ThinRuntime。

### 1. 创建 ThinRuntimeProfile

使用：

```text
curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

关键字段如下：

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: ThinRuntimeProfile
metadata:
  name: curvine-profile
spec:
  fileSystemType: fuse
  fuse:
    image: ghcr.io/curvineio/curvine
    imageTag: latest
```

### 2. 创建 Dataset

同一个示例文件里也包含 Dataset。最重要的 option 是 `master-endpoints`：

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: Dataset
metadata:
  name: curvine-dataset
spec:
  mounts:
    - mountPoint: curvine:///data
      options:
        master-endpoints: "127.0.0.1:8995"
```

支持的 Dataset options 包括：

| 选项 | 必填 | 含义 |
| --- | --- | --- |
| `master-endpoints` | 是 | Curvine master RPC endpoint，格式 `host:port`。 |
| `master-web-port` | 否 | 覆盖 master web 端口。 |
| `io-threads` | 否 | FUSE I/O 线程数。 |
| `worker-threads` | 否 | FUSE worker 线程数。 |
| `mnt-number` | 否 | FUSE mount 数量。 |

### 3. 创建 ThinRuntime

同一个文件还包含：

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: ThinRuntime
metadata:
  name: curvine-dataset
spec:
  profileName: curvine-profile
```

应用示例：

```bash
kubectl apply -f curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

### 4. 验证 ThinRuntime

```bash
kubectl get thinruntime curvine-dataset
kubectl get dataset curvine-dataset
kubectl get pods -A | grep curvine
```

在 ThinRuntime 模式下，`config-parse.py` 会读取 Fluid runtime JSON，并生成：

```text
$CURVINE_HOME/conf/curvine-cluster.toml
$CURVINE_HOME/mount-curvine.sh
```

生成的挂载脚本会使用 Fluid 提供的 target path 启动 `curvine-fuse`。

## 排障

### 镜像进入了错误模式

查看 Pod 环境变量和启动命令：

```bash
kubectl describe pod <pod>
```

重点检查：

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH`
- 容器参数是否为 `master`、`worker`、`client` 或 `fluid-thin-runtime`

### CacheRuntime Pod 无法生成 Curvine 配置

检查 runtime config 是否存在：

```bash
kubectl exec <pod> -- ls -l "$FLUID_RUNTIME_CONFIG_PATH"
kubectl logs <pod>
```

`generate_config.py` 需要合法的 Fluid runtime JSON。如果文件为空、缺失或 JSON 格式不对，Curvine TOML 就无法正确生成。

### MountUFS 失败

查看 master Pod 日志和 Dataset mount options：

```bash
kubectl logs <curvine-master-pod>
kubectl describe dataset <dataset-name>
```

如果底层是对象存储，重点检查 endpoint、access key、secret key、region、path-style 等参数。Fluid 引用的 Secret 必须先挂载到 Pod 中，`mountUfs.sh` 才能读到。

### FUSE 没挂上

查看 client 或 ThinRuntime Pod：

```bash
kubectl logs <curvine-client-pod>
```

确认：

- Pod 内存在 `/dev/fuse`。
- 集群要求特权模式时，容器已设置 privileged。
- Fluid target path 和 Dataset mount path 正确。

### DataLoad Job 启动后失败

查看 DataLoad Pod 日志：

```bash
kubectl logs -l role=dataload-pod,targetDataset=<dataset-name>
```

常见原因：

- `CacheRuntimeClass` 中没有配置 `dataOperationSpecs`。
- `FLUID_DATALOAD_DATA_PATH` 为空，或指向 Curvine 没有挂载的路径。
- DataLoad 命令使用了错误的 Curvine 配置或 master 地址。
- 更旧或自定义 Fluid 模板设置了 `FLUID_RUNTIME_CONFIG_PATH`，但没有挂载 runtime config 文件。

修复 `dataOperationSpecs` 中的命令后，重新应用 `CacheRuntimeClass`，再创建新的 `DataLoad` 资源。
