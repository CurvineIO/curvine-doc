---
sidebar_position: 0.5
---

# Kubernetes Quick Start (kind / minikube)

This guide runs Curvine on a local Kubernetes cluster with the Helm charts, then mounts a Curvine volume in a pod through the CSI driver. It takes you from an empty machine to a pod that writes a file to Curvine and reads it back.

It uses [kind](https://kind.sigs.k8s.io/). A [minikube](#minikube) variant is at the end. The two Helm charts are:

| Chart | Release | Namespace | Purpose |
| --- | --- | --- | --- |
| `curvine/curvine` | `curvine` | `curvine` | Curvine master and worker |
| `curvine/curvine-csi` | `curvine-csi` | `curvine-system` | CSI driver that mounts Curvine into pods via FUSE |

For production clusters and the full list of chart values, see [Kubernetes Deployment](./2-Deploy-Curvine-Cluster/3-Distributed-Mode/01-k8s-Deployment.md) and [K8S CSI Driver](../3-User-Manuals/5-K8S-CSI-Driver/01-Setup.md).

## Prerequisites

- Docker, with at least 2 CPUs and 2 GB of memory available to it
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) 0.20 or later
- `kubectl`
- Helm 3

This guide was tested with kind v0.27.0 (Kubernetes v1.32.2) and minikube v1.25.1 (Kubernetes v1.23.1), chart version `0.5.2-alpha`.

## 1. Create a kind cluster

Save the cluster config:

```yaml title="kind-config.yaml"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: curvine
nodes:
  - role: control-plane
```

Create the cluster:

```bash
kind create cluster --config kind-config.yaml
kubectl cluster-info --context kind-curvine
```

The CSI node plugin mounts volumes with FUSE, so the kind node needs `/dev/fuse`. kind nodes run as privileged containers and see the host's devices, so no extra mount is required. Check that the device is there:

```bash
docker exec curvine-control-plane ls -l /dev/fuse
```

```text
crw-rw-rw- 1 root root 10, 229 ... /dev/fuse
```

:::note
If `/dev/fuse` is missing on a Linux host, load the kernel module with `sudo modprobe fuse` and recreate the cluster. Docker Desktop on macOS already provides the device.
:::

kind installs a default StorageClass named `standard` (local-path provisioner). The runtime chart below uses it for master metadata, the Raft journal, and worker data:

```bash
kubectl get storageclass
```

## 2. Install the Curvine runtime

Save a values file sized for a laptop. It runs one master and one worker, uses the `standard` StorageClass, and lowers the default resource requests:

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

The worker `size` also sets the capacity Curvine reports for that data directory (`2Gi` becomes `[SSD:2GB]/data/data1`).

Add the Helm repository and install the chart:

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
`0.5.2-alpha` is a pre-release, so Helm does not pick it unless you pass `--version` (or `--devel`). Run `helm search repo curvine --devel --versions` to list the published versions.
:::

Check that the master and worker are running and their PVCs are bound:

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

The worker should have registered with the master:

```bash
kubectl logs -n curvine curvine-master-0 | grep "Worker register"
```

## 3. Install the CSI driver

Save the CSI values. They lower the node plugin's memory request and avoid pulling the image again on every restart:

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

Install the chart:

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

Create a StorageClass that points at the master. Each PVC gets its own directory under `fs-path` in Curvine:

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

## 4. Mount a volume in a pod

Save a PVC and a test pod that mounts it at `/data`:

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

Apply it and wait for the pod. The pod becomes Ready only after the PVC is bound and the volume is mounted:

```bash
kubectl apply -f curvine-test.yaml
kubectl wait --for=condition=Ready pod/curvine-test --timeout=300s
kubectl get pvc curvine-test-pvc
```

Write a file and read it back:

```bash
kubectl exec curvine-test -- sh -c 'echo "hello curvine" > /data/hello.txt && cat /data/hello.txt'
```

```text
hello curvine
```

`/data` is a Curvine FUSE mount:

```bash
kubectl exec curvine-test -- sh -c 'mount | grep /data; df -h /data'
```

```text
curvinefs on /data type fuse.curvinefs (rw,relatime,user_id=0,group_id=0,default_permissions,allow_other)
Filesystem                Size      Used Available Use% Mounted on
curvinefs                 2.0G    128.0M      1.9G   6% /data
```

The file is stored in Curvine, not in the pod. List it with the `cv` CLI in the master container:

```bash
kubectl exec -n curvine curvine-master-0 -- /app/curvine/bin/cv fs ls -R /k8s-volumes
```

```text
drwxr-xr-x - root root   - ... /k8s-volumes/pvc-956ee5e1-4e9d-4da7-9b0f-e85cf5463dbd
-rw-r--r-- 1 root root  14 ... /k8s-volumes/pvc-956ee5e1-4e9d-4da7-9b0f-e85cf5463dbd/hello.txt
```

To confirm the data outlives the pod, recreate the pod and read the file again:

```bash
kubectl delete pod curvine-test
kubectl apply -f curvine-test.yaml
kubectl wait --for=condition=Ready pod/curvine-test --timeout=300s
kubectl exec curvine-test -- cat /data/hello.txt
```

## 5. Clean up

Delete the test resources and both releases:

```bash
kubectl delete -f curvine-test.yaml
kubectl delete -f curvine-sc.yaml
helm uninstall curvine-csi -n curvine-system
helm uninstall curvine -n curvine
```

`helm uninstall` keeps the master and worker PVCs created by the StatefulSets. Delete the namespaces to remove them, then delete the cluster:

```bash
kubectl delete namespace curvine curvine-system
kind delete cluster --name curvine
```

## minikube

The same values files and manifests work on minikube with the Docker driver. minikube's default StorageClass is also named `standard`.

```bash
minikube start -p curvine --driver=docker
minikube -p curvine ssh -- ls -l /dev/fuse
kubectl get storageclass
```

Then follow steps 2 to 4 unchanged. To clean up, run step 5 up to the `kind delete` command, then:

```bash
minikube delete -p curvine
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Master or worker pod `Pending` | `kubectl describe pod -n curvine <pod>`. Usually not enough memory in Docker, or no `standard` StorageClass (`kubectl get storageclass`). |
| PVC `curvine-test-pvc` stays `Pending` | `kubectl logs -n curvine-system -l app=curvine-csi-controller -c csi-plugin`. Make sure `kubectl get pods -n curvine` shows the master running. |
| Test pod stuck in `ContainerCreating` | `kubectl describe pod curvine-test`, then `kubectl logs -n curvine-system -l app=curvine-csi-node -c csi-plugin`. A missing `/dev/fuse` on the node shows up here. |
