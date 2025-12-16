---
sidebar_position: 0
---

# Quick Start

This chapter introduces how to quickly start a Curvine cluster and perform read/write data testing.

## Download Release Binary Package

Download the pre-compiled Curvine package from https://github.com/CurvineIO/curvine/releases. Currently, only x86 environments based on Rocky9 are provided. For other environments, you need to compile from source. Refer to [Download and Compile Curvine](#download-and-compile-curvine).

The directory structure after extraction is as follows:
```
.
├── bin
├── build-version
├── conf
├── lib
└── webui
```

Execute 
```
export CURVINE_MASTER_HOSTNAME=localhost # Can also be set to an IP address.
./bin/restart-all.sh
```

to start all services on a single machine, including:
- curvine-master
- curvine-worker
- curvine-fuse
- webui

:::warning
`CURVINE_MASTER_HOSTNAME` is set to `localhost` in single-machine environments. For production deployment, you need to obtain the hostname of the local machine. Related configuration is in conf/curvine-env.sh.

If you are setting up in a k8s or other container environment, please ensure that the container's hostname is resolvable or accessible.
:::

By default, FUSE is mounted under the `/curvine-fuse` path. For service status monitoring, refer to [Start Local Cluster](#start-local-cluster).

## Download and Compile Curvine

**Supported Linux Distributions**
| OS Distribution     | Kernel Requirement | Tested Version | Dependencies |
|---------------------|--------------------|----------------|--------------|
| **CentOS 7**        | ≥3.10.0            | 7.6            | fuse2-2.9.2  |
| **CentOS 8**        | ≥4.18.0            | 8.5            | fuse3-3.9.1  |
| **Rocky Linux 9**   | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **RHEL 9**          | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **Ubuntu 22**       | ≥5.15.0            | 22.4           | fuse3-3.10.5 |

Download the source code:
```bash
git clone https://github.com/CurvineIO/curvine.git ./
```

### Local Compilation

:::warning
Please ensure that the prerequisite dependencies are installed and configured in the environment variables. For the installation process of related environment dependencies, you can refer to the [Environment Initialization Tutorial](prerequisites)

or

[Docker Environment Initialization](https://github.com/CurvineIO/curvine/blob/main/curvine-docker/compile/Dockerfile_rocky9)
:::

Then, use the make command for full compilation. The compiled results are located in `build/dist`:
```bash
make all
```

:::note
For more make parameters, you can type `make` or `make help` to view, as shown below:
```bash
Curvine Build System - Available Commands:

Environment:
  make check-env                   - Check build environment dependencies

Building:
  make build [MODE=debug|release]  - Check environment, format and build the entire project (default: release)
  make all                         - Same as 'make build'
  make format                      - Format code using pre-commit hooks

Individual Components:
  make fuse [MODE=debug|release]   - Build curvine-fuse component only
  make server [MODE=debug|release] - Build curvine-server component only
  make cli [MODE=debug|release]    - Build curvine-cli component only
  make ufs [MODE=debug|release]    - Build curvine-ufs component only

Docker:
  make docker-build                - Build using Docker compilation image
  make docker-build-cached         - Build using cached Docker compilation image
  make docker-build-img            - Build compilation Docker image (interactive)

Other:
  make cargo ARGS='<args>'         - Run arbitrary cargo commands
  make help                        - Show this help message

Parameters:
  MODE=debug     - Build in debug mode (default, faster compilation)
  MODE=release   - Build in release mode (optimized, slower compilation)

Examples:
  make build                       - Build entire project in debug mode
  make build MODE=release          - Build entire project in release mode
  make server MODE=release         - Build only server component in release mode
  make cargo ARGS='test --verbose' - Run cargo test with verbose output
```
:::

### Docker Compilation

:::tip
If your system environment is macOS or Windows, or your Linux version is not in the [supported list](quick-start/#download-and-compile-curvine), we recommend using Docker compilation. This allows you to operate safely in an isolated environment without affecting your system environment.
:::

#### 1. Using Curvine-provided Compilation Images

Curvine provides compilation images based on `rocky9` on DockerHub:

- `curvine/curvine-compile:latest` - Minimal image containing only various compilation dependencies
- `curvine/curvine-compile:build-cached` - Cached with various project crates dependencies

:::tip
We recommend using the curvine-compile image as a sandbox development environment, where both compilation and execution run within Docker containers.
:::

For a quick try, you only need to execute:
```bash
make docker-build 

# or use the cached image for faster compilation
make docker-build-cached
```

**Persistent Development Container**
```bash
cd curvine
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

# The container runs in the background, you can attach directly later
docker exec -it curvine-compile /bin/bash
```

#### 2. Advanced: Build Your Own Compilation Image

:::tip
If you encounter network environment issues or cannot conveniently use the official Docker images, you can choose to build your own compilation image locally.
:::

The downloaded code includes various Dockerfiles for building compilation images in the `curvine-docker/compile` directory. You can choose the appropriate file to build a compilation image. Here's an example using Rocky9 to build a compilation image and start a container for compilation:

```bash
cd curvine/curvine-docker/compile

docker build -f curvine-docker/compile/Dockerfile_rocky9 -t curvine-compile:rocky9 .

cd ../..

docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine-compile:rocky9 /bin/bash

# After entering the container
make all

# The container runs in the background, you can attach directly later
# docker exec -it curvine-compile /bin/bash
```

:::warning
If there are significant differences between your compilation image's OS version and the host machine's OS version, or they are not from the same distribution, the Docker-compiled artifacts may not run directly on the host machine due to libc or ABI incompatibilities.

Therefore, for Docker-compiled artifacts, we strongly recommend running them on the same OS version or within Docker containers!
:::

## Start Local Cluster

The compiled artifacts are located in the `build/dist` directory. Start a local cluster:
```bash
cd build/dist
./bin/restart-all.sh
```

:::tip
If you used a Docker container during the compilation stage, we recommend running Curvine in the same container as well.
:::

The `restart-all.sh` script will start the Curvine master and worker, outputting logs to the `logs` directory. It will also mount a FUSE file system to the `/curvine-fuse` directory.

Verify cluster status:
```bash
./bin/cv report

# Output:
     active_master: localhost:8995
       journal_nodes: 1,localhost:8996
            capacity: 0.0B
           available: 0.0B (0.00%)
             fs_used: 14.0B (0.00%)
         non_fs_used: 0.0B
     live_worker_num: 1
     lost_worker_num: 0
           inode_num: 2
           block_num: 1
    live_worker_list: 192.168.xxx.xxx:8997,0.0B/0.0B (0.00%)
    lost_worker_list:
```

Access Master web UI: `http://your-hostname:9000`
Access Worker web UI: `http://your-hostname:9001`

:::tip
If you are using a Docker container, please ensure you use `--network host` or add port mappings `9000,9001,8995,8996` to ensure proper access from the host machine.
:::

Access FUSE local mount point: `ls /curvine-fuse`

## Read/Write Data Testing

Curvine provides benchmark tools for testing read/write performance. In this quick start, we can use these scripts for read/write data testing. The benchmark tools are available in both Rust and Java versions, located in the `bin` directory:

```bash
# Rust version
bin/curvine-bench.sh fs.write # Write data using Rust client
bin/curvine-bench.sh fs.read  # Read data using Rust client

bin/curvine-bench.sh fuse.write # Write data using FUSE
bin/curvine-bench.sh fuse.read  # Read data using FUSE

# Java version
bin/java-bench.sh fs.write # Write data using Java client
bin/java-bench.sh fs.read  # Read data using Java client

bin/java-bench.sh fuse.write # Write data using FUSE
bin/java-bench.sh fuse.read  # Read data using FUSE
```

Use command-line tools to check file system status:
```bash
bin/cv fs -ls /fs-bench

# Output:
Found 10 items
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/0
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/1
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/2
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/3
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/4
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/5
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/6
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/7
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/8
-rwxrwxrwx   1 root  104857600 2024-12-26 11:31 /fs-bench/9
```

As you can see, we created 10 files in the `fs-bench` directory, each with a size of 100MB.

You can also use Linux command-line tools to check the file system status:
```bash
ls -l /curvine-fuse/fs-bench

# Output:
total 1024000
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 0
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 1
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 2
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 3
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 4
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 5
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 6
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 7
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 8
-rwxrwxrwx. 1 root root 104857600 Jun  5 17:58 9
```