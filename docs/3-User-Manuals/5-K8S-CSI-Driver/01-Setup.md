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

## Configuration Reference

Chart version `0.3.2-alpha`. Defaults below match `helm show values curvine/curvine-csi --version 0.3.2-alpha`.

### Image

| Parameter | Default | Description |
|-----------|---------|-------------|
| `image.repository` | `ghcr.io/curvineio/curvine-csi` | CSI image repository |
| `image.tag` | `""` | Empty uses `v{Chart.AppVersion}` |
| `image.pullPolicy` | `Always` | Image pull policy |

### CSI driver

| Parameter | Default | Description |
|-----------|---------|-------------|
| `csiDriver.name` | `curvine` | CSI driver name |
| `csiDriver.attachRequired` | `false` | Attach operation not required |
| `csiDriver.podInfoOnMount` | `false` | Pod info not required on mount |

### Controller

| Parameter | Default | Description |
|-----------|---------|-------------|
| `controller.name` | `curvine-csi-controller` | Deployment name |
| `controller.replicas` | `1` | Controller replicas |
| `controller.priorityClassName` | `system-cluster-critical` | Priority class |
| `controller.container.name` | `csi-plugin` | Main container name |
| `controller.container.env.CSI_ENDPOINT` | `unix:///csi/csi.sock` | CSI socket |
| `controller.container.ports.healthz` | `9909` | Health check port |
| `controller.container.securityContext.privileged` | `true` | Privileged mode |
| `controller.sidecars.provisioner.image` | `quay.io/k8scsi/csi-provisioner:v1.6.0` | Provisioner sidecar |
| `controller.sidecars.attacher.image` | `registry.k8s.io/sig-storage/csi-attacher:v4.5.0` | Attacher sidecar |
| `controller.sidecars.livenessProbe.image` | `registry.k8s.io/sig-storage/livenessprobe:v2.11.0` | Liveness probe sidecar |

If provisioner or registrar sidecars fail with `ImagePullBackOff`, override with `registry.k8s.io/sig-storage` images:

```bash
--set controller.sidecars.provisioner.image=registry.k8s.io/sig-storage/csi-provisioner:v5.0.1 \
--set node.sidecars.nodeDriverRegistrar.image=registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.13.0
```

### Node

| Parameter | Default | Description |
|-----------|---------|-------------|
| `node.name` | `curvine-csi-node` | DaemonSet name |
| `node.priorityClassName` | `system-node-critical` | Priority class |
| `node.dnsPolicy` | `ClusterFirstWithHostNet` | DNS policy |
| `node.fuseDebugEnabled` | `false` | FUSE debug logging |
| `node.mountMode` | `embedded` | `embedded` or `standalone` |
| `node.container.name` | `csi-plugin` | Main container name |
| `node.container.env.CSI_ENDPOINT` | `unix:///csi/csi.sock` | CSI socket |
| `node.container.ports.healthz` | `9909` | Health check port |
| `node.container.ports.metrics` | `9002` | Metrics port |
| `node.container.securityContext.privileged` | `true` | Privileged mode |
| `node.container.resources.requests.cpu` | `500m` | CPU request (`embedded` mode) |
| `node.container.resources.requests.memory` | `512Mi` | Memory request (`embedded` mode) |
| `node.container.resources.limits.cpu` | `2` | CPU limit (`embedded` mode) |
| `node.container.resources.limits.memory` | `2Gi` | Memory limit (`embedded` mode) |
| `node.sidecars.nodeDriverRegistrar.image` | `quay.io/k8scsi/csi-node-driver-registrar:v2.1.0` | Registrar sidecar |
| `node.sidecars.livenessProbe.image` | `registry.k8s.io/sig-storage/livenessprobe:v2.11.0` | Liveness probe sidecar |
| `node.hostPaths.pluginDir.path` | `/var/lib/kubelet/csi-plugins/csi.curvine.io/` | CSI plugin directory |
| `node.hostPaths.kubeletDir.path` | `/var/lib/kubelet` | Kubelet directory |
| `node.hostPaths.registrationDir.path` | `/var/lib/kubelet/plugins_registry/` | Plugin registration directory |

### Standalone mount mode (`node.mountMode=standalone`)

FUSE runs in a separate pod. Use when FUSE must survive CSI node pod restarts.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `node.standalone.image` | `""` | Standalone pod image; empty uses CSI image |
| `node.standalone.resources.requests.cpu` | `500m` | CPU request |
| `node.standalone.resources.requests.memory` | `512Mi` | Memory request |
| `node.standalone.resources.limits.cpu` | `2` | CPU limit |
| `node.standalone.resources.limits.memory` | `2Gi` | Memory limit |

### Service account and RBAC

| Parameter | Default | Description |
|-----------|---------|-------------|
| `serviceAccount.controller.name` | `""` | Auto-derived from release name when empty |
| `serviceAccount.node.name` | `""` | Auto-derived from release name when empty |
| `rbac.create` | `true` | Create RBAC resources |

### Curvine volume parameters

Used in StorageClass `parameters` (dynamic PV) or PV `csi.volumeAttributes` (static PV).

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `master-addrs` | Yes | — | Curvine master addresses, `host:port` comma-separated |
| `fs-path` | Dynamic PV | `/` | Path prefix; actual path is `fs-path` + `/` + pv-name |
| `curvine-path` | Static PV | — | Full path in Curvine filesystem |
| `path-type` | No | `Directory` | `Directory` or `DirectoryOrCreate` |

Additional keys (for example `io-threads`, `worker-threads`) are forwarded to `curvine-fuse` as CLI flags. The following keys are reserved and must not be set manually: `master-addrs`, `fs-path`, `path-type`, `curvine-path`, `mnt-path`.

### Examples

Override embedded mode resources:

```bash
helm upgrade curvine-csi curvine/curvine-csi -n curvine-system --reuse-values \
  --set node.container.resources.requests.cpu=200m \
  --set node.container.resources.requests.memory=256Mi
```

Full parameter list:

```bash
helm show values curvine/curvine-csi --version 0.3.2-alpha
```

## Troubleshooting

| Symptom | Action |
|---------|--------|
| CSI pod unhealthy | `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin` |
| Sidecar ImagePullBackOff | Override sidecar images; see Configuration Reference |
| `master-addrs` unreachable | `kubectl get pods -n curvine` |
| Mount disconnected | Restart the application pod |
