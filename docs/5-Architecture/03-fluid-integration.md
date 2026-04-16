---
title: Fluid Integration
sidebar_position: 3
---

# Curvine and Fluid Integration

This document describes the **current** Curvine Fluid integration based on the code under `curvine-docker/fluid` in the Curvine main branch. It replaces the older thin-runtime-only narrative and reflects the unified `curvine-fluid` image and entrypoint now used by the main branch.

## Overview

Curvine currently supports **two Fluid integration modes**:

- **CacheRuntime mode**: Fluid launches Curvine **master**, **worker**, and **client/FUSE** components from the unified `curvine-fluid` image. This mode is driven by `CacheRuntimeClass` and `Dataset`.
- **ThinRuntime mode**: Fluid launches only a Curvine FUSE-based runtime for a Dataset through `ThinRuntimeProfile`, `Dataset`, and `ThinRuntime`.

Both modes use the same image entrypoint, which auto-detects runtime mode from:

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- `FLUID_RUNTIME_CONFIG_PATH`
- the explicit `fluid-thin-runtime` command argument

## Source of Truth

The current implementation lives in:

- `curvine-docker/fluid/Dockerfile`
- `curvine-docker/fluid/entrypoint.sh`
- `curvine-docker/fluid/generate_config.py`
- `curvine-docker/fluid/config-parse.py`
- `curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml`
- `curvine-docker/fluid/cache-runtime/curvine-dataset.yaml`
- `curvine-docker/fluid/cache-runtime/test-pod.yaml`
- `curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml`

If this page conflicts with those files, trust the code.

## Runtime Modes

### 1. CacheRuntime mode

CacheRuntime mode is selected when either:

- `FLUID_RUNTIME_COMPONENT_TYPE` is set, or
- a Fluid runtime config file exists at `FLUID_RUNTIME_CONFIG_PATH`

In this mode, `entrypoint.sh`:

1. generates a base Curvine config under `$CURVINE_HOME/conf/curvine-cluster.toml`
2. merges Fluid topology and component options through `generate_config.py`
3. starts one of the Curvine roles: `master`, `worker`, or `client`

The sample `curvine-cache-runtime-class.yaml` defines:

- **master** as a `StatefulSet`
- **worker** as a `StatefulSet`
- **client** as a `DaemonSet`

The `client` pod runs the FUSE side and mounts into the Fluid target path.

### 2. ThinRuntime mode

ThinRuntime mode is selected when either:

- `FLUID_RUNTIME_TYPE=thin`, or
- the container is started with the `fluid-thin-runtime` argument

In this mode, `entrypoint.sh` calls `config-parse.py`, which:

1. parses the Fluid runtime config JSON
2. extracts `mountPoint`, `targetPath`, and Dataset options
3. generates a minimal Curvine TOML file
4. writes a `mount-curvine.sh` wrapper
5. launches `curvine-fuse` directly

ThinRuntime mode is therefore the lighter integration path: it does not create Curvine master/worker pods from Fluid, and instead expects a reachable Curvine cluster already running elsewhere.

## Prerequisites

Before integrating Curvine with Fluid, make sure you have:

1. A working Kubernetes cluster
2. Fluid installed in the cluster
3. A Curvine image or locally built `curvine-fluid` image available to the cluster
4. For ThinRuntime: a reachable external Curvine cluster (`master-endpoints`)
5. For CacheRuntime: permission to create `CacheRuntimeClass`, `Dataset`, and test workloads

This page assumes you already know how to build or deploy Curvine itself.

## Build the Unified Fluid Image

The current main branch exposes a unified Fluid image build target:

```bash
cd /path/to/curvine
make docker-build-fluid
```

That target builds:

```text
curvine-fluid:latest
```

The resulting image uses `curvine-docker/fluid/Dockerfile`, whose base image is:

```text
ghcr.io/curvineio/curvine:${BASE_IMAGE_TAG}
```

The image entrypoint is:

```text
/entrypoint.sh
```

If you publish your own image, update the example manifests accordingly.

## CacheRuntime Integration

CacheRuntime mode is the right choice when you want Fluid to manage Curvine services inside the cluster.

### Step 1: Create the CacheRuntimeClass

Start from:

```text
curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

The shipped sample defines:

- `master` workload type: `StatefulSet`
- `worker` workload type: `StatefulSet`
- `client` workload type: `DaemonSet`
- image: `ghcr.io/curvineio/curvine-fluid:latest`

Apply it:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-cache-runtime-class.yaml
```

### Step 2: Create a Dataset

Start from:

```text
curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

The sample contains:

- `kind: Dataset`
- `kind: CacheRuntime`
- `runtimeClassName: curvine`
- `mountPoint: "curvine:///data"`

Apply it:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/curvine-dataset.yaml
```

### Step 3: Understand how config is generated

