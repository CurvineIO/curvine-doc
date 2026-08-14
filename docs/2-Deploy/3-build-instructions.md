---
sidebar_position: 2
---

# Build Instructions

This page mirrors the build instructions from the repository README. For the full compilation guide (Docker builds, UFS modules, distribution packaging), see [Download and Compile Curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md).

This project requires the following dependencies. Please ensure they are installed before proceeding:

## Prerequisites

- **GCC**: version 10 or later ([Installation Guide](https://gcc.gnu.org/install/))
- **Rust**: version 1.86 or later ([Installation Guide](https://www.rust-lang.org/tools/install))
- **Protobuf**: version 3.x
- **Maven**: version 3.8 or later ([Install Guide](https://maven.apache.org/install.html))
- **LLVM**: version 12 or later ([Installation Guide](https://llvm.org/docs/GettingStarted.html))
- **FUSE**: libfuse2 or libfuse3 development packages
- **JDK**: version 1.8 or later (OpenJDK or Oracle JDK)
- **npm**: version 9 or later ([Node.js Installation](https://nodejs.org/))
- **Python**: version 3.7 or later ([Installation Guide](https://www.python.org/downloads/))

You can either:

1. Use the pre-configured `curvine-docker/compile/Dockerfile_rocky9` to build a compilation image
2. Reference this Dockerfile to create a compilation image for other operating system versions
3. We also supply `curvine/curvine-compile` image on dockerhub

## Build Steps (Linux - Ubuntu/Debian example)

Using `make` to build:

```bash
# Build all modules
make all

# Build core modules only: server client cli
make build ARGS="-p core"

# Build fuse and core modules
make build ARGS="-p core -p fuse"

# Build server-native SPDK/RDMA support. Client-side artifacts such as
# curvine-cli and curvine-fuse are built in isolated client-safe profiles.
make build ARGS="-p core -p fuse --spdk-rdma --spdk-dir /opt/spdk"
```

Using `build.sh` directly:

```bash
# Build all modules
bash build/build.sh

# Display command help
bash build/build.sh -h

# Build core modules only: server client cli
bash build/build.sh -p core

# Build fuse and core modules
bash build/build.sh -p core -p fuse

# Build only the server-native SPDK/RDMA artifact
bash build/build.sh -p server --spdk-rdma --spdk-dir /opt/spdk
```

Building Docker images:

```bash
# or use curvine-compile:latest docker images to build
make docker-build

# or use curvine-compile:build-cached docker images to build, this image already cached most dependency crates
make docker-build-cached
```

After successful compilation, target file will be generated in the `build/dist` directory. This file is the Curvine installation package that can be used for deployment or building images.

## Start a single-node cluster

:::note
This is the build-tree equivalent of the [Quick Start](./1-quick-start.md) flow. If you already have a release package, use Quick Start instead.
:::

```bash
cd build/dist

# Start the master node
bin/curvine-master.sh start

# Start the worker node
bin/curvine-worker.sh start
```

Mount the file system:

```bash
# The default mount point is /curvine-fuse
bin/curvine-fuse.sh start
```

View the cluster overview:

```bash
bin/cv report
```

Access the file system using compatible HDFS commands:

```bash
bin/cv fs mkdir /a
bin/cv fs ls /
```

Access Web UI:

```
http://your-hostname:9000
```

Curvine uses TOML-formatted configuration files. An example configuration is located at `conf/curvine-cluster.toml`. The main configuration items include:

- Network settings (ports, addresses, etc.)
- Storage policies (cache size, storage type)
- Cluster configuration (number of nodes, replication factor)
- Performance tuning parameters

Stop the cluster:

```bash
# Stop the FUSE mount
bin/curvine-fuse.sh stop

# Stop the worker and master nodes
bin/curvine-worker.sh stop
bin/curvine-master.sh stop
```
