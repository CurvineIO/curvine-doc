# K8S CSI Driver

Prerequisite: curvine cluster installed via Helm in namespace `curvine`.

Chart: `curvine/curvine-csi`, version `0.3.2-alpha`. Release namespace: `curvine-system`.

## Architecture

| Component | Type | Description |
|-----------|------|-------------|
| CSI Controller | Deployment | Volume create and delete |
| CSI Node | DaemonSet | Node mount |

Default `node.mountMode=embedded`. In `standalone` mode, FUSE runs in a separate pod.

## Deployment

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

`standalone` mount mode:

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

## Example 1: Dynamic PV

`master-addrs` below is for a single-replica curvine cluster. For three replicas:

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

## Example 2: Static PV

### 1. StorageClass

Same as Example 1. Use the three-replica `master-addrs` when applicable.

### 2. PV and PVC

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

## Mount Modes

Default `node.mountMode=embedded`; see Deployment above.

`standalone` install parameters:

| Parameter | Description |
|-----------|-------------|
| `node.mountMode=standalone` | Enable standalone mode |
| `node.standalone.resources.requests.cpu` | Standalone pod CPU request |
| `node.standalone.resources.requests.memory` | Standalone pod memory request |
| `node.standalone.resources.limits.cpu` | Standalone pod CPU limit |
| `node.standalone.resources.limits.memory` | Standalone pod memory limit |
| `node.standalone.image` | Standalone pod image; empty uses CSI image |

## Configuration Reference

### Helm parameters

| Parameter | Default |
|-----------|---------|
| `node.mountMode` | `embedded` |
| `csiDriver.name` | `curvine` |
| `image.repository` | `ghcr.io/curvineio/curvine-csi` |

```bash
helm show values curvine/curvine-csi --version 0.3.2-alpha
```

### Curvine volume parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `master-addrs` | Yes | `host:port`, comma-separated |
| `fs-path` | Dynamic provisioning | Path prefix |
| `curvine-path` | Static PV | Full path |
| `path-type` | No | `DirectoryOrCreate` or `Directory` |

## Troubleshooting

| Symptom | Action |
|---------|--------|
| CSI pod unhealthy | `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin` |
| `master-addrs` unreachable | `kubectl get pods -n curvine` |
| Mount disconnected | Restart the application pod |
