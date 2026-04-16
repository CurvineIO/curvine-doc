# CSI 架构与挂载生命周期

本页描述的是当前主分支里 `curvine-csi` 的真实实现行为，而不是早期 Helm 化设计里的说法。

## 核心模型

Curvine CSI 主要由三部分组成：

| 组件 | 源码位置 | 职责 |
| --- | --- | --- |
| Controller Service | `pkg/csi/controller.go` | 校验建卷参数、创建和删除 Curvine 目录、返回最终 `VolumeContext` |
| Node Service | `pkg/csi/node.go` | 启动或复用 FUSE、计算宿主机挂载路径、把正确的子目录 bind mount 到 Pod |
| FUSE 进程管理器 | `pkg/csi/fuse_manager.go` | 用生成出的挂载路径和透传参数启动 `/opt/curvine/curvine-fuse` |

## 挂载模式

`pkg/csi/driver.go` 会读取 `MOUNT_MODE`：

- `standalone`：node 侧默认值，也是推荐模式
- `embedded`：FUSE 直接运行在 CSI Pod 内

从运维效果看：

- `standalone` 会把 FUSE 生命周期和 CSI Pod 重启解耦，FUSE 运行在独立 standalone Pod 中。
- `embedded` 更直接，但 CSI node Pod 升级或重启时，FUSE 也会一起中断。

官方清单就是这样配置的：

- `deploy/daemonset.yaml`：`MOUNT_MODE=standalone`
- `deploy/deployment.yaml`：`MOUNT_MODE=embedded`

## 动态建卷流程

### 1. StorageClass 参数校验

`pkg/csi/validator.go` 中的 `ValidateStorageClassParams` 会约束：

- `master-addrs` 必填，格式必须是 `host:port,host:port,...`
- `fs-path` 缺失时默认回落为 `/`
- `path-type` 默认值为 `Directory`
- 用户手工传入的 `mnt-path` 仍兼容，但当前主线已经改为自动生成挂载路径，手工 `mnt-path` 只算兼容旧行为

校验器还会接受一组可选的 FUSE 调优参数，并在 node 侧启动 FUSE 时透传过去。

### 2. Controller 生成的字段

对动态卷来说，`pkg/csi/controller.go` 中的 `CreateVolume` 会生成：

```text
cluster-id   = sha256(master-addrs)[:8]
volumeHandle = {cluster-id}@{fs-path}@{pv-name}
curvine-path = {fs-path}/{pv-name}
```

随后这些值会被放入 `VolumeContext`，供 node 侧继续使用。

`path-type` 会影响目录创建逻辑：

- `Directory`：父目录和最终卷目录都必须已经存在
- `DirectoryOrCreate`：缺失目录由 Controller 自动创建

## Node 侧如何生成挂载点

### Cluster ID

`pkg/csi/volume_handle.go` 中定义：

```text
cluster-id = SHA256(master-addrs) 的前 8 个十六进制字符
```

这个值会出现在动态卷的 `volumeHandle` 里。

### Mount Key

node 侧还会生成另一个独立的 `mount-key`，输入是：

```text
master-addrs + fs-path
```

接着用它拼出宿主机上的 FUSE 挂载目录：

```text
/var/lib/kubelet/plugins/kubernetes.io/csi/curvine/{mount-key}/fuse-mount
```

这也是 FUSE 复用的关键：共享 FUSE 进程的分组键是 `master-addrs + fs-path`，不是 PVC 名称。

## FUSE 复用规则

### 动态卷

对动态卷来说，只要这些条件相同：

- `master-addrs`
- `fs-path`

同一 Kubernetes 节点上的多个卷就会复用同一个 FUSE 挂载。每个 PVC 仍然有自己独立的 `curvine-path` 子目录。

### 静态 PV

静态 PV 示例使用的是：

- 任意唯一的 `volumeHandle`
- 必填 `master-addrs`
- 必填 `curvine-path`

