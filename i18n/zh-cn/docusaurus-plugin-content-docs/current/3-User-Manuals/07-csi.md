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