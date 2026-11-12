---
sidebar_position: 0.5
---

# Kubernetes 快速开始（kind / minikube）

本指南使用 Helm Chart 在本地 Kubernetes 集群中运行 Curvine，并通过 CSI 驱动把 Curvine 卷挂载到 Pod 中。从一台空机器开始，最终得到一个能向 Curvine 写入文件并读回的 Pod。

本文以 [kind](https://kind.sigs.k8s.io/) 为例，文末附有 [minikube](#minikube) 的做法。用到的两个 Helm Chart：

| Chart | Release | 命名空间 | 用途 |
| --- | --- | --- | --- |
| `curvine/curvine` | `curvine` | `curvine` | Curvine master 和 worker |
| `curvine/curvine-csi` | `curvine-csi` | `curvine-system` | 通过 FUSE 将 Curvine 挂载到 Pod 的 CSI 驱动 |

生产集群部署及完整的 Chart 参数说明，请参考 [Kubernetes 部署](./2-Deploy-Curvine-Cluster/3-Distributed-Mode/01-k8s-Deployment.md) 和 [K8S CSI 驱动](../3-User-Manuals/5-K8S-CSI-Driver/01-Setup.md)。

## 前置条件

- Docker，至少可用 2 个 CPU 和 2 GB 内存
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) 0.20 或更高版本
- `kubectl`
- Helm 3

本指南已在 kind v0.27.0（Kubernetes v1.32.2）和 minikube v1.25.1（Kubernetes v1.23.1）上验证，Chart 版本为 `0.5.2-alpha`。

## 1. 创建 kind 集群

保存集群配置：

```yaml title="kind-config.yaml"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: curvine
nodes:
  - role: control-plane
```

创建集群：

```bash
kind create cluster --config kind-config.yaml
kubectl cluster-info --context kind-curvine
```

CSI 节点插件通过 FUSE 挂载卷，因此 kind 节点上需要有 `/dev/fuse`。kind 节点以特权容器运行，可以看到宿主机的设备，无需额外挂载。确认设备存在：

```bash
docker exec curvine-control-plane ls -l /dev/fuse
```

```text
crw-rw-rw- 1 root root 10, 229 ... /dev/fuse
```

:::note
如果 Linux 宿主机上没有 `/dev/fuse`，请执行 `sudo modprobe fuse` 加载内核模块后重新创建集群。macOS 上的 Docker Desktop 已自带该设备。
:::

kind 会安装一个名为 `standard` 的默认 StorageClass（local-path provisioner）。下面的 runtime Chart 用它来存放 master 元数据、Raft 日志和 worker 数据：

```bash
kubectl get storageclass
```

## 2. 安装 Curvine runtime

保存一份适合笔记本运行的 values 文件：1 个 master、1 个 worker，使用 `standard` StorageClass，并调低默认资源请求：

```yaml title="curvine-values.yaml"
cluster:
  id: "curvine-local"

master:
  replicas: 1
  storage:
    meta:
      storageClass: "standard"
      size: "1Gi"
    journal:
      storageClass: "standard"
      size: "1Gi"
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "1"
      memory: "1Gi"

worker:
  replicas: 1
  antiAffinity:
    enabled: false
  storage:
    dataDirs:
      - name: "data1"
        type: "SSD"
        enabled: true
        size: "2Gi"
        storageClass: "standard"
        hostPath: ""
        mountPath: "/data/data1"
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "1"
      memory: "1Gi"
```

worker 的 `size` 同时决定 Curvine 为该数据目录上报的容量（`2Gi` 会转换为 `[SSD:2GB]/data/data1`）。

添加 Helm 仓库并安装 Chart：

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update

helm upgrade --install curvine curvine/curvine \
  --version 0.5.2-alpha \
  -n curvine \
  --create-namespace \
  -f curvine-values.yaml \
  --wait --timeout 10m
```

:::tip
`0.5.2-alpha` 是预发布版本，不传 `--version`（或 `--devel`）时 Helm 不会选中它。可以执行 `helm search repo curvine --devel --versions` 查看已发布的版本。
:::

确认 master 和 worker 正在运行，且 PVC 已绑定：

```bash
kubectl get pods,pvc -n curvine
```

```text
NAME                   READY   STATUS    RESTARTS   AGE
pod/curvine-master-0   1/1     Running   0          82s
pod/curvine-worker-0   1/1     Running   0          82s

NAME                                             STATUS   ...   CAPACITY   ACCESS MODES   STORAGECLASS
persistentvolumeclaim/data1-curvine-worker-0     Bound    ...   2Gi        RWO            standard
persistentvolumeclaim/journal-curvine-master-0   Bound    ...   1Gi        RWO            standard
persistentvolumeclaim/meta-curvine-master-0      Bound    ...   1Gi        RWO            standard
```

worker 应已向 master 注册：

```bash
kubectl logs -n curvine curvine-master-0 | grep "Worker register"
```

## 3. 安装 CSI 驱动

保存 CSI 的 values 文件。它调低了节点插件的内存请求，并避免每次重启都重新拉取镜像：

```yaml title="curvine-csi-values.yaml"
image:
  pullPolicy: IfNotPresent

