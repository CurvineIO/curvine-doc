---
sidebar_position: 0
---

# 快速开始
本章节将介绍如何快速启动curvine集群，并且进行读写数据测试。

## 下载Release binary包
下载预编译好的curvine包，参见 https://github.com/CurvineIO/curvine/releases ， 目前仅提供基于rocky9的x86环境， 其他环境需要自行编译，参考[下载和编译curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md)

解压后的目录结构如下
```
.
├── bin
├── build-version
├── conf
├── lib
└── webui
```


在**解压后的目录**（包含 `bin/`、`conf/`、`lib/` 的目录）下执行：

```bash
export CURVINE_MASTER_HOSTNAME=localhost   # 生产环境可改为本机 hostname 或 IP
./bin/restart-all.sh
```

即可在单机上启动所有服务，包括
- curvine-master
- curvine-worker
- curvine-fuse
- webui

:::warning
`CURVINE_MASTER_HOSTNAME` 在单机环境下设置为`localhost`，正式部署生产需要获取本机的hostname，相关配置在conf/curvine-env.sh中。

如果您是在k8s等容器环境下设置，请一定要确认容器的hostname是可解析或者可访问的
:::

默认 FUSE 挂载在 `/curvine-fuse`。服务状态监测见 [单机模式](./2-Deploy-Curvine-Cluster/2-Standalone-Mode.md)。

## 读写数据
curvine提供了benchmark工具，用于测试curvine的读写性能；在快速开始中，我们可以借助这些脚本进行读写数据测试。
benchmark工具有rust和java两种语言的版本，分别位于bin目录下，使用方法如下：

```
# rust版本

bin/curvine-bench.sh fs.write # 使用rust客户端写数据
bin/curvine-bench.sh fs.read  # 使用rust客户端读数据

bin/curvine-bench.sh fuse.write # 使用fuse写数据
bin/curvine-bench.sh fuse.read  # 使用fuse读数据


# java 版本
bin/java-bench.sh fs.write # 使用java客户端写数据
bin/java-bench.sh fs.read  # 使用java客户端读数据

bin/java-bench.sh fuse.write # 使用fuse写数据
bin/java-bench.sh fuse.read  # 使用fuse读数据
```

使用命令行工具，查看文件系统状态：
```
bin/cv fs ls /fs-bench

# 输出如下：
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
可以看到，我们在fs-bench目录下，创建了10个文件，每个文件大小为100MB。

也可以使用linux命令行工具，查看文件系统状态：
```
ls -l /curvine-fuse/fs-bench
# 输出如下：
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