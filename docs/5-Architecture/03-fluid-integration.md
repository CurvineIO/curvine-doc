---
title: Fluid Integration
sidebar_position: 3
---

# Curvine and Fluid Integration

Fluid exposes a Kubernetes `Dataset` to application pods. Curvine can be used as the cache runtime behind that Dataset, or as an existing storage cluster that Fluid only mounts.

For new Fluid deployments, start with **CacheRuntime**. It lets Fluid create Curvine master, worker, and FUSE client pods, and it is the path that supports CacheRuntime data operations such as `DataLoad`.

## Choose an integration mode

| Mode | Use it when | What Fluid starts | Main resources |
| --- | --- | --- | --- |
| CacheRuntime | You want Fluid to manage a Curvine cache cluster in Kubernetes. | Curvine master, worker, and client/FUSE pods. | `CacheRuntimeClass`, `Dataset`, `CacheRuntime` |
| ThinRuntime | You already have a Curvine cluster and only need Fluid to mount it into workloads. | Curvine FUSE runtime only. | `ThinRuntimeProfile`, `Dataset`, `ThinRuntime` |

CacheRuntime is the recommended mode for most users. ThinRuntime is useful when Curvine is operated outside Fluid.

## Files and references

The Curvine Fluid materials live in the Curvine source tree:

| File | Purpose |
| --- | --- |
| `curvine-docker/deploy/Dockerfile_*` | Builds the normal `curvine` runtime image. Fluid support is included in this image. |
| `curvine-docker/deploy/entrypoint.sh` | Starts normal Curvine services, or delegates to `/fluid-entrypoint.sh` when Fluid runtime mode is detected. |
| `curvine-docker/fluid/entrypoint.sh` | Fluid entrypoint copied into the main image as `/fluid-entrypoint.sh`; selects CacheRuntime or ThinRuntime mode. |
| `curvine-docker/fluid/generate_config.py` | Parses Fluid runtime JSON and writes the Curvine TOML config for CacheRuntime pods. |
| `curvine-docker/fluid/config-parse.py` | Parses Fluid runtime JSON and writes the Curvine TOML config plus mount script for ThinRuntime. |
| `curvine-docker/fluid/mountUfs.sh` | Mounts the Dataset UFS paths into Curvine and reports mounted Curvine paths back to Fluid. |
| `curvine-docker/fluid/cache-runtime/` | CacheRuntime examples. |
| `curvine-docker/fluid/thin-runtime/` | ThinRuntime examples. |

Useful Fluid references:

