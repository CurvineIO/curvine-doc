---
sidebar_position: 0
---

# Kubernetes Deployment

Chart: `curvine/curvine`, version `0.3.2-alpha`.

## Prerequisites

- Kubernetes 1.20+
- Helm 3.x
- A default `StorageClass` for master/worker PVCs

## Architecture

Helm release `curvine` is deployed in namespace `curvine`:

| Resource | Description |
|----------|-------------|
| StatefulSet `curvine-master` | Metadata and Raft journal |
| StatefulSet `curvine-worker` | Data nodes |
| Service `curvine-master` | Headless, RPC 8995 |
| Service `curvine-worker` | Headless, RPC 8997 |

`openKruise.enabled` defaults to `false`. StatefulSets use `apps/v1`.

## Deployment

### Add repository

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update
```

### Install

```bash
helm upgrade --install curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine \
  --create-namespace \
  --wait --timeout 10m
```

### Verify

```bash
kubectl get pods,svc,pvc -n curvine
```

Web UI:

```bash
kubectl port-forward -n curvine svc/curvine-master 9000:9000
```

### Master addresses

Single replica:

```text
curvine-master.curvine.svc.cluster.local:8995
```

Three replicas:

```text
curvine-master-0.curvine-master.curvine.svc.cluster.local:8995,curvine-master-1.curvine-master.curvine.svc.cluster.local:8995,curvine-master-2.curvine-master.curvine.svc.cluster.local:8995
```

## Upgrade

```bash
helm upgrade curvine curvine/curvine \
  --version 0.3.2-alpha \
  -n curvine \
  --reuse-values \
  --set worker.replicas=3
```

`master.replicas` cannot be changed after install.

## Uninstall

```bash
helm uninstall curvine -n curvine
kubectl delete pvc -n curvine -l app.kubernetes.io/instance=curvine
kubectl delete namespace curvine
```

## Troubleshooting

| Symptom | Command | Cause |
|---------|---------|-------|
| Pod Pending | `kubectl describe pod -n curvine <name>` | Insufficient resources; no StorageClass |
| Slow master startup | `kubectl logs curvine-master-0 -n curvine` | Raft replay in progress |
| PVC Pending | `kubectl get sc` | No available StorageClass |

## Configuration Reference

Chart version `0.3.2-alpha`. Defaults below match `helm show values curvine/curvine --version 0.3.2-alpha`.

### Global

| Parameter | Default | Description |
|-----------|---------|-------------|
| `global.clusterDomain` | `cluster.local` | Kubernetes cluster domain |

### Cluster

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cluster.id` | `curvine` | Cluster ID |
| `cluster.formatMaster` | `false` | Format master data on startup |
| `cluster.formatWorker` | `false` | Format worker data on startup |
| `cluster.formatJournal` | `false` | Format journal data on startup |

### Image

| Parameter | Default | Description |
|-----------|---------|-------------|
| `image.repository` | `ghcr.io/curvineio/curvine` | Image repository |
| `image.tag` | `""` | Empty uses `v{Chart.AppVersion}` |
| `image.pullPolicy` | `IfNotPresent` | Image pull policy |
| `image.pullSecrets` | `[]` | Image pull secrets |

### OpenKruise

`openKruise.enabled` defaults to `false`. Master and worker use standard `apps/v1` StatefulSets.

Set `openKruise.enabled=true` to install the kruise subchart and switch master/worker to Advanced StatefulSet (`apps.kruise.io/v1beta1`).

| Parameter | Default | Description |
|-----------|---------|-------------|
| `openKruise.enabled` | `false` | Enable Advanced StatefulSet |
| `openKruise.podUpdatePolicy` | `InPlaceOnly` | `InPlaceOnly` \| `InPlaceIfPossible` \| `ReCreate` |
| `openKruise.persistentPodState.autoGenerate` | `true` | Auto-generate PersistentPodState |
| `openKruise.persistentPodState.preferredPersistentTopology` | `kubernetes.io/hostname` | Preferred topology key |
| `openKruise.persistentPodState.requiredPersistentTopology` | `""` | Required topology key (optional) |
| `kruise.installation.namespace` | `kruise-system` | Kruise subchart namespace (when enabled) |
| `kruise.installation.createNamespace` | `true` | Create Kruise namespace |

### Master

| Parameter | Default | Description |
|-----------|---------|-------------|
| `master.replicas` | `1` | Must be odd (1, 3, 5, …) |
| `master.rpcPort` | `8995` | RPC port |
| `master.journalPort` | `8996` | Journal/Raft port |
| `master.webPort` | `9000` | Web UI port |
| `master.web1Port` | `9001` | Additional web port |
| `master.startupProbe.enabled` | `true` | Startup probe |
| `master.startupProbe.failureThreshold` | `90` | Allow long Raft replay |
| `master.storage.meta.enabled` | `true` | Enable metadata PVC |
| `master.storage.meta.storageClass` | `""` | Empty uses default StorageClass |
| `master.storage.meta.size` | `5Gi` | Metadata PVC size |
| `master.storage.meta.hostPath` | `""` | hostPath when no StorageClass |
| `master.storage.meta.mountPath` | `/opt/curvine/data/meta` | Mount path |
| `master.storage.journal.enabled` | `true` | Enable journal PVC |
| `master.storage.journal.storageClass` | `""` | Empty uses default StorageClass |
| `master.storage.journal.size` | `10Gi` | Journal PVC size |
| `master.storage.journal.hostPath` | `""` | hostPath when no StorageClass |
| `master.storage.journal.mountPath` | `/opt/curvine/data/journal` | Mount path |
| `master.resources.requests.cpu` | `500m` | CPU request |
| `master.resources.requests.memory` | `1Gi` | Memory request |
| `master.resources.limits.cpu` | `1000m` | CPU limit |
| `master.resources.limits.memory` | `2Gi` | Memory limit |
| `master.antiAffinity.enabled` | `false` | Pod anti-affinity |
| `master.antiAffinity.type` | `required` | `required` or `preferred` |
| `master.persistentTopology.enabled` | `true` | PersistentPodState topology |
| `master.persistentTopology.key` | `kubernetes.io/hostname` | Topology key |
| `master.nodeSelector` | `{}` | Node selector |
| `master.tolerations` | `[]` | Tolerations |
| `master.affinity` | `{}` | Affinity rules |

