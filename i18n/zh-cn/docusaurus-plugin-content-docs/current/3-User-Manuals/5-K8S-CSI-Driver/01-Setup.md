# K8S CSI Driver

前提：已通过 Helm 部署 curvine cluster（namespace `curvine`）。

Chart：`curvine/curvine-csi`，版本 `0.3.2-alpha`。Release namespace：`curvine-system`。

## 架构说明

| 组件 | 类型 | 说明 |
|------|------|------|
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
  master-addrs: "curvine-master-0.curvine-master.curvine.svc.cluster.local:8995"
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
      master-addrs: "curvine-master-0.curvine-master.curvine.svc.cluster.local:8995"
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

## 挂载模式

默认 `node.mountMode=embedded`，安装命令见「部署」。

`standalone` 模式安装参数：

| 参数 | 说明 |
|------|------|
| `node.mountMode=standalone` | 启用 standalone |
| `node.standalone.resources.requests.cpu` | Standalone Pod CPU request |
| `node.standalone.resources.requests.memory` | Standalone Pod 内存 request |
| `node.standalone.resources.limits.cpu` | Standalone Pod CPU limit |
| `node.standalone.resources.limits.memory` | Standalone Pod 内存 limit |
| `node.standalone.image` | Standalone Pod 镜像，空值使用 CSI 镜像 |

## 配置参考

### Helm 参数

| 参数 | 默认值 |
|------|--------|
| `node.mountMode` | `embedded` |
| `csiDriver.name` | `curvine` |
| `image.repository` | `ghcr.io/curvineio/curvine-csi` |

```bash
helm show values curvine/curvine-csi --version 0.3.2-alpha
```

### Curvine 卷参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `master-addrs` | 是 | `host:port`，逗号分隔 |
| `fs-path` | 动态供给 | 路径前缀 |
| `curvine-path` | 静态卷 | 完整路径 |
| `path-type` | 否 | `DirectoryOrCreate` 或 `Directory` |

## 故障排查

| 现象 | 处理 |
|------|------|
| CSI Pod 异常 | `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin` |
| `master-addrs` 不可达 | `kubectl get pods -n curvine` |
| 挂载断开 | 重启应用 Pod |
