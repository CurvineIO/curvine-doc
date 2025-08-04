---
sidebar_position: 0
---

# Quick Start

This chapter introduces how to quickly start a Curvine cluster and perform read/write data testing.

## Download and Compile Curvine

Download the source code:
```bash
git clone https://github.com/CurvineIO/curvine.git ./
```

The downloaded code includes various Dockerfiles for building compilation images in the `curvine-docker/compile` directory. You can choose the appropriate file to build a compilation image. Here's an example using Rocky9 to build a compilation image and start a container for compilation:

```bash
cd curvine-docker/compile

docker build -f Dockerfile_rocky9 -t curvine-compile:rocky9 .

docker run -itd --name curvine-compile \
-u root --privileged=true \
-v /code:/code  \
curvine-compile:rocky9 /bin/bash
```

Compile the code (compilation may take several minutes depending on machine performance):
```bash
docker exec -it curvine-compile /bin/bash
cd /code/curvine
sh build/build.sh
```

## Start Local Cluster

The compiled code is located in the `build/dist` directory. Start a local cluster:
```bash
cd build/dist
./bin/restart-all.sh
```

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
bin/curvine fs -ls /fs-bench

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