- [Generic CacheRuntime integration](https://github.com/fluid-cloudnative/fluid/blob/master/docs/zh/dev/generic_cache_runtime_integration.md)
- [CacheRuntime data operations](https://github.com/fluid-cloudnative/fluid/blob/master/docs/zh/samples/cacheruntime_data_operations.md)
- [Fluid Curvine e2e sample](https://github.com/fluid-cloudnative/fluid/blob/master/test/gha-e2e/curvine/cacheruntimeclass.yaml)

## Build the Curvine image for Fluid

Fluid uses the same `curvine` runtime image as a normal Curvine deployment. The image also contains the Fluid entrypoint and helper scripts.

```bash
cd /path/to/curvine
make docker-build
```

This builds:

```text
curvine:latest
```

If the build asks for a runtime base image, choose the base image that matches your cluster. This integration was verified with the Rocky 9 image.

For a local cluster, load the image into the cluster runtime:

```bash
kind load docker-image curvine:latest
```

or:

```bash
minikube image load curvine:latest
```

For a shared cluster, tag and push it to a registry, then update the image in the Fluid manifests:

```bash
docker tag curvine:latest <registry>/curvine:<tag>
docker push <registry>/curvine:<tag>
```

Set the same image in `CacheRuntimeClass` and `ThinRuntimeProfile`.

The CacheRuntime `DataLoad` path has been verified with Fluid chart `helm-chart-fluid-1.1.0-alpha.10`, whose Fluid image tag is `v1.1.0-676f47a`. Older or custom Fluid charts may need the fallback notes in the DataLoad section.

## CacheRuntime quick start

Use CacheRuntime when Fluid should create and manage the Curvine cache pods.

### 1. Create the CacheRuntimeClass

Start from:

```text
curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

Apply it:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

The class describes how Fluid starts each Curvine role:

| Role | Kubernetes workload | Responsibility |
| --- | --- | --- |
| `master` | `StatefulSet` | Curvine metadata and journal service. |
| `worker` | `StatefulSet` | Cache storage. |
| `client` | `DaemonSet` | FUSE mount for application pods. |

The class also defines `executionEntries.mountUFS`. Fluid calls this entry so Curvine can mount Dataset UFS paths before serving the Dataset. In the Curvine image, the script is:

```text
/app/curvine/mountUfs.sh
```

The script reads `FLUID_RUNTIME_CONFIG_PATH`, runs `cv mount` for non-Curvine UFS paths, skips native `curvine://` paths, and returns JSON in the shape Fluid expects:

```json
{"mounted":["/path"]}
```

### 2. Create the Dataset and CacheRuntime

Start from:

```text
curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

Apply it:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

The example contains both resources:

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: Dataset
metadata:
  name: curvine-demo
  namespace: default
spec:
  mounts:
    - name: curvine
      mountPoint: "curvine:///data"
---
apiVersion: data.fluid.io/v1alpha1
kind: CacheRuntime
metadata:
  name: curvine-demo
  namespace: default
spec:
  runtimeClassName: curvine
```

`Dataset.spec.mounts[].mountPoint` is the backend path that Curvine exposes through Fluid. The application pod later mounts the Dataset PVC, not this raw backend path.

### 3. Wait for the runtime

Check the Fluid resources and Curvine pods:

```bash
kubectl get dataset curvine-demo
kubectl get cacheruntime curvine-demo
kubectl get pods -A | grep curvine-demo
```

If the Dataset is not ready, inspect the Dataset and the Curvine pod logs:

```bash
kubectl describe dataset curvine-demo
kubectl logs <curvine-master-pod>
kubectl logs <curvine-worker-pod>
kubectl logs <curvine-client-pod>
```

### 4. Run the test pod

Use the sample workload:

```text
curvine-docker/fluid/cache-runtime/test-pod.yaml
```

Apply it and read the logs:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/test-pod.yaml
kubectl logs curvine-demo
```

The pod mounts the Fluid PVC backed by Curvine and performs a simple read/write check.

## How CacheRuntime config is generated

CacheRuntime pods do not use a static hand-written TOML file.

Fluid writes runtime information into the file pointed to by:

```text
FLUID_RUNTIME_CONFIG_PATH
```

Curvine then runs:

```text
curvine-docker/fluid/generate_config.py
```

The script reads the Fluid JSON and writes:

```text
$CURVINE_HOME/conf/curvine-cluster.toml
```

Important generated values include:

| Curvine config | Source |
| --- | --- |
| `cluster_id` | Dataset name or Dataset mount option. |
| `journal.journal_addrs` | Fluid master topology and service name. |
| `worker.data_dir` | Worker options or Fluid `tieredStore`. |
| `client.master_addrs` | Generated master RPC endpoints. |
| `fuse.mnt_path` | Fluid client target path. |

This is why `FLUID_RUNTIME_CONFIG_PATH` is important for master, worker, and client pods.

## DataLoad with CacheRuntime

`DataLoad` asks Fluid to preload one or more Dataset paths into the cache. For Curvine, the DataLoad job should eventually run:

```bash
/app/curvine/bin/cv load <path> --watch --conf <curvine-conf>
```

There are two separate parts:

1. `CacheRuntimeClass.dataOperationSpecs` tells Fluid how to run a DataLoad job for this cache runtime.
2. A `DataLoad` resource asks Fluid to preload paths for a specific Dataset.

### 1. Enable DataLoad in CacheRuntimeClass

Add `dataOperationSpecs` at the top level of the existing `CacheRuntimeClass`.

Do not change `topology`, `fileSystemType`, or the master/worker/client definitions just to enable DataLoad.

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: CacheRuntimeClass
metadata:
  name: curvine
fileSystemType: curvinefs
dataOperationSpecs:
  - name: DataLoad
    command:
      - /bin/bash
      - -c
    args:
      - |
        # The command must prepare a Curvine config for this job,
        # then load every path passed by Fluid.
        IFS=: read -ra paths <<< "$FLUID_DATALOAD_DATA_PATH"
        for p in "${paths[@]}"; do
          /app/curvine/bin/cv load "$p" --watch --conf /etc/curvine.toml || exit 1
        done
topology:
  master:
    # Keep the existing CacheRuntime topology here.
```

Do not copy this snippet as a complete production command unless your DataLoad image or script creates `/etc/curvine.toml` before running `cv load`. The Curvine sample `curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml` includes that setup logic.

Fluid injects these environment variables into the DataLoad job:

| Variable | Meaning |
| --- | --- |
| `FLUID_DATALOAD_METADATA` | Whether metadata should be loaded. |
| `FLUID_DATALOAD_DATA_PATH` | Paths to load, joined by `:`. |
| `FLUID_DATALOAD_PATH_REPLICAS` | Replica count for each path, joined by `:`. |

The Curvine CacheRuntimeClass sample uses an inline DataLoad script because Fluid runs data operations as short-lived Jobs. The script first generates Curvine config from the Fluid runtime JSON. If that file is not mounted, it falls back to Dataset metadata, pod labels, and finally a DataLoad name pattern such as `<dataset>-load`.

When Fluid passes a Dataset path such as `/minio`, the script checks Curvine mount metadata and resolves it to the real Curvine load source before running `cv load --watch`. This keeps DataLoad aligned with `mountUFS`.

### 2. Create a DataLoad resource

Example:

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: DataLoad
metadata:
  name: curvine-dataload
  namespace: default
spec:
  dataset:
    name: curvine-demo
    namespace: default
  target:
    - path: /minio
```

Apply it:

```bash
kubectl apply -f dataload.yaml
```

`spec.dataset` selects the Dataset. `spec.target[].path` selects the Dataset path to preload. Fluid passes the target paths to the job through `FLUID_DATALOAD_DATA_PATH`.

### 3. Check the DataLoad job

```bash
kubectl get dataload curvine-dataload
kubectl get job -l role=dataload-job,targetDataset=curvine-demo
kubectl get pods -l role=dataload-pod,targetDataset=curvine-demo
kubectl logs -l role=dataload-pod,targetDataset=curvine-demo
```

The DataLoad job is successful only if the Curvine load command exits successfully for every target path. If `cv load --watch` returns an error, the job should fail so Fluid can report the problem.

### About `/etc/fluid/config/runtime.json`

Fluid chart `helm-chart-fluid-1.1.0-alpha.10` mounts the runtime config file into CacheRuntime DataLoad pods and sets `FLUID_RUNTIME_CONFIG_PATH`. With that version, Curvine DataLoad can generate config the same way as master, worker, and client pods.

Older Fluid versions or custom DataLoad templates may set `FLUID_RUNTIME_CONFIG_PATH` without mounting the file into the DataLoad pod.

If your DataLoad command needs the runtime JSON, verify both conditions:

1. `FLUID_RUNTIME_CONFIG_PATH` is set in the DataLoad pod.
2. The file exists inside the DataLoad pod.

If the file is missing, Curvine's sample tries these fallbacks in order:

1. `CURVINE_DATALOAD_DATASET`, `FLUID_DATASET_NAME`, or `CURVINE_DATALOAD_MASTER_HOST`.
2. Fluid pod labels such as `targetDataset` or `fluid.io/dataset-id`.
3. DataLoad names derived from the Dataset name, for example `<dataset>-load`.

If none of these identify the Dataset, set the Dataset or master host explicitly instead of hard-coding a wrong master endpoint.

## ThinRuntime quick start

Use ThinRuntime when Curvine already runs outside Fluid and Fluid only needs to mount it.

### 1. Create the ThinRuntimeProfile

Use:

```text
curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

The key fields are:

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: ThinRuntimeProfile
metadata:
  name: curvine-profile
spec:
  fileSystemType: fuse
  fuse:
    image: ghcr.io/curvineio/curvine
    imageTag: latest
```

### 2. Create the Dataset

The same sample contains a Dataset. The important option is `master-endpoints`:

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: Dataset
metadata:
  name: curvine-dataset
spec:
  mounts:
    - mountPoint: curvine:///data
      options:
        master-endpoints: "127.0.0.1:8995"
```

Supported Dataset options include:

| Option | Required | Meaning |
| --- | --- | --- |
| `master-endpoints` | yes | Curvine master RPC endpoint, `host:port`. |
| `master-web-port` | no | Master web port override. |
| `io-threads` | no | FUSE I/O thread count. |
| `worker-threads` | no | FUSE worker thread count. |
| `mnt-number` | no | FUSE mount count. |

### 3. Create the ThinRuntime

The same file also contains:

```yaml
apiVersion: data.fluid.io/v1alpha1
kind: ThinRuntime
metadata:
  name: curvine-dataset
spec:
  profileName: curvine-profile
```

Apply the sample:

```bash
kubectl apply -f curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

### 4. Verify ThinRuntime

```bash
kubectl get thinruntime curvine-dataset
kubectl get dataset curvine-dataset
kubectl get pods -A | grep curvine
```

In ThinRuntime mode, `config-parse.py` reads the Fluid runtime JSON and writes:

```text
$CURVINE_HOME/conf/curvine-cluster.toml
$CURVINE_HOME/mount-curvine.sh
```

The generated mount script starts `curvine-fuse` with the target path provided by Fluid.

## Troubleshooting

### The image starts in the wrong mode

Check the pod environment and command:

```bash
kubectl describe pod <pod>
```

The main inputs are:

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH`
- container arguments such as `master`, `worker`, `client`, or `fluid-thin-runtime`

### CacheRuntime pods cannot generate Curvine config

Check whether the runtime config exists:

```bash
kubectl exec <pod> -- ls -l "$FLUID_RUNTIME_CONFIG_PATH"
kubectl logs <pod>
```

`generate_config.py` needs valid Fluid runtime JSON. If the file is empty, missing, or malformed, the Curvine TOML file will not be generated correctly.

### MountUFS fails

Check the master pod logs and the Dataset mount options:

```bash
kubectl logs <curvine-master-pod>
kubectl describe dataset <dataset-name>
```

For object storage, make sure endpoint, access key, secret key, region, and path-style options are correct. Secrets referenced by Fluid must be mounted into the pod before `mountUfs.sh` reads them.

### FUSE mount is missing

Check the client or ThinRuntime pod:

```bash
kubectl logs <curvine-client-pod>
```

Confirm:

- `/dev/fuse` exists in the pod.
- the container is privileged when required by your cluster.
- the Fluid target path and Dataset mount path are correct.

### DataLoad job starts but fails

Check the DataLoad pod logs:

```bash
kubectl logs -l role=dataload-pod,targetDataset=<dataset-name>
```

Common causes:

- `dataOperationSpecs` is missing from the `CacheRuntimeClass`.
- `FLUID_DATALOAD_DATA_PATH` is empty or points to a path that Curvine did not mount.
- the DataLoad command uses the wrong Curvine config or master address.
- an older or custom Fluid template sets `FLUID_RUNTIME_CONFIG_PATH`, but does not mount the runtime config file.

Fix the command in `dataOperationSpecs`, reapply the `CacheRuntimeClass`, and create a new `DataLoad` resource.
