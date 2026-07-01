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

### Cluster and images

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cluster.id` | `curvine` | Cluster ID |
| `image.repository` | `ghcr.io/curvineio/curvine` | Image repository |
| `image.tag` | `""` | Empty uses `v{Chart.AppVersion}` |

### Replicas and resources

| Parameter | Default | Description |
|-----------|---------|-------------|
| `master.replicas` | `1` | Must be odd |
| `worker.replicas` | `1` | — |
| `master.resources` | see values.yaml | — |
| `worker.resources` | see values.yaml | — |

### Storage

| Mode | Configuration |
|------|---------------|
| PVC (default) | Cluster default StorageClass |
| Named StorageClass | `master.storage.*.storageClass`, `worker.storage.dataDirs[].storageClass` |
| hostPath | `storageClass: ""` with `hostPath`; see `values-baremetal.yaml` |

### OpenKruise

`openKruise.enabled` defaults to `false`. Master and worker use standard `apps/v1` StatefulSets without OpenKruise.

Set to `true` to install the kruise subchart and switch master/worker to Advanced StatefulSet (`apps.kruise.io/v1beta1`):

| Capability | Use case |
|------------|----------|
| In-place image update | Reduce pod recreation during image upgrades |
| PersistentPodState | Prefer scheduling master pods back to the same node after recreation |

| Parameter | Default |
|-----------|---------|
| `openKruise.enabled` | `false` |

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
