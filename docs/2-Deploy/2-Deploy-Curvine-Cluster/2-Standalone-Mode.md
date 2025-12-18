---
sidebar_position: 1
---

# Standalone Mode

This chapter introduces how to start a local cluster.

Compile the software installation package. For compilation instructions, refer to [Download and Compile Curvine](1-Preparation/02-compile.md)

The compiled artifacts are located in the `build/dist` directory. Start a local cluster:

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

Output:
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