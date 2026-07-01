---
sidebar_position: 0
---

# Kubernetes 部署

Chart：`curvine/curvine`，版本 `0.3.2-alpha`。

## 前置条件

- Kubernetes 1.20+
- Helm 3.x
- 集群具备默认 `StorageClass`（供 master/worker PVC 使用）

## 架构说明

Helm release `curvine` 部署于 namespace `curvine`：

| 资源 | 说明 |
|------|------|
| StatefulSet `curvine-master` | 元数据、Raft journal |
| StatefulSet `curvine-worker` | 数据节点 |
| Service `curvine-master` | Headless，RPC 8995 |
| Service `curvine-worker` | Headless，RPC 8997 |

默认 `openKruise.enabled=false`，StatefulSet 使用 `apps/v1`。

## 部署

### 添加仓库

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update
```

### 安装

```bash
helm upgrade --install curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine \
  --create-namespace \
  --wait --timeout 10m
```

### 验证

```bash
kubectl get pods,svc,pvc -n curvine
```

Web UI：

```bash
kubectl port-forward -n curvine svc/curvine-master 9000:9000
```

### Master 地址

单副本：

```text
curvine-master.curvine.svc.cluster.local:8995
```

三副本：

```text
curvine-master-0.curvine-master.curvine.svc.cluster.local:8995,curvine-master-1.curvine-master.curvine.svc.cluster.local:8995,curvine-master-2.curvine-master.curvine.svc.cluster.local:8995
```

## 升级

```bash
helm upgrade curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine \
  --reuse-values \
  --set worker.replicas=3
