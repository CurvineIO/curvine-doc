# K8S CSI驱动
为了更方便在云原生环境下快速接入curvine, curinve提供了csi驱动支持, 你的Pod容器可以通过`PV`(Persisit Volume) 的方式来访问curvine, 无需对应用进行改造，即可使用curvine缓存能力；

Curvine CSI驱动遵循标准的CSI规范，包含 
- `CSI Controller`,  以`Deployment`模式或者`Statefuleset`模式部署
- `CSI Node Plugin`， 以`DaemonSet`模式部署

部署脚本位于项目 `curvine-csi/deploy` 下， 执行
```bash
kubectl create -f curvine-csi/deploy
```

:::warning
当前`curvine-csi`依赖的fuse版本仅支持集群配置文件的方式来建立连接， 因此，在`deploy/configmap.yaml` 中需要您将`master_addrs` 选项填写为真实的curvine master地址。 

这是临时方案，如果您用来尝鲜，可以试用起来。我们正在支持fuse的自定义参数，连接集群的各种配置参数，会通过storageclass或者pv的atrribute来自定义指定，近期会推出，敬请期待！

csi驱动还在快速迭代中，如果您有使用中的问题， 欢迎提交issue😄！
:::


正确部署后，会看到如下pod:
```bash
NAME                     READY   STATUS    RESTARTS   AGE
curvine-controller-0     4/4     Running   0          4h32m
curvine-csi-node-jbvmt   3/3     Running   0          4h32m
```

![csi-arch](img/csi-arch.png)

:::warning
Curvine CSI驱动依赖fuse，且由csi node plugin来建立建立，因为csi驱动升级会中断fuse服务， 谨慎操作；
:::

## 部署CSI
首先，在k8s集群中部署好csi driver, 并确保csi node plugin已正常运行。

## PVC+静态PV
你可以手动创建静态PV, 并将PVC绑定到静态PV上。 示例：
```yaml
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: curvine-pv
  labels:
    type: curvine
spec:
  storageClassName: curvine-sc
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  csi:
    driver: curvine
    volumeHandle: curvine-volume-1
    volumeAttributes:
      curvinePath: "/"
      type: "Directory" # 使用Directory类型，要求路径必须已存在
```

:::note 
以下为必填项
- `volumeAttributes.curvinePath` 必须为 `/`, 当前curvine fuse仅支持挂在根路径
- `volumeAttributes.type` 为 `Directory`, 表示路径已经存在。 `DirectoryOrCreate` 表示路径不存在时，会自动创建;
:::

## PVC+动态PV
使用动态PV，需要先定义好`StorageClass` ,  

`StorageClass` 示例：

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
  curvinePath: "/"
  type: "DirectoryOrCreate" #"DirectoryOrCreate"或"Directory"
```

PVC 示例：
```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: curvine-pvc
spec:
  storageClassName: curvine-sc
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

pvc创建后，会自动创建pv，并且状态为`Bound`, 如下
```bash
$ kubectl get pvc
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
curvine-pvc   Bound    pvc-fce87a49-828f-43d2-8360-7901b0b5f886   5Gi        RWO            curvine-sc     <unset>                 16s
```

## 创建Pod
将curvine卷挂载到pod中， 示例:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: curvine-csi-pod
  labels:
    app: curvine-csi-pod
spec:
  containers:
    - name: web-server
      image: nginx
      ports:
        - containerPort: 80
          name: "http-server"
      volumeMounts:
        - mountPath: "/usr/share/nginx/html"
          name: curvine-storage
  volumes:
    - name: curvine-storage
      persistentVolumeClaim:
        claimName: curvine-pvc
```

## 验证
在启动curvine的集群上，可以手动在/路径下创建一个文件，如'index.html'。 你可以使用`fuse`功能，默认curvine启动的fuse是挂载在`/curvine-fuse` 路径下。

```bash
$ ls /curvine-fuse
index.html
```


在pod中查看
```bash
$ kubectl exec curvine-test-pod -n default -- /usr/bin/cat /usr/share/nginx/html/index.html
<html>
        hello curvine csi