`generate_config.py` merges Fluid topology and component options into Curvine config.

Important behaviors:

- `CURVINE_DATASET_NAME` becomes the Curvine `cluster_id`
- Master journal peer addresses are generated from Fluid master pod topology
- `worker.data_dir` is derived from `worker.options.data_dir` or `tieredStore`
- `client.targetPath` becomes `fuse.mnt_path`
- `client.master_addrs` is derived from generated master endpoints

This means the effective Curvine configuration is **not** a static hand-written TOML file. It is generated from Fluid runtime config plus environment variables.

### Step 4: Verify the runtime

Check the core resources:

```bash
kubectl get cacheruntimeclass
kubectl get dataset
kubectl get pods -A | grep curvine
```

### Step 5: Run the sample test pod

Start from:

```text
curvine-docker/fluid/cache-runtime/test-pod.yaml
```

Apply it:

```bash
kubectl apply -f curvine-docker/fluid/cache-runtime/test-pod.yaml
kubectl logs curvine-demo
```

The sample pod mounts the Curvine-backed PVC at `/data` and performs simple read/write verification.

## ThinRuntime Integration

ThinRuntime mode is the right choice when you already have a Curvine cluster and only want Fluid to mount it into workloads.

### Step 1: Create the ThinRuntimeProfile

Use the profile from:

```text
curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

Key fields:

```yaml
kind: ThinRuntimeProfile
spec:
  fileSystemType: fuse
  fuse:
    image: ghcr.io/curvineio/curvine-fluid
    imageTag: latest
```

### Step 2: Create the Dataset

The same sample file also contains the Dataset:

```yaml
kind: Dataset
spec:
  mounts:
  - mountPoint: curvine:///data
    options:
      master-endpoints: "127.0.0.1:8995"
```

The most important Dataset options parsed by `config-parse.py` are:

| Option | Required | Meaning |
| --- | --- | --- |
| `master-endpoints` | yes | Curvine Master RPC endpoint, `host:port` |
| `master-web-port` | no | Master web port override |
| `io-threads` | no | FUSE I/O thread count |
| `worker-threads` | no | FUSE worker thread count |
| `mnt-number` | no | FUSE mount count |

### Step 3: Create the ThinRuntime

The sample also contains:

```yaml
kind: ThinRuntime
metadata:
  name: curvine-dataset
spec:
  profileName: curvine-profile
```

Apply the combined sample:

```bash
kubectl apply -f curvine-docker/fluid/thin-runtime/curvine-thinruntime.yaml
```

### Step 4: Understand generated files

In ThinRuntime mode, `config-parse.py` generates:

- `$CURVINE_HOME/conf/curvine-cluster.toml`
- `$CURVINE_HOME/mount-curvine.sh`

The generated TOML contains:

- `master.hostname`
- `client.master_addrs`
- `fuse.mnt_path`
- `fuse.fs_path`

derived from the Fluid Dataset config.

### Step 5: Verify the ThinRuntime

Check resources:

```bash
kubectl get thinruntime
kubectl get dataset
kubectl get pods -A | grep curvine
```

## Verification Checklist

For either mode, verify:

- the relevant Fluid resource is `Ready` / `Bound`
- the Curvine or FUSE pods are running
- the mount path inside the workload is accessible
- reads and writes behave as expected for your selected mode

Useful commands:

```bash
kubectl get dataset
kubectl get thinruntime
kubectl get cacheruntime
kubectl get pods -A | grep curvine
kubectl describe dataset <name>
```

## Troubleshooting

### Image starts in the wrong mode

Check:

- `FLUID_RUNTIME_TYPE`
- `FLUID_RUNTIME_COMPONENT_TYPE`
- whether `FLUID_RUNTIME_CONFIG_PATH` exists
- the container arguments (`master`, `worker`, `client`, or `fluid-thin-runtime`)

### ThinRuntime cannot reach Curvine

Check the Dataset option:

```yaml
master-endpoints: "host:port"
```

It must point to a reachable Curvine Master RPC endpoint.

### FUSE mount is missing

Inspect:

```bash
kubectl logs <pod>
```

and check whether:

- `/dev/fuse` is available
- the runtime is privileged when required
- `targetPath` and `mountPoint` are correct

### CacheRuntime topology looks wrong

Inspect the generated runtime config and logs:

```bash
kubectl logs <master-pod>
kubectl logs <worker-pod>
kubectl logs <client-pod>
```

`generate_config.py` relies on Fluid topology metadata to derive journal peers and service FQDNs. If topology is missing or malformed, the generated Curvine config will also be wrong.

## Recommended Documentation Pattern

When you extend this integration in the future, keep the documentation aligned to the code with this structure:

1. Runtime modes
2. Source-of-truth files
3. Build image
4. Install manifests
5. Verification
6. Troubleshooting

That keeps the integration guide stable even when manifest layout changes.
