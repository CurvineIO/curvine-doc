# CSI Framework And Mount Lifecycle

This page describes the behavior implemented in `curvine-csi` on the current main branch, not an older Helm-based design.

## Core Model

Curvine CSI has three moving parts:

| Component | Source | Responsibility |
| --- | --- | --- |
| Controller service | `pkg/csi/controller.go` | Validates provisioning parameters, creates or deletes Curvine directories, and returns the final `VolumeContext` |
| Node service | `pkg/csi/node.go` | Starts or reuses FUSE, computes host mount paths, and bind-mounts the right subdirectory into pods |
| FUSE process manager | `pkg/csi/fuse_manager.go` | Launches `/opt/curvine/curvine-fuse` with the generated mount path and pass-through FUSE flags |

## Mount Modes

`pkg/csi/driver.go` reads `MOUNT_MODE`:

- `embedded`: default in the Helm chart; FUSE runs inside the CSI node pod
- `standalone`: optional mode; FUSE runs in dedicated standalone pods

Operationally:

- `embedded` is simpler to deploy and operate, but restarting or upgrading the CSI node pod also interrupts the FUSE process.
- `standalone` isolates FUSE lifecycle from CSI pod restarts by running FUSE in dedicated standalone pods.

Helm chart defaults:

- `node.mountMode`: `embedded`
- Controller pods keep `MOUNT_MODE=embedded`

Raw `deploy/` manifests in the `curvine-csi` repository may still default node plugins to `standalone` until aligned with the Helm chart.

## Dynamic Provisioning Flow

### 1. StorageClass Validation

`ValidateStorageClassParams` in `pkg/csi/validator.go` enforces:

- `master-addrs` must be present and parse as `host:port,host:port,...`
- `fs-path` defaults to `/` when omitted
- `path-type` defaults to `Directory`
- `mnt-path` is rejected with `InvalidArgument`; the node computes the FUSE mount path itself (`/var/lib/kubelet/plugins/kubernetes.io/csi/curvine/<mount-key>/fuse-mount`)

