# Dynamic PVC In Deployment

The current workflow uses the example manifests under `curvine-csi/examples` in the Curvine source tree:

- `storage-class.yaml`
- `pvc-curvine.yaml`
- `deployment-curvine.yaml`

This path is for stateless workloads that want multiple replicas to share one Curvine-backed PVC.

## Example Topology

- `StorageClass`: `curvine-sc`
- `PVC`: `curvine-shared-pvc`
- `Namespace`: `curvine-system`
- `Deployment`: `curvine-test-deployment`
- `Replicas`: `3`
- `Mount path inside the container`: `/usr/share/nginx/html`

## StorageClass Parameters

`examples/storage-class.yaml` defines the parameters that matter for dynamic provisioning:

| Parameter | In example | Meaning |
| --- | --- | --- |
| `master-addrs` | `m0:8995,m1:8995,m2:8995` | Required Curvine master endpoints |
| `fs-path` | `/test-data` | Path prefix used when the controller creates dynamic volume directories |
| `path-type` | `DirectoryOrCreate` | Create missing parent directories, or require them to exist with `Directory` |
| `io-threads`, `worker-threads` | commented out | Optional FUSE tuning overrides |

Implementation note: the controller code defaults `fs-path` to `/` if it is omitted, but the official example sets it explicitly and that is the safer pattern to document and operate.

## Apply The Example

```bash
cd /path/to/curvine/curvine-csi/examples

kubectl apply -f storage-class.yaml
kubectl apply -f pvc-curvine.yaml
kubectl apply -f deployment-curvine.yaml
```

## What The Example Creates

### Shared PVC

`pvc-curvine.yaml` creates:

- `PersistentVolumeClaim/curvine-shared-pvc`
- namespace `curvine-system`
- access mode `ReadWriteMany`
- requested capacity `5Gi`
- `storageClassName: curvine-sc`

### Deployment

`deployment-curvine.yaml` creates:

- `Deployment/curvine-test-deployment`
- namespace `curvine-system`
- `3` nginx replicas
- shared volume mounted at `/usr/share/nginx/html`

Each replica writes the pod hostname and timestamp into the same shared Curvine-backed directory.

## Verify Shared Access

```bash
kubectl get pvc -n curvine-system curvine-shared-pvc
kubectl get pods -n curvine-system -l app=curvine-test -o wide
kubectl get pv
```

Write from one pod and read from another:

```bash
POD1=$(kubectl get pod -n curvine-system -l app=curvine-test -o jsonpath='{.items[0].metadata.name}')
POD2=$(kubectl get pod -n curvine-system -l app=curvine-test -o jsonpath='{.items[1].metadata.name}')

kubectl exec -n curvine-system "$POD1" -- sh -c 'echo "hello from pod1" > /usr/share/nginx/html/shared.txt'
kubectl exec -n curvine-system "$POD2" -- cat /usr/share/nginx/html/shared.txt
```

If the second command prints the same content, the deployment is reading and writing through the same Curvine PVC as intended.

## How Dynamic Paths Are Built

For dynamic provisioning, the controller generates:

- `volumeHandle = {cluster-id}@{fs-path}@{pv-name}`
- `curvine-path = {fs-path}/{pv-name}`

The node plugin then reuses or creates a FUSE mount based on `master-addrs + fs-path`, and bind-mounts the generated `curvine-path` into the pod. The exact lifecycle is described in [Framework](04-Framework.md).