静态 PV 不需要动态卷那种结构化 `volumeHandle`。如果没有显式提供 `fs-path`，当前 `node.go` 会先把它补成 `/`，再去生成 `mount-key`。这意味着静态 PV 的复用实际会退化为按 `master-addrs + /` 分组，除非你自己额外补上 `fs-path`。

这个判断来自当前实现推断：`node.go` 在生成 `mount-key` 之前，确实会把缺失的 `fs-path` 替换为 `/`。

## NodePublishVolume 如何定位 Pod 子目录

`pkg/csi/node.go` 中的 `NodePublishVolume` 会根据 FUSE 实际挂载的根路径来计算宿主机子路径：

- 如果 `fs-path == /`，宿主机子路径就是 `mnt-path + curvine-path`
- 如果 `fs-path != /`，宿主机子路径就是 `mnt-path + relative(curvine-path, fs-path)`

源码注释中的例子：

```text
fs-path="/", curvine-path="/pvc-abc"
=> host subpath = <mnt-path>/pvc-abc

fs-path="/test-data", curvine-path="/test-data/pvc-abc"
=> host subpath = <mnt-path>/pvc-abc
```

这也是多个 PVC 能共享一个 FUSE 进程、同时又落在不同业务目录下的原因。

## FUSE 启动命令是怎么拼的

`pkg/csi/fuse_manager.go` 启动 FUSE 的基本形式是：

```text
/opt/curvine/curvine-fuse --master-addrs ... --fs-path ... --mnt-path ...
```

固定会注入：

- `--master-addrs`
- `--fs-path`
- `--mnt-path`

然后再拼上 CSI 侧传入的 FUSE 调优参数。

当前主线 `curvine-fuse` CLI 明确暴露的常用参数包括：

- `--io-threads`
- `--worker-threads`
- `--mnt-per-task`
- `--clone-fd`
- `--fuse-channel-size`
- `--stream-channel-size`
- `--direct-io`
- `--cache-readdir`
- `--entry-timeout`
- `--attr-timeout`
- `--negative-timeout`
- `--max-background`
- `--congestion-threshold`
- `--node-cache-size`
- `--node-cache-timeout`
- `--mnt-number`

同时，校验器还兼容接受 `auto-cache`、`kernel-cache`、`master-hostname`、`master-rpc-port`、`master-web-port` 这类更旧的键。但这些键并没有在当前 `curvine-fuse` CLI 页面上单独作为稳定接口文档化，因此更适合视为兼容行为，而不是建议新配置依赖的公开契约。

## 生命周期总结

1. Controller 校验 StorageClass 参数，并创建 `curvine-path`。
2. Controller 返回包含 `master-addrs`、`fs-path`、`curvine-path` 的 `VolumeContext`。
3. Node 插件计算 `cluster-id`、`mount-key` 和 `mnt-path`。
4. 如果同一组 `master-addrs + fs-path` 对应的 FUSE 已存在，则直接复用。
5. 否则 node 侧启动新的 `curvine-fuse` 进程。
6. Node 再把正确的子目录 bind mount 到 Pod。
7. 当引用计数归零时，`NodeUnstageVolume` 会关闭不再使用的 FUSE 挂载。

## 静态卷与动态卷对比

| 模式 | 必填属性 | Controller 行为 | Node 行为 |
| --- | --- | --- | --- |
| 通过 StorageClass 的动态 PVC | `master-addrs`，可选 `fs-path`、`path-type` | 自动生成 `volumeHandle` 和 `curvine-path` | 挂载 `fs-path`，再把生成出的子目录 bind mount 给 Pod |
| 静态 PV | `master-addrs`、`curvine-path` | 不会替你生成目录命名规则 | 如果未提供 `fs-path`，默认挂载根目录，再 bind mount `curvine-path` |

## 运维建议

- 生产环境优先使用 `standalone`，因为 CSI 重启不会直接中断业务侧 FUSE。
- 即使代码允许 `fs-path` 默认回落到 `/`，StorageClass 里也建议显式写出来，目录布局和复用规则更容易预测。
- 新部署不要再依赖手工指定 `mnt-path`；当前主线实现已经默认自动生成它。