Every other key is passed to `curvine-fuse` as `--<key> <value>`, except the keys the driver owns (`master-addrs`, `fs-path`, `path-type`, `curvine-path`, `author`, `volume-handle`) and the `csi.storage.k8s.io/*` keys Kubernetes adds. `CreateVolume` runs `curvine-fuse validate-config` with those flags and fails with `InvalidArgument` (`invalid fuse configuration: ...`) when `curvine-fuse` does not accept one; the node runs the same check before it starts FUSE. See [FUSE Command Construction](#fuse-command-construction) for the valid keys.

### 2. Controller Output

For dynamic volumes, `CreateVolume` in `pkg/csi/controller.go` generates:

```text
cluster-id   = sha256(master-addrs)[:8]
volumeHandle = {cluster-id}@{fs-path}@{pv-name}
curvine-path = {fs-path}/{pv-name}
```

It then stores these values in `VolumeContext` for later node-side operations.

`path-type` controls directory creation:

- `Directory`: parent path and final volume path must already exist
- `DirectoryOrCreate`: missing directories are created by the controller

## Node-Side Mount Generation

### Cluster ID

`pkg/csi/volume_handle.go` derives:

```text
cluster-id = first 8 hex chars of SHA256(master-addrs)
```

This ID is part of the dynamic `volumeHandle`.

### Mount Key

The node service and helper functions derive a separate `mount-key` from:

```text
master-addrs + fs-path
```

That value is then used to generate the host FUSE mount point:

```text
/var/lib/kubelet/plugins/kubernetes.io/csi/curvine/{mount-key}/fuse-mount
```

This is the key point for reuse: the shared FUSE process is grouped by `master-addrs + fs-path`, not by PVC name.

## FUSE Reuse Rules

### Dynamic Volumes

For dynamic provisioning, volumes created from the same:

- `master-addrs`
- `fs-path`

reuse the same node-side FUSE mount on a given Kubernetes node. Each PVC still gets its own `curvine-path` underneath that shared mount.

### Static PVs

The static PV example uses:

- arbitrary `volumeHandle`
- required `master-addrs`
- required `curvine-path`

Static PVs do not need the structured dynamic `volumeHandle`. When `fs-path` is omitted, the node code falls back to `/` before generating the mount key. That means static PV reuse is effectively keyed by `master-addrs + /` unless you add an explicit `fs-path` attribute yourself.

This behavior is inferred from the current `node.go` implementation, where missing `fs-path` is replaced with `/` before `mount-key` generation.

## How NodePublishVolume Finds The Pod Subpath

`NodePublishVolume` in `pkg/csi/node.go` computes the host subpath differently depending on the mounted root:

- If `fs-path == /`, the host subpath is `mnt-path + curvine-path`
- If `fs-path != /`, the host subpath is `mnt-path + relative(curvine-path, fs-path)`

Examples from the implementation comments:

```text
fs-path="/", curvine-path="/pvc-abc"
=> host subpath = <mnt-path>/pvc-abc

fs-path="/test-data", curvine-path="/test-data/pvc-abc"
=> host subpath = <mnt-path>/pvc-abc
```

This is why multiple PVCs can share one FUSE process while still landing in different directories.

## FUSE Command Construction

`pkg/csi/fuse_manager.go` starts FUSE as:

```text
/opt/curvine/curvine-fuse --master-addrs ... --fs-path ... --mnt-path ...
```

It always injects:

- `--master-addrs`
- `--fs-path`
- `--mnt-path`

and then appends the other StorageClass / PV keys as flags, in key order.

Those keys must be `curvine-fuse` flags. The `[fuse]` flags are generated from the `FuseConf` fields; `lib/curvine-fuse list-config-flags --format json` prints the full list. Apart from `mnt-path` and `fs-path`, which the driver sets, they are:

`metrics-enabled`, `io-threads`, `worker-threads`, `mnt-number`, `tasks-per-mnt` (alias `mnt-per-task`), `clone-fd`, `fuse-channel-size`, `stream-channel-size`, `web-port`, `read-dir-fill-ino`, `entry-timeout`, `attr-timeout`, `negative-timeout`, `remember`, `max-background`, `congestion-threshold`, `enable-meta-cache`, `meta-cache-ttl`, `node-cache-timeout`, `direct-io`, `write-back-cache`, `cache-readdir`, `non-seekable`, `check-permission`, `list-limit`

`[client]` settings are flags too, with a `client-` prefix (for example `client-block-size`).

A key that is not a `curvine-fuse` flag, such as the older `auto-cache`, `kernel-cache`, `master-hostname`, `master-rpc-port`, or `master-web-port`, or `node-cache-size`, makes `validate-config` fail, so the volume is not created.

## Lifecycle Summary

1. The controller validates StorageClass parameters and creates `curvine-path`.
2. The controller returns `VolumeContext` containing `master-addrs`, `fs-path`, and `curvine-path`.
3. The node plugin computes `cluster-id`, `mount-key`, and `mnt-path`.
4. If a compatible FUSE process already exists for that `master-addrs + fs-path` pair, the node reuses it.
5. Otherwise, the node starts a new `curvine-fuse` process.
6. The node bind-mounts the correct subdirectory into the pod.
7. When reference count reaches zero, `NodeUnstageVolume` stops the unused FUSE mount.

## Static Versus Dynamic PVs

| Mode | Required attributes | Controller behavior | Node behavior |
| --- | --- | --- | --- |
| Dynamic PVC via StorageClass | `master-addrs`, optional `fs-path`, optional `path-type` | Generates `volumeHandle` and `curvine-path` | Mounts `fs-path`, then bind-mounts the generated subdirectory |
| Static PV | `master-addrs`, `curvine-path` | No directory naming convention is generated for you | Mounts root by default if `fs-path` is omitted, then bind-mounts `curvine-path` |

## Operational Guidance

- Use `standalone` when CSI node pod restarts or upgrades must not interrupt the business FUSE process; `embedded` is the Helm default for simpler deployments.
- Set `fs-path` explicitly in StorageClasses even though the code defaults it to `/`. That makes reuse behavior and directory layout predictable.
- Do not depend on manual `mnt-path` assignment in new deployments; the main branch implementation already auto-generates it.
