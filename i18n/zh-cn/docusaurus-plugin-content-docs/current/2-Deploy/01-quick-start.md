---
sidebar_position: 0
---

# 快速开始
本章节将介绍如何快速启动curvine集群，并且进行读写数据测试。

## 下载和编译curvine
下载代码：
```
git clone https://github.com/CurvineIO/curvine.git ./
```

下载的代码中，curvine-docker/compile，包含了各种构建编译镜像的Dockerfile， 可以根据需要选择文件，构建一个编译镜像，
如下以rocky9为例，构建一个编译镜像，并且启动一个容器，进行编译：

```
cd curvine-docker/compile

docker build -f Dockerfile_rocky9 -t curvine-compile:rocky9 .

docker run -itd --name curvine-compile \
-u root --privileged=true \
-v /code:/code  \
curvine-compile:rocky9 /bin/bash
```

编译代码，编译可能需要数分钟，具体取决于机器性能：
```
docker exec -it curvine-compile /bin/bash
cd /code/curvine
sh build/build.sh
```


## 启动本地集群
编译的代码在build/dist目录下，启动一个本地集群：
```
cd build/dist
./bin/restart-all.sh
```
restart-all.sh脚本会启动curvine master和worker， 并将master和worker的日志输出到logs目录下；
同时会执行挂载一个fuse文件系统到/curvine-fuse目录下。

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

访问fuse本地挂载点：```ls /curvine-fuse```

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
bin/curvine fs -ls /fs-bench

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