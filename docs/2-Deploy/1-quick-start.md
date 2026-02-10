---
sidebar_position: 0
---

# Quick Start

This chapter introduces how to quickly start a Curvine cluster and perform read/write data testing.

## Download Release Binary Package

Download the pre-compiled Curvine package from https://github.com/CurvineIO/curvine/releases . Currently, only x86 environments based on Rocky9 are provided. For other environments, you need to compile from source. Refer to [Download and Compile Curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md).

The directory structure after extraction is as follows:
```
.
├── bin
├── build-version
├── conf
├── lib
└── webui
```

From the **extracted package directory** (the one containing `bin/`, `conf/`, `lib/`), run:

```bash
export CURVINE_MASTER_HOSTNAME=localhost   # Or your machine hostname / IP for production.
./bin/restart-all.sh
```

This starts all services on a single machine, including:
- curvine-master
- curvine-worker
- curvine-fuse
- webui

:::warning
`CURVINE_MASTER_HOSTNAME` is set to `localhost` in single-machine environments. For production deployment, you need to obtain the hostname of the local machine. Related configuration is in conf/curvine-env.sh.

If you are setting up in a k8s or other container environment, please ensure that the container's hostname is resolvable or accessible.
:::

By default, FUSE is mounted under the `/curvine-fuse` path. For service status monitoring, refer to [Standalone Mode](./2-Deploy-Curvine-Cluster/2-Standalone-Mode.md).

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