---
sidebar_position: 1
---

# Deployment Preparation

This chapter covers the practical preparation needed before deploying Curvine from a release package or from a locally built `build/dist`.

## Supported Runtime Baseline

The current `main` branch and release workflow are Linux-first. The officially documented tested distributions are:

| Operating System | Kernel Requirement | Tested Version | Dependencies |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |

macOS has partial support in the codebase and can be useful for development or limited local testing. Windows should be treated as limited support, not as a primary deployment target.

## Resource Requirements

Curvine has no minimum resource requirements and can support extremely high concurrency and traffic with very small resources. Here is a reference configuration:
- CPU: 2 cores
- Memory: 4GB
- Network: 10Gbps
- SSD disk: 1 unit

Based on this reference, you can extrapolate other hardware resource requirements from one resource value.
For example, if you have 2 SSD disks, you would need 4 CPU cores, 8GB memory, and 20Gbps bandwidth. 4GB memory is also acceptable, depending on business concurrency - if concurrency is not high, memory doesn't need to be increased.

:::warning
This is for reference only. Actual requirements depend on your specific business needs.
:::

## Create Installation Package

Compile and package the software. For compilation steps, see [Download and Compile Curvine](./02-compile.md).

From the project root, run:
```bash
make dist
```
This runs `make all` (if needed), then packages the contents of `build/dist` into a tar.gz file. The archive is created in the **project root** with a name like `curvine-<platform>-<arch>-<timestamp>.tar.gz`, or `curvine-<version>-<platform>-<arch>.tar.gz` if you set `RELEASE_VERSION` (e.g. `RELEASE_VERSION=v1.0.0 make dist`). This archive is the Curvine installation package for deployment or for building runtime images.

## Environment Script and Main Config

After unpacking the installation package, the key files are:

- `conf/curvine-env.sh`: shell-side environment setup
- `conf/curvine-cluster.toml`: main cluster configuration

The environment script exports these important variables:

- `CURVINE_MASTER_HOSTNAME`: defaults to local hostname
- `CURVINE_WORKER_HOSTNAME`: defaults to the last IP returned by `hostname -I` on Linux
- `CURVINE_CLIENT_HOSTNAME`: defaults to local hostname
- `CURVINE_CONF_FILE`: points to `conf/curvine-cluster.toml`

In multi-NIC, container, or multi-node deployments, you should usually set these explicitly instead of relying on autodetection.

```bash
export CURVINE_MASTER_HOSTNAME=master1
export CURVINE_WORKER_HOSTNAME=10.0.0.21
export CURVINE_CLIENT_HOSTNAME=client1
```

:::warning
The current scripts do not use a `LOCAL_HOSTNAME` variable as the primary runtime input. When documenting deployment or debugging hostname issues, prefer the `CURVINE_*_HOSTNAME` variables above.
:::

`conf/curvine-cluster.toml` is the main TOML configuration file. The most common changes are:

1. Master / journal addresses
2. Worker storage directories
3. Client-side `master_addrs`
4. Log destinations and levels

Example:
```toml
format_master = false
format_worker = false

[master]
# Configure metadata storage directory
meta_dir = "data/meta"

# Configure master log directory
log = { level = "info", log_dir = "logs", file_name = "master.log" }

[journal]
# Raft peer list. Each hostname must match the effective master hostname
# on the corresponding node.
journal_addrs = [
    {id = 1, hostname = "master1", port = 8996},
    {id = 2, hostname = "master2", port = 8996},
    {id = 3, hostname = "master3", port = 8996}
]

# Configure raft log storage directory
journal_dir = "testing/journal"

[worker]
# Reserved space, default is 0
dir_reserved = "0"

# Configure worker storage directories
data_dir = [
    "[SSD]/data/data1",
    "[SSD]/data/data2"
]

# Configure worker logs
log = { level = "info", log_dir = "logs", file_name = "worker.log" }

[client]
# Master RPC addresses
master_addrs = [
    { hostname = "master1", port = 8995 },
    { hostname = "master2", port = 8995 },
    { hostname = "master3", port = 8995 },
]

# Client log configuration
[log]
level = "info"
log_dir = "logs"
file_name = "curvine.log"
```

:::danger
Each hostname in `journal_addrs` must match the effective master hostname on that node, after `CURVINE_MASTER_HOSTNAME` overrides are applied. If they do not match, that Master will fail to join the Raft group.
:::

If you need the Java Hadoop client path, update `conf/curvine-site.xml` as well:
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```
