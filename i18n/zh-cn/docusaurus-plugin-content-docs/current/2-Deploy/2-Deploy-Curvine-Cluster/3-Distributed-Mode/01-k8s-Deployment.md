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

### 集群与镜像

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `cluster.id` | `curvine` | 集群 ID |
| `image.repository` | `ghcr.io/curvineio/curvine` | 镜像仓库 |
| `image.tag` | `""` | 空值使用 `v{Chart.AppVersion}` |

### 副本与资源

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `master.replicas` | `1` | 须为奇数 |
| `worker.replicas` | `1` | — |
| `master.resources` | 见 values.yaml | — |
| `worker.resources` | 见 values.yaml | — |

### 存储

| 方式 | 配置 |
|------|------|
| PVC（默认） | 使用集群 default StorageClass |
| 指定 StorageClass | `master.storage.*.storageClass`、`worker.storage.dataDirs[].storageClass` |
| hostPath | `storageClass: ""` 并设置 `hostPath`，见 `values-baremetal.yaml` |

### OpenKruise

默认 `openKruise.enabled=false`，master/worker 使用标准 `apps/v1` StatefulSet，不安装 OpenKruise。

设为 `true` 时安装 kruise 子 chart，并将 master/worker 切换为 Advanced StatefulSet（`apps.kruise.io/v1beta1`）：

| 能力 | 场景 |
|------|------|
| 原地镜像更新（InPlaceUpdate） | 升级镜像时减少 Pod 重建 |
| PersistentPodState | master Pod 重建后尽量调度回原节点 |

| 参数 | 默认值 |
|------|--------|
| `openKruise.enabled` | `false` |

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
