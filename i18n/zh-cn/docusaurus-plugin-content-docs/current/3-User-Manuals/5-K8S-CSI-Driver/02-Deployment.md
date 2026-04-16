# 在 Deployment 中使用动态 PVC

当前推荐流程使用 Curvine 源码树中的 `curvine-csi/examples` 示例清单：

- `storage-class.yaml`
- `pvc-curvine.yaml`
- `deployment-curvine.yaml`

这个场景适合无状态业务：多个副本共享同一个由 Curvine 支撑的 PVC。

## 示例拓扑

- `StorageClass`：`curvine-sc`
- `PVC`：`curvine-shared-pvc`
- `Namespace`：`curvine-system`
- `Deployment`：`curvine-test-deployment`
- `副本数`：`3`
- `容器内挂载路径`：`/usr/share/nginx/html`

## StorageClass 参数

`examples/storage-class.yaml` 中和动态建卷直接相关的参数如下：

| 参数 | 示例值 | 含义 |
| --- | --- | --- |
| `master-addrs` | `m0:8995,m1:8995,m2:8995` | 必填，Curvine master 地址列表 |
| `fs-path` | `/test-data` | Controller 为动态卷创建目录时使用的路径前缀 |
| `path-type` | `DirectoryOrCreate` | 创建缺失父目录；如果改为 `Directory`，则要求目录已存在 |
| `io-threads`、`worker-threads` | 示例中被注释 | 可选的 FUSE 调优参数 |

实现细节补充：Controller 代码在 `fs-path` 缺失时会默认回落到 `/`，但官方示例始终显式配置该参数。文档也建议沿用这种显式写法，目录布局和复用行为更清晰。

## 应用示例

```bash
cd /path/to/curvine/curvine-csi/examples

kubectl apply -f storage-class.yaml
kubectl apply -f pvc-curvine.yaml
kubectl apply -f deployment-curvine.yaml
```

## 示例会创建什么

### 共享 PVC

`pvc-curvine.yaml` 会创建：

- `PersistentVolumeClaim/curvine-shared-pvc`
- 命名空间 `curvine-system`
- 访问模式 `ReadWriteMany`
- 申请容量 `5Gi`
- `storageClassName: curvine-sc`

### Deployment

`deployment-curvine.yaml` 会创建：

- `Deployment/curvine-test-deployment`
- 命名空间 `curvine-system`
- `3` 个 nginx 副本
- 共享卷挂载到 `/usr/share/nginx/html`

每个副本都会把自己的主机名和时间戳写入同一个 Curvine 目录。

## 校验共享访问

```bash
kubectl get pvc -n curvine-system curvine-shared-pvc
kubectl get pods -n curvine-system -l app=curvine-test -o wide
kubectl get pv
```

在一个 Pod 写入，在另一个 Pod 读取：

```bash
POD1=$(kubectl get pod -n curvine-system -l app=curvine-test -o jsonpath='{.items[0].metadata.name}')
POD2=$(kubectl get pod -n curvine-system -l app=curvine-test -o jsonpath='{.items[1].metadata.name}')

kubectl exec -n curvine-system "$POD1" -- sh -c 'echo "hello from pod1" > /usr/share/nginx/html/shared.txt'
kubectl exec -n curvine-system "$POD2" -- cat /usr/share/nginx/html/shared.txt
```

如果第二条命令能读到同样的内容，说明多个副本确实通过同一个 Curvine PVC 在共享数据。

## 动态路径如何生成

动态建卷时，Controller 会生成：

- `volumeHandle = {cluster-id}@{fs-path}@{pv-name}`
- `curvine-path = {fs-path}/{pv-name}`

之后 node 插件会基于 `master-addrs + fs-path` 复用或创建 FUSE 挂载，再把最终的 `curvine-path` bind mount 到 Pod。完整生命周期见 [Framework](04-Framework.md)。
