---
sidebar_position: 1
---

# 单机模式

本章介绍如何启动一个本地集群

编译软件安装包，如何编译可以参考[下载和编译curvine](1-Preparation/02-compile.md)

编译的产物在build/dist目录下，启动一个本地集群：
```
cd build/dist
./bin/restart-all.sh
```

:::tip
如果你在编译阶段使用的docker容器，则运行curvine也推荐在相同的容器中运行。
:::

restart-all.sh脚本会启动curvine master和worker， 并将master和worker的日志输出到logs目录下；
同时会执行挂载一个fuse文件系统到`/curvine-fuse`目录下。


验证集群状态:
```
./bin/cv report

输出如下：
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

访问Master web ui界面：```http://your-hostname:9000```
访问Worker web ui界面：```http://your-hostname:9001```

:::tip
如果您使用的docker容器，请注意使用 `--network host ` 或则添加端口映射`9000,9001,8995,8996`, 以确保在宿主机中可以正常访问
:::

访问fuse本地挂载点：```ls /curvine-fuse```