### Worker

| Parameter | Default | Description |
|-----------|---------|-------------|
| `worker.replicas` | `1` | Worker replica count |
| `worker.rpcPort` | `8997` | RPC port |
| `worker.webPort` | `9001` | Web UI port |
| `worker.s3Gateway.enabled` | `false` | Enable S3 gateway |
| `worker.s3Gateway.listen` | `0.0.0.0:9900` | S3 gateway listen address |
| `worker.s3Gateway.enableDistributedAuth` | `true` | Distributed auth for S3 |
| `worker.s3Gateway.service.type` | `ClusterIP` | S3 service type |
| `worker.hostNetwork` | `false` | Use host network |
| `worker.dnsPolicy` | `ClusterFirst` | DNS policy |
| `worker.usePodIPAsHostname` | `false` | Use Pod IP as worker hostname |
| `worker.privileged` | `true` | Privileged mode (FUSE) |
| `worker.storage.dataDirs[0].name` | `data1` | Data directory name |
| `worker.storage.dataDirs[0].type` | `SSD` | Storage type |
| `worker.storage.dataDirs[0].enabled` | `true` | Enable data directory |
| `worker.storage.dataDirs[0].size` | `20Gi` | PVC size |
| `worker.storage.dataDirs[0].storageClass` | `""` | Empty uses default StorageClass |
| `worker.storage.dataDirs[0].hostPath` | `""` | hostPath when no StorageClass |
| `worker.storage.dataDirs[0].mountPath` | `/data/data1` | Mount path |
| `worker.resources.requests.cpu` | `500m` | CPU request |
| `worker.resources.requests.memory` | `1Gi` | Memory request |
| `worker.resources.limits.cpu` | `1000m` | CPU limit |
| `worker.resources.limits.memory` | `2Gi` | Memory limit |
| `worker.antiAffinity.enabled` | `true` | Pod anti-affinity |
| `worker.antiAffinity.type` | `preferred` | `required` or `preferred` |
| `worker.nodeSelector` | `{}` | Node selector |
| `worker.tolerations` | `[]` | Tolerations |
| `worker.affinity` | `{}` | Affinity rules |

### Service

| Parameter | Default | Description |
|-----------|---------|-------------|
| `service.master.type` | `ClusterIP` | Headless (`ClusterIP: None`) |
| `service.worker.type` | `ClusterIP` | Headless (`ClusterIP: None`) |
| `service.masterExternal.enabled` | `false` | External master access |
| `service.masterExternal.type` | `ClusterIP` | External service type |
| `service.masterExternal.loadBalancerIP` | `""` | LoadBalancer IP |

### Service account and RBAC

| Parameter | Default | Description |
|-----------|---------|-------------|
| `serviceAccount.create` | `true` | Create ServiceAccount |
| `serviceAccount.name` | `""` | Auto-generated when empty |
| `rbac.create` | `true` | Create RBAC resources |

### Curvine config (`config.*`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `config.master.metaDir` | `/opt/curvine/data/meta` | Master metadata directory |
| `config.journal.enable` | `true` | Enable journal |
| `config.journal.journalDir` | `/opt/curvine/data/journal` | Journal directory |
| `config.journal.snapshotInterval` | `6h` | Snapshot interval |
| `config.journal.snapshotEntries` | `1000000` | Snapshot entry threshold |
| `config.client.blockSizeStr` | `64MB` | Client block size |
| `config.log.level` | `INFO` | Log level |
| `config.log.logDir` | `/opt/curvine/logs` | Log directory |
| `config.log.console` | `true` | Route logs to stdout |

### Config overrides (`configOverrides.*`)

Override individual TOML sections without replacing the full config:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `configOverrides.master` | `{}` | Master section overrides |
| `configOverrides.journal` | `{}` | Journal section overrides |
| `configOverrides.worker` | `{}` | Worker section overrides |
| `configOverrides.client` | `{}` | Client section overrides |
| `configOverrides.log` | `{}` | Log section overrides |

### Storage modes

| Mode | Configuration |
|------|---------------|
| PVC (default) | `storageClass: ""` uses cluster default StorageClass |
| Named StorageClass | `master.storage.*.storageClass`, `worker.storage.dataDirs[].storageClass` |
| hostPath | `storageClass: ""` with `hostPath` set |

### Examples

Lower resource requests:

```bash
helm upgrade curvine curvine/curvine -n curvine --reuse-values \
  --set master.resources.requests.cpu=200m \
  --set master.resources.requests.memory=512Mi \
  --set worker.resources.requests.cpu=200m \
  --set worker.resources.requests.memory=512Mi
```

Full parameter list:

```bash
helm show values curvine/curvine --version 0.3.2-alpha
```
