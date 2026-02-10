---
sidebar_position: 1
---

# Deployment Preparation

This chapter introduces the preparations before deploying Curvine.

## Operating System

Curvine has excellent cross-platform capabilities and supports running on various operating systems across almost all mainstream architectures, including but not limited to Linux, macOS, Windows, etc. It supports different CPU architectures such as arm64, x86_64, etc.

Here are the recommended operating system versions:
- Linux: `Rocky` >= 9, `CentOS` >= 7, `Ubuntu` > 22.04
- macOS
- Windows

**Supported Distributions**
| Operating System | Kernel Requirement | Tested Version | Dependencies |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |

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

## Configuration File Modification

After unpacking the installation package (or when using `build/dist`), the environment script is at `conf/curvine-env.sh` and the main config at `conf/curvine-cluster.toml`. (In the source tree, templates live under `etc/` and are copied to `build/dist/conf` during build.)

The environment variable that must be set correctly is **`LOCAL_HOSTNAME`** (or the overrides below). The cluster uses it to identify members. Recommended:
```bash
export LOCAL_HOSTNAME=$(hostname)
```
:::warning
CURVINE_MASTER_HOSTNAME and CURVINE_WORKER_HOSTNAME are used to explicitly specify the IP addresses of Master and Worker nodes. In multi-network interface environments, it is recommended to explicitly specify them. By default, `hostname -I` is executed and the last IP is taken. You can also modify the IP acquisition method in conf/curvine-env.sh yourself.
:::

Curvine's configuration file is located at `conf/curvine-cluster.toml`. This is a TOML format configuration file containing various Curvine configurations. The configurations that typically need modification are:
1. Configure master node addresses
2. Configure worker storage directories

Here's an example configuration:
```toml
format_master = false
format_worker = false

[master]
# Configure metadata storage directory
meta_dir = "data/meta"

# Configure master log directory
log = { level = "info", log_dir = "logs", file_name = "master.log" }

[journal]
# Configure raft master node list. hostname must match LOCAL_HOSTNAME environment variable, otherwise master nodes cannot be identified.
# id must be an integer and cannot be duplicated. port is the master raft port, default is 8996
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
# Configure master addresses, port is master RPC port, default is 8995
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
The hostname in each entry of **journal_addrs** must match the hostname (or `LOCAL_HOSTNAME`) of the machine when that master process starts; otherwise the master cannot join the Raft group.
:::

If you need to use the Java Hadoop client, modify the `fs.cv.master_addrs` value in `curvine-site.xml`, example:
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```