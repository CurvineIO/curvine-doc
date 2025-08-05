---
sidebar_position: 1
---

# Deploy Curvine Cluster

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

### Resource Requirements

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

## Deployment

### Build From Source

Compile the software installation package. For compilation instructions, refer to [Quick Start](01-quick-start.md).

Execute the following command to create an installation package:
```bash
sh build/build.sh -r zip
```
After successful compilation, a `curvine.zip` file will be generated in the `build/dist` directory. This file is the Curvine installation package that can be used for deployment or building images.

### Configuration File Modification

The environment variable configuration file is located at `config/env.sh`. This file is a bash script used to configure Curvine's environment variables.
The environment variable that needs to be modified is `LOCAL_HOSTNAME`, which is very important as it specifies the hostname for Curvine. The Curvine cluster relies on it to identify cluster members.
It's recommended to set it to the local hostname:
```bash
export LOCAL_HOSTNAME=$(hostname)
```

Curvine's configuration file is located at `config/curvine.toml`. This is a TOML format configuration file containing various Curvine configurations. The configurations that typically need modification are:
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

If you need to use the Java Hadoop client, modify the `fs.cv.master_addrs` value in `curvine-site.xml`, example:
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```

### Non-Container Deployment

Non-container deployment requires manually starting Curvine master and worker. The startup commands are:
```bash
# Start master
bin/curvine-master.sh start

# Start worker
bin/curvine-worker.sh start

# FUSE mount
bin/curvine-fuse.sh start
```

### Container Deployment

After code compilation is complete, copy the compiled zip package to the `curvine-docker/deploy` directory and execute the following command to build the image:
```bash
# Default image name: curvine:latest
sh build-img.sh

# View the compiled image
docker images | grep curvine
```

Start services:
```bash
# Start a test master and worker
docker run -d \
--name curvine-cluster \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 -p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh all start

# Start master
docker run -d \
--name curvine-master \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh master start

# Start worker
docker run -d \
--name curvine-worker \
-p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh worker start
```

### Kubernetes Deployment

To be supplemented.

### Metrics Collection

Master and worker expose monitoring metrics through HTTP interfaces. These metrics can be collected by Prometheus and visualized through Grafana.

- Master metrics: `http://URL_ADDRESS:9000/metrics`
- Worker metrics: `http://URL_ADDRESS:9001/metrics`
