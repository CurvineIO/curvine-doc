# K8S CSI 驱动

前提：已通过 Helm 部署 curvine cluster（namespace `curvine`）。

Chart：`curvine/curvine-csi`，版本 `0.3.2-alpha`。Release namespace：`curvine-system`。

## 架构说明

| 组件 | 类型 | 说明 |
|-----------|------|-------------|
| CSI Controller | Deployment | 卷创建、删除 |
| CSI Node | DaemonSet | 节点挂载 |

默认 `node.mountMode=embedded`。`standalone` 模式下 FUSE 运行于独立 Pod。

## 部署

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update

helm upgrade --install curvine-csi curvine/curvine-csi \
  --version 0.3.2-alpha \
  -n curvine-system \
  --create-namespace \
  --wait --timeout 8m

kubectl get csidriver curvine
kubectl get pods -n curvine-system
```

`standalone` 挂载模式：

```bash
helm upgrade --install curvine-csi curvine/curvine-csi \
  --version 0.3.2-alpha \
  -n curvine-system \
  --create-namespace \
  --set node.mountMode=standalone \
  --set node.standalone.resources.requests.cpu=500m \
  --set node.standalone.resources.requests.memory=512Mi \
  --set node.standalone.resources.limits.cpu=2 \
  --set node.standalone.resources.limits.memory=2Gi \
  --wait --timeout 8m
```

## 示例一：动态 PV

以下 `master-addrs` 按单副本 curvine cluster 编写。三副本时改为：

```text
curvine-master-0.curvine-master.curvine.svc.cluster.local:8995,curvine-master-1.curvine-master.curvine.svc.cluster.local:8995,curvine-master-2.curvine-master.curvine.svc.cluster.local:8995
```

### 1. StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: curvine-sc
provisioner: curvine
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
parameters:
  master-addrs: "curvine-master.curvine.svc.cluster.local:8995"
  fs-path: "/k8s-volumes"
  path-type: "DirectoryOrCreate"
```

```bash
kubectl apply -f storageclass.yaml
```

### 2. PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: curvine
spec:
  storageClassName: curvine-sc
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f pvc.yaml
kubectl wait --for=condition=Bound pvc/app-data -n curvine --timeout=120s
```

### 3. Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: curvine
spec:
  containers:
    - name: app
      image: busybox:1.36
      command: ["sh", "-c", "echo test > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
```

```bash
kubectl apply -f pod.yaml
kubectl logs app-pod -n curvine
```

## 示例二：静态 PV

### 1. StorageClass

同示例一。三副本时 `master-addrs` 同上。

### 2. PV 与 PVC

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: curvine-existing
spec:
  storageClassName: curvine-sc
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: curvine
    volumeHandle: "existing-data-001"
    volumeAttributes:
      master-addrs: "curvine-master.curvine.svc.cluster.local:8995"
      curvine-path: "/existing-data"
      path-type: "Directory"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: curvine
spec:
  storageClassName: curvine-sc
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  volumeName: curvine-existing
```

```bash
kubectl apply -f pv-pvc.yaml
kubectl wait --for=condition=Bound pvc/app-data -n curvine --timeout=120s
```

### 3. Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: curvine
spec:
  containers:
    - name: app
      image: busybox:1.36
      command: ["sh", "-c", "echo test > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
```

```bash
kubectl apply -f pod.yaml
kubectl logs app-pod -n curvine
```

## 配置参考

Chart 版本 `0.3.2-alpha`。下表默认值与 `helm show values curvine/curvine-csi --version 0.3.2-alpha` 一致。

### 镜像

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `image.repository` | `ghcr.io/curvineio/curvine-csi` | CSI 镜像仓库 |
| `image.tag` | `""` | 空值使用 `v{Chart.AppVersion}` |
| `image.pullPolicy` | `Always` | 镜像拉取策略 |

### CSI 驱动

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `csiDriver.name` | `curvine` | CSI 驱动名称 |
| `csiDriver.attachRequired` | `false` | 不需要 attach 操作 |
| `csiDriver.podInfoOnMount` | `false` | 挂载时不需要 Pod 信息 |

### Controller

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `controller.name` | `curvine-csi-controller` | Deployment 名称 |
| `controller.replicas` | `1` | Controller 副本数 |
| `controller.priorityClassName` | `system-cluster-critical` | 优先级类 |
| `controller.container.name` | `csi-plugin` | 主容器名称 |
| `controller.container.env.CSI_ENDPOINT` | `unix:///csi/csi.sock` | CSI 套接字 |
| `controller.container.ports.healthz` | `9909` | 健康检查端口 |
| `controller.container.securityContext.privileged` | `true` | 特权模式 |
| `controller.sidecars.provisioner.image` | `quay.io/k8scsi/csi-provisioner:v1.6.0` | Provisioner sidecar |
| `controller.sidecars.attacher.image` | `registry.k8s.io/sig-storage/csi-attacher:v4.5.0` | Attacher sidecar |
| `controller.sidecars.livenessProbe.image` | `registry.k8s.io/sig-storage/livenessprobe:v2.11.0` | 存活探针 sidecar |

若 provisioner 或 registrar sidecar 出现 `ImagePullBackOff`，可改用 `registry.k8s.io/sig-storage` 镜像：

```bash
--set controller.sidecars.provisioner.image=registry.k8s.io/sig-storage/csi-provisioner:v5.0.1 \
--set node.sidecars.nodeDriverRegistrar.image=registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.13.0
```

### Node

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `node.name` | `curvine-csi-node` | DaemonSet 名称 |
| `node.priorityClassName` | `system-node-critical` | 优先级类 |
| `node.dnsPolicy` | `ClusterFirstWithHostNet` | DNS 策略 |
| `node.fuseDebugEnabled` | `false` | FUSE 调试日志 |
| `node.mountMode` | `embedded` | `embedded` 或 `standalone` |
| `node.container.name` | `csi-plugin` | Main container name |
| `node.container.env.CSI_ENDPOINT` | `unix:///csi/csi.sock` | CSI socket |
| `node.container.ports.healthz` | `9909` | 健康检查端口 |
| `node.container.ports.metrics` | `9002` | 指标端口 |
| `node.container.securityContext.privileged` | `true` | 特权模式 |
| `node.container.resources.requests.cpu` | `500m` | CPU request（`embedded` 模式） |
| `node.container.resources.requests.memory` | `512Mi` | 内存 request（`embedded` 模式） |
| `node.container.resources.limits.cpu` | `2` | CPU limit（`embedded` 模式） |
| `node.container.resources.limits.memory` | `2Gi` | 内存 limit（`embedded` 模式） |
| `node.sidecars.nodeDriverRegistrar.image` | `quay.io/k8scsi/csi-node-driver-registrar:v2.1.0` | Registrar sidecar |
| `node.sidecars.livenessProbe.image` | `registry.k8s.io/sig-storage/livenessprobe:v2.11.0` | 存活探针 sidecar |
| `node.hostPaths.pluginDir.path` | `/var/lib/kubelet/csi-plugins/csi.curvine.io/` | CSI 插件目录 |
| `node.hostPaths.kubeletDir.path` | `/var/lib/kubelet` | Kubelet 目录 |
| `node.hostPaths.registrationDir.path` | `/var/lib/kubelet/plugins_registry/` | 插件注册目录 |

### Standalone 挂载模式（`node.mountMode=standalone`）

FUSE 运行在独立 Pod 中。适用于 CSI node Pod 重启后仍需保持 FUSE 挂载的场景。

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `node.standalone.image` | `""` | Standalone Pod 镜像，空值使用 CSI 镜像 |
| `node.standalone.resources.requests.cpu` | `500m` | CPU request |
| `node.standalone.resources.requests.memory` | `512Mi` | 内存 request |
| `node.standalone.resources.limits.cpu` | `2` | CPU limit |
| `node.standalone.resources.limits.memory` | `2Gi` | 内存 limit |

### ServiceAccount 与 RBAC

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `serviceAccount.controller.name` | `""` | 空值由 release 名称派生 |
| `serviceAccount.node.name` | `""` | 空值由 release 名称派生 |
| `rbac.create` | `true` | 创建 RBAC 资源 |

### Curvine 卷参数

用于 StorageClass `parameters`（动态 PV）或 PV `csi.volumeAttributes`（静态 PV）。

| 参数 | 必填 | 默认值 | 说明 |
|-----------|----------|---------|-------------|
| `master-addrs` | 是 | — | Curvine master 地址，`host:port` 逗号分隔 |
| `fs-path` | 动态 PV | `/` | 路径前缀；实际路径为 `fs-path` + `/` + pv-name |
| `curvine-path` | 静态 PV | — | Curvine 文件系统中的完整路径 |
| `path-type` | 否 | `Directory` | `Directory` 或 `DirectoryOrCreate` |

其他键（如 `io-threads`、`worker-threads`）会透传给 `curvine-fuse` 作为 CLI 参数。以下键由驱动保留，不可手动设置：`master-addrs`、`fs-path`、`path-type`、`curvine-path`、`mnt-path`。

### 示例

覆盖 embedded 模式资源：

```bash
helm upgrade curvine-csi curvine/curvine-csi -n curvine-system --reuse-values \
  --set node.container.resources.requests.cpu=200m \
  --set node.container.resources.requests.memory=256Mi
```

完整参数：

```bash
helm show values curvine/curvine-csi --version 0.3.2-alpha
```

## 故障排查

| 现象 | 处理 |
|---------|--------|
| CSI Pod 异常 | `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin` |
| Sidecar ImagePullBackOff | 覆盖 sidecar 镜像，见「配置参考」 |
| `master-addrs` 不可达 | `kubectl get pods -n curvine` |
| 挂载断开 | 重启应用 Pod |