</html>
```

## Curvine CSI Driver Helm Chart

使用 Helm Chart 在 Kubernetes 集群上部署 Curvine CSI（容器存储接口）驱动程序。

### 前置条件

- Kubernetes 1.19+
- Helm 3.0+

### 安装

#### 添加 Helm 仓库（如果可用）

```bash
helm repo add curvine https://charts.curvine.io
helm repo update
```

#### 从本地 Chart 安装

```bash
# 使用默认值安装
helm install curvine-csi ./curvine-csi

# 使用自定义值安装
helm install curvine-csi ./curvine-csi -f custom-values.yaml

# 在指定命名空间安装
helm install curvine-csi ./curvine-csi --namespace curvine-system --create-namespace
```

### 配置

下表列出了可配置的参数及其默认值：

| 参数 | 描述 | 默认值 |
|-----------|-------------|---------|
| `global.namespace` | 部署资源的命名空间 | `default` |
| `image.repository` | Curvine CSI 镜像仓库 | `curvine/curvine-csi` |
| `image.tag` | Curvine CSI 镜像标签 | `latest` |
| `image.pullPolicy` | 镜像拉取策略 | `Always` |
| `csiDriver.name` | CSI 驱动名称 | `curvine` |
| `csiDriver.attachRequired` | 是否需要 attach | `true` |
| `csiDriver.podInfoOnMount` | 挂载时是否包含 pod 信息 | `false` |
| `controller.replicas` | 控制器副本数 | `1` |
| `controller.priorityClassName` | 控制器的优先级类 | `system-cluster-critical` |
| `node.priorityClassName` | 节点的优先级类 | `system-node-critical` |
| `rbac.create` | 创建 RBAC 资源 | `true` |
| `configMap.name` | ConfigMap 名称 | `curvine-config` |

### 自定义配置

#### 自定义 Curvine 配置

您可以通过修改 `configMap.data.curvineClusterToml` 值来自定义 Curvine 配置：

```yaml
configMap:
  data:
    curvineClusterToml: |
      [client]
      master_addrs = [
          { hostname = "your-master-host", port = 8995 }
      ]
      
      [log]
      level = "debug"
      log_dir = "stdout"
      file_name = "curvine.log"
```

#### 自定义镜像

```yaml
image:
  repository: your-registry/curvine-csi
  tag: v1.0.0
  pullPolicy: IfNotPresent

controller:
  sidecars:
    provisioner:
      image: registry.k8s.io/sig-storage/csi-provisioner:v3.6.0
    attacher:
      image: registry.k8s.io/sig-storage/csi-attacher:v4.5.0
```

#### 节点容忍度

```yaml
node:
  tolerations:
    - key: "node-role.kubernetes.io/master"
      operator: "Exists"
      effect: "NoSchedule"
    - key: "node-role.kubernetes.io/control-plane"
      operator: "Exists"
      effect: "NoSchedule"
```

### 使用方法

安装后，创建 StorageClass：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: curvine-csi
provisioner: curvine
parameters:
  # 添加 Curvine 特定参数
volumeBindingMode: WaitForFirstConsumer
```

创建 PVC：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: curvine-csi
```

### 卸载

```bash
helm uninstall curvine-csi
```

### 故障排除

#### 检查 CSI 驱动状态

```bash
kubectl get csidriver curvine
kubectl get pods -l app.kubernetes.io/name=curvine-csi
```

#### 检查日志

```bash
# 控制器日志
kubectl logs -l app=curvine-csi-controller -c csi-plugin

# 节点日志
kubectl logs -l app=curvine-csi-node -c csi-plugin
```

#### 常见问题

1. **CSI 驱动未注册**：检查 node-driver-registrar sidecar 是否正在运行
2. **挂载失败**：验证 Curvine 集群连接性和配置
3. **权限问题**：确保已授予正确的 RBAC 权限