```

`master.replicas` 安装后不可修改。

## 卸载

```bash
helm uninstall curvine -n curvine
kubectl delete pvc -n curvine -l app.kubernetes.io/instance=curvine
kubectl delete namespace curvine
```

## 故障排查

| 现象 | 命令 | 原因 |
|------|------|------|
| Pod Pending | `kubectl describe pod -n curvine <name>` | 资源不足；无 StorageClass |
| master 启动慢 | `kubectl logs curvine-master-0 -n curvine` | Raft 回放中 |
| PVC Pending | `kubectl get sc` | 无可用 StorageClass |

## 配置参考

Chart 版本 `0.3.2-alpha`。下表默认值与 `helm show values curvine/curvine --version 0.3.2-alpha` 一致。

### 全局

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `global.clusterDomain` | `cluster.local` | Kubernetes 集群域名 |

### 集群

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `cluster.id` | `curvine` | 集群 ID |
| `cluster.formatMaster` | `false` | 启动时格式化 master 数据 |
| `cluster.formatWorker` | `false` | 启动时格式化 worker 数据 |
| `cluster.formatJournal` | `false` | 启动时格式化 journal 数据 |

### 镜像

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `image.repository` | `ghcr.io/curvineio/curvine` | 镜像仓库 |
| `image.tag` | `""` | 空值使用 `v{Chart.AppVersion}` |
| `image.pullPolicy` | `IfNotPresent` | 镜像拉取策略 |
| `image.pullSecrets` | `[]` | 镜像拉取密钥 |

### OpenKruise

默认 `openKruise.enabled=false`，master/worker 使用标准 `apps/v1` StatefulSet。

设 `openKruise.enabled=true` 时安装 kruise 子 chart，并将 master/worker 切换为 Advanced StatefulSet（`apps.kruise.io/v1beta1`）。

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `openKruise.enabled` | `false` | 启用 Advanced StatefulSet |
| `openKruise.podUpdatePolicy` | `InPlaceOnly` | `InPlaceOnly` \| `InPlaceIfPossible` \| `ReCreate` |
| `openKruise.persistentPodState.autoGenerate` | `true` | 自动生成 PersistentPodState |
| `openKruise.persistentPodState.preferredPersistentTopology` | `kubernetes.io/hostname` | 首选拓扑键 |
| `openKruise.persistentPodState.requiredPersistentTopology` | `""` | 强制拓扑键（可选） |
| `kruise.installation.namespace` | `kruise-system` | Kruise 子 chart 命名空间（启用时） |
| `kruise.installation.createNamespace` | `true` | 创建 Kruise 命名空间 |

### Master

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `master.replicas` | `1` | 须为奇数（1、3、5…） |
| `master.rpcPort` | `8995` | RPC 端口 |
| `master.journalPort` | `8996` | Journal/Raft 端口 |
| `master.webPort` | `9000` | Web UI 端口 |
| `master.web1Port` | `9001` | 附加 Web 端口 |
| `master.startupProbe.enabled` | `true` | 启动探针 |
| `master.startupProbe.failureThreshold` | `90` | 允许较长 Raft 回放 |
| `master.storage.meta.enabled` | `true` | 启用元数据 PVC |
| `master.storage.meta.storageClass` | `""` | 空值使用 default StorageClass |
| `master.storage.meta.size` | `5Gi` | 元数据 PVC 大小 |
| `master.storage.meta.hostPath` | `""` | 无 StorageClass 时使用 hostPath |
| `master.storage.meta.mountPath` | `/opt/curvine/data/meta` | 挂载路径 |
| `master.storage.journal.enabled` | `true` | 启用 journal PVC |
| `master.storage.journal.storageClass` | `""` | 空值使用 default StorageClass |
| `master.storage.journal.size` | `10Gi` | journal PVC 大小 |
| `master.storage.journal.hostPath` | `""` | 无 StorageClass 时使用 hostPath |
| `master.storage.journal.mountPath` | `/opt/curvine/data/journal` | 挂载路径 |
| `master.resources.requests.cpu` | `500m` | CPU request |
| `master.resources.requests.memory` | `1Gi` | 内存 request |
| `master.resources.limits.cpu` | `1000m` | CPU limit |
| `master.resources.limits.memory` | `2Gi` | 内存 limit |
| `master.antiAffinity.enabled` | `false` | Pod 反亲和 |
| `master.antiAffinity.type` | `required` | `required` 或 `preferred` |
| `master.persistentTopology.enabled` | `true` | PersistentPodState 拓扑 |
| `master.persistentTopology.key` | `kubernetes.io/hostname` | 拓扑键 |
| `master.nodeSelector` | `{}` | 节点选择器 |
| `master.tolerations` | `[]` | 容忍度 |
| `master.affinity` | `{}` | 亲和规则 |

### Worker

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `worker.replicas` | `1` | Worker 副本数 |
| `worker.rpcPort` | `8997` | RPC 端口 |
| `worker.webPort` | `9001` | Web UI 端口 |
| `worker.s3Gateway.enabled` | `false` | 启用 S3 网关 |
| `worker.s3Gateway.listen` | `0.0.0.0:9900` | S3 网关监听地址 |
| `worker.s3Gateway.enableDistributedAuth` | `true` | S3 分布式认证 |
| `worker.s3Gateway.service.type` | `ClusterIP` | S3 Service 类型 |
| `worker.hostNetwork` | `false` | 使用 host 网络 |
| `worker.dnsPolicy` | `ClusterFirst` | DNS 策略 |
| `worker.usePodIPAsHostname` | `false` | 使用 Pod IP 作为 worker 主机名 |
| `worker.privileged` | `true` | 特权模式（FUSE） |
| `worker.storage.dataDirs[0].name` | `data1` | 数据目录名称 |
| `worker.storage.dataDirs[0].type` | `SSD` | 存储类型 |
| `worker.storage.dataDirs[0].enabled` | `true` | 启用数据目录 |
| `worker.storage.dataDirs[0].size` | `20Gi` | PVC 大小 |
| `worker.storage.dataDirs[0].storageClass` | `""` | 空值使用 default StorageClass |
| `worker.storage.dataDirs[0].hostPath` | `""` | 无 StorageClass 时使用 hostPath |
| `worker.storage.dataDirs[0].mountPath` | `/data/data1` | 挂载路径 |
| `worker.resources.requests.cpu` | `500m` | CPU request |
| `worker.resources.requests.memory` | `1Gi` | 内存 request |
| `worker.resources.limits.cpu` | `1000m` | CPU limit |
| `worker.resources.limits.memory` | `2Gi` | 内存 limit |
| `worker.antiAffinity.enabled` | `true` | Pod 反亲和 |
| `worker.antiAffinity.type` | `preferred` | `required` 或 `preferred` |
| `worker.nodeSelector` | `{}` | 节点选择器 |
| `worker.tolerations` | `[]` | 容忍度 |
| `worker.affinity` | `{}` | 亲和规则 |

### Service

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `service.master.type` | `ClusterIP` | Headless（`ClusterIP: None`） |
| `service.worker.type` | `ClusterIP` | Headless（`ClusterIP: None`） |
| `service.masterExternal.enabled` | `false` | 外部访问 master |
| `service.masterExternal.type` | `ClusterIP` | 外部 Service 类型 |
| `service.masterExternal.loadBalancerIP` | `""` | LoadBalancer IP |

### ServiceAccount 与 RBAC

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `serviceAccount.create` | `true` | 创建 ServiceAccount |
| `serviceAccount.name` | `""` | 空值自动生成 |
| `rbac.create` | `true` | 创建 RBAC 资源 |

### Curvine 配置（`config.*`）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `config.master.metaDir` | `/opt/curvine/data/meta` | Master 元数据目录 |
| `config.journal.enable` | `true` | 启用 journal |
| `config.journal.journalDir` | `/opt/curvine/data/journal` | Journal 目录 |
| `config.journal.snapshotInterval` | `6h` | 快照间隔 |
| `config.journal.snapshotEntries` | `1000000` | 快照条目阈值 |
| `config.client.blockSizeStr` | `64MB` | 客户端块大小 |
| `config.log.level` | `INFO` | 日志级别 |
| `config.log.logDir` | `/opt/curvine/logs` | 日志目录 |
| `config.log.console` | `true` | 日志输出到 stdout |

### 配置覆盖（`configOverrides.*`）

按 TOML 分段覆盖，无需替换完整配置：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `configOverrides.master` | `{}` | Master 段覆盖 |
| `configOverrides.journal` | `{}` | Journal 段覆盖 |
| `configOverrides.worker` | `{}` | Worker 段覆盖 |
| `configOverrides.client` | `{}` | Client 段覆盖 |
| `configOverrides.log` | `{}` | Log 段覆盖 |

### 存储方式

| 方式 | 配置 |
|------|------|
| PVC（默认） | `storageClass: ""` 使用集群 default StorageClass |
| 指定 StorageClass | `master.storage.*.storageClass`、`worker.storage.dataDirs[].storageClass` |
| hostPath | `storageClass: ""` 并设置 `hostPath` |

### 示例

降低资源 request：

```bash
helm upgrade curvine curvine/curvine -n curvine --reuse-values \
  --set master.resources.requests.cpu=200m \
  --set master.resources.requests.memory=512Mi \
  --set worker.resources.requests.cpu=200m \
  --set worker.resources.requests.memory=512Mi
```

完整参数：

```bash
helm show values curvine/curvine --version 0.3.2-alpha
```
