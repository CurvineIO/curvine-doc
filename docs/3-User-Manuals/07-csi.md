# CSI Driver
To facilitate quick integration with Curvine in cloud-native environments, Curvine provides CSI driver support. Your Pod containers can access Curvine through `PV` (Persistent Volume) without requiring application modifications, enabling the use of Curvine's caching capabilities.

The Curvine CSI driver follows the standard CSI specification and includes:
- `CSI Controller`, deployed in `Deployment` mode or `Statefulset` mode
- `CSI Node Plugin`, deployed in `DaemonSet` mode

Deployment scripts are located in the `curvine-csi/deploy` directory. Execute:
```bash
kubectl create -f curvine-csi/deploy
```

After successful deployment, you will see the following pods:
```bash
NAME                     READY   STATUS    RESTARTS   AGE
curvine-controller-0     4/4     Running   0          4h32m
curvine-csi-node-jbvmt   3/3     Running   0          4h32m
```

![csi-arch](img/csi-arch.png)

:::warning
The Curvine CSI driver depends on fuse, which is established by the CSI node plugin. Since CSI driver upgrades will interrupt the fuse service, proceed with caution.
:::

## Deploy CSI
First, deploy the CSI driver in the k8s cluster and ensure that the CSI node plugin is running properly.

## PVC+Static PV
You can manually create a static PV and bind the PVC to the static PV. Example:
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
      type: "Directory" # Using Directory type requires that the path must already exist
```

:::note 
The following fields are required:
- `volumeAttributes.curvinePath` must be `/`, as currently Curvine fuse only supports mounting the root path
- `volumeAttributes.type` as `Directory` indicates the path already exists. `DirectoryOrCreate` indicates the path will be automatically created if it doesn't exist
:::

## PVC+Dynamic PV
To use dynamic PV, you need to define a `StorageClass` first.

`StorageClass` example:

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
  type: "DirectoryOrCreate" #"DirectoryOrCreate" or "Directory"
```

PVC example:
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

After creating the PVC, a PV will be automatically created with the status `Bound`, as shown below:
```bash
$ kubectl get pvc
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
curvine-pvc   Bound    pvc-fce87a49-828f-43d2-8360-7901b0b5f886   5Gi        RWO            curvine-sc     <unset>                 16s
```

## Creating a Pod
Mount the Curvine volume to a pod. Example:
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

## Verification
On a cluster with Curvine running, you can manually create a file in the root path, such as 'index.html'. You can use the `fuse` feature; by default, the fuse mounted by Curvine is at the `/curvine-fuse` path.

```bash
$ ls /curvine-fuse
index.html
```

Check in the pod:
```bash
$ kubectl exec curvine-test-pod -n default -- /usr/bin/cat /usr/share/nginx/html/index.html
<html>
        hello curvine csi
</html>
```