node:
  container:
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
```

安装 Chart：

```bash
helm upgrade --install curvine-csi curvine/curvine-csi \
  --version 0.5.2-alpha \
  -n curvine-system \
  --create-namespace \
  -f curvine-csi-values.yaml \
  --wait --timeout 8m

kubectl get csidriver curvine
kubectl get pods -n curvine-system
```

```text
NAME                                      READY   STATUS    RESTARTS   AGE
curvine-csi-controller-59b597796d-bsgpx   4/4     Running   0          61s
curvine-csi-node-cvxr2                    3/3     Running   0          61s
```

创建一个指向 master 的 StorageClass。每个 PVC 会在 Curvine 中 `fs-path` 下获得独立的目录：

```yaml title="curvine-sc.yaml"
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
kubectl apply -f curvine-sc.yaml
```

## 4. 在 Pod 中挂载卷

保存一个 PVC 和一个把它挂载到 `/data` 的测试 Pod：

```yaml title="curvine-test.yaml"
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: curvine-test-pvc
  namespace: default
spec:
  storageClassName: curvine-sc
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: curvine-test
  namespace: default
spec:
  containers:
    - name: app
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: curvine-test-pvc
```

应用并等待 Pod 就绪。只有 PVC 绑定且卷挂载完成后，Pod 才会变为 Ready：

```bash
kubectl apply -f curvine-test.yaml
kubectl wait --for=condition=Ready pod/curvine-test --timeout=300s
kubectl get pvc curvine-test-pvc
```

写入一个文件并读回：

```bash
kubectl exec curvine-test -- sh -c 'echo "hello curvine" > /data/hello.txt && cat /data/hello.txt'
```

```text
hello curvine
```

`/data` 是一个 Curvine FUSE 挂载点：

```bash
kubectl exec curvine-test -- sh -c 'mount | grep /data; df -h /data'
```

```text
curvinefs on /data type fuse.curvinefs (rw,relatime,user_id=0,group_id=0,default_permissions,allow_other)
Filesystem                Size      Used Available Use% Mounted on
curvinefs                 2.0G    128.0M      1.9G   6% /data
```

文件存储在 Curvine 中，而不是 Pod 里。可以在 master 容器中用 `cv` CLI 查看：

```bash
kubectl exec -n curvine curvine-master-0 -- /app/curvine/bin/cv fs ls -R /k8s-volumes
```

```text
drwxr-xr-x - root root   - ... /k8s-volumes/pvc-956ee5e1-4e9d-4da7-9b0f-e85cf5463dbd
-rw-r--r-- 1 root root  14 ... /k8s-volumes/pvc-956ee5e1-4e9d-4da7-9b0f-e85cf5463dbd/hello.txt
```

重建 Pod 后再次读取文件，确认数据不随 Pod 消失：

```bash
kubectl delete pod curvine-test
kubectl apply -f curvine-test.yaml
kubectl wait --for=condition=Ready pod/curvine-test --timeout=300s
kubectl exec curvine-test -- cat /data/hello.txt
```

## 5. 清理

删除测试资源和两个 release：

```bash
kubectl delete -f curvine-test.yaml
kubectl delete -f curvine-sc.yaml
helm uninstall curvine-csi -n curvine-system
helm uninstall curvine -n curvine
```

`helm uninstall` 会保留 StatefulSet 创建的 master 和 worker PVC。删除命名空间即可一并清除，然后删除集群：

```bash
kubectl delete namespace curvine curvine-system
kind delete cluster --name curvine
```

## minikube

同样的 values 文件和清单也适用于使用 Docker driver 的 minikube。minikube 的默认 StorageClass 同样名为 `standard`。

```bash
minikube start -p curvine --driver=docker
minikube -p curvine ssh -- ls -l /dev/fuse
kubectl get storageclass
```

之后按第 2 至第 4 步原样操作。清理时执行第 5 步中 `kind delete` 之前的命令，然后执行：

```bash
minikube delete -p curvine
```

## 故障排查

| 现象 | 检查 |
| --- | --- |
| master 或 worker Pod 处于 `Pending` | `kubectl describe pod -n curvine <pod>`。通常是 Docker 内存不足，或没有 `standard` StorageClass（`kubectl get storageclass`）。 |
| PVC `curvine-test-pvc` 一直 `Pending` | `kubectl logs -n curvine-system -l app=curvine-csi-controller -c csi-plugin`。确认 `kubectl get pods -n curvine` 中 master 正在运行。 |
| 测试 Pod 卡在 `ContainerCreating` | `kubectl describe pod curvine-test`，然后 `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin`。节点上缺少 `/dev/fuse` 时会在这里报错。 |
