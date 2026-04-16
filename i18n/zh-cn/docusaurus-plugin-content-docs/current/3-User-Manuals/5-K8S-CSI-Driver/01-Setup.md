# CSI 驱动部署

当前主分支里的 Curvine CSI 以原生 Kubernetes 清单方式交付：部署清单位于 `curvine-csi/deploy`，工作负载示例位于 `curvine-csi/examples`。当前推荐安装流程以 `kubectl apply` 为准。

## 会安装哪些资源

| 清单 | 结果 | 说明 |
| --- | --- | --- |
| `deploy/namespace.yaml` | 命名空间 `curvine-system` | 官方 CSI 资源默认全部放在这里 |
| `deploy/serviceaccount.yaml` | `curvine-csi-controller-sa`、`curvine-csi-node-sa` | Controller 与 Node 分开使用服务账号 |
| `deploy/clusterrole.yaml` + `deploy/clusterrolebinding.yaml` | 基础 CSI RBAC | Controller 读取 PV/PVC/StorageClass/VolumeAttachment；Node 通过 Secret 持久化挂载状态 |
| `deploy/csidriver.yaml` | 名为 `curvine` 的 `CSIDriver` | `attachRequired: false`、`podInfoOnMount: false` |
| `deploy/deployment.yaml` | `Deployment/curvine-csi-controller` | 运行 controller 插件以及 `csi-provisioner`、`csi-attacher`、`liveness-probe` |
| `deploy/daemonset.yaml` | `DaemonSet/curvine-csi-node` | 在每个节点运行 node 插件以及 `node-driver-registrar`、`liveness-probe` |
| `deploy/daemonset.yaml` | 额外 standalone RBAC | 允许 node 插件创建和删除独立 FUSE Pod 及相关 ConfigMap |

## 前置条件

- 已有可被 Kubernetes 节点访问的 Curvine 集群，`master-addrs` 可连通。
- Kubernetes 集群允许特权容器，并支持双向 mount propagation。
- 当前操作者具备创建 namespace、RBAC、`CSIDriver`、`Deployment`、`DaemonSet` 的权限。
- 集群可以拉取 `ghcr.io/curvineio/curvine-csi:latest` 以及清单里引用的 sidecar 镜像。

## 按原生清单安装

```bash
cd /path/to/curvine/curvine-csi

kubectl apply -f deploy/namespace.yaml
kubectl apply -f deploy/serviceaccount.yaml
kubectl apply -f deploy/clusterrole.yaml
kubectl apply -f deploy/clusterrolebinding.yaml
kubectl apply -f deploy/csidriver.yaml
kubectl apply -f deploy/deployment.yaml
kubectl apply -f deploy/daemonset.yaml
```

如果你把这些清单 vendoring 到自己的仓库，顺序也建议保持一致：先 namespace 和 RBAC，再 `CSIDriver`、controller、node plugin。

## 运行时结构

### Controller

`deploy/deployment.yaml` 会在 `curvine-system` 中创建 `curvine-csi-controller`，包含这些容器：

- `csi-plugin`：`/opt/curvine/csi --endpoint=$(CSI_ENDPOINT) --nodeid=$(NODE_NAME)`
- `csi-provisioner`
- `csi-attacher`
- `liveness-probe`

Controller 清单里的关键默认值：

- `CSI_ENDPOINT=unix:///csi/csi.sock`
- `MOUNT_MODE=embedded`
- `serviceAccountName=curvine-csi-controller-sa`

Controller 负责 `CreateVolume` 和 `DeleteVolume`，包括生成动态卷的 `volumeHandle`，以及为动态 PVC 创建 Curvine 目录。

### Node Plugin

`deploy/daemonset.yaml` 会在 `curvine-system` 中创建 `curvine-csi-node`，包含这些容器：

- `csi-plugin`
- `node-driver-registrar`
- `liveness-probe`

Node 清单里的关键默认值：

- `CSI_ENDPOINT=unix:///csi/csi.sock`
- `NODE_NAME` 来自 `spec.nodeName`
- `KUBERNETES_NAMESPACE` 来自 Pod 所在命名空间
- `MOUNT_MODE=standalone`
- `STANDALONE_IMAGE=ghcr.io/curvineio/curvine-csi:latest`
- `STANDALONE_SERVICE_ACCOUNT=curvine-csi-node-sa`

Node 插件以特权模式运行，并挂载：

- `/var/lib/kubelet/plugins/curvine`
- `/var/lib/kubelet`
- `/var/lib/kubelet/plugins_registry`

其中 `/var/lib/kubelet` 使用 `Bidirectional` mount propagation，这样 CSI 创建的 FUSE 挂载点才能被 kubelet 看到，并继续 bind mount 到业务 Pod 中。

## 挂载模式

Curvine CSI 的节点侧支持两种挂载模式：

- `standalone`：默认且推荐。Node 插件会拉起独立的 standalone Pod 来运行 `curvine-fuse`。
- `embedded`：FUSE 进程直接运行在 CSI node Pod 内。

切换模式时只需要关注 node 插件。官方 controller 清单已经固定为 `MOUNT_MODE=embedded`，官方 node 清单默认使用 `standalone`。

如果你需要调整 node 行为，请在部署前修改 `deploy/daemonset.yaml`。最关键的环境变量如下：

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `MOUNT_MODE` | `standalone` | 可选 `standalone` 或 `embedded` |
| `STANDALONE_IMAGE` | `ghcr.io/curvineio/curvine-csi:latest` | standalone FUSE Pod 使用的镜像 |
| `STANDALONE_SERVICE_ACCOUNT` | `curvine-csi-node-sa` | standalone Pod 使用的服务账号 |

## 部署后校验

```bash
kubectl get csidriver curvine
kubectl get pods -n curvine-system
kubectl get deployment -n curvine-system curvine-csi-controller
kubectl get daemonset -n curvine-system curvine-csi-node
```

排障时可以直接看日志：

```bash
kubectl logs -n curvine-system deploy/curvine-csi-controller -c csi-plugin --tail=100
kubectl logs -n curvine-system daemonset/curvine-csi-node -c csi-plugin --tail=100
kubectl logs -n curvine-system daemonset/curvine-csi-node -c node-driver-registrar --tail=100
```

正常情况下应满足：

- `CSIDriver/curvine` 已注册。
- `curvine-csi-controller` 处于 `Available`。
- `curvine-csi-node` 在所有可调度节点上都是 `Ready`。
- node 插件日志中没有持续重复的挂载失败或权限错误。

## 下一步

- 共享 PVC 给 `Deployment` 使用，参考 [Deployment](02-Deployment.md)。
- 为 `StatefulSet` 中的每个副本分配独立 PVC，参考 [StatefulSet](03-StatefulSet.md)。
- 需要理解 `volumeHandle`、FUSE 复用和挂载路径生成规则，参考 [Framework](04-Framework.md)。
