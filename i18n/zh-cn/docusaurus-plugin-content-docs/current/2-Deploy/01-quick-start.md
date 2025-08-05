---
sidebar_position: 0
---

# 快速开始
本章节将介绍如何快速启动curvine集群，并且进行读写数据测试。

## 下载和编译curvine

**支持的linux发行版**
| OS Distribution     | Kernel Requirement | Tested Version | Dependencies |
|---------------------|--------------------|----------------|--------------|
| ​**CentOS 7**​      | ≥3.10.0            | 7.6            | fuse2-2.9.2  |
| ​**CentOS 8**​      | ≥4.18.0            | 8.5            | fuse3-3.9.1  |
| ​**Rocky Linux 9**​ | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| ​**RHEL 9**​        | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| ​**Ubuntu 22**​      | ≥5.15.0            | 22.4           | fuse3-3.10.5 |


下载代码
```
git clone https://github.com/CurvineIO/curvine.git ./
```

### 本地编译

**依赖环境**
- ​**Rust**: version 1.86 or later ([Installation Guide](https://www.rust-lang.org/tools/install))
- ​**Protobuf**: version 2.x [Install Guide](ttps://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip )
- ​**Maven**: version 3.8 or later ([Install Guide](https://maven.apache.org/install.html))
- ​**LLVM**: version 12 or later ([Installation Guide](https://llvm.org/docs/GettingStarted.html))
- ​**FUSE**: libfuse2 or libfuse3 development packages
- ​**JDK**: version 1.8 or later (OpenJDK or Oracle JDK)
- ​**npm**: version 9 or later ([Node.js Installation](https://nodejs.org/))


:::warning
请确保上述依赖环境已经安装好，并配置到环境变量中
:::

使用make命令即可全量编译， 编译结果位于 `build/dist` 中
```
make all
```


### docker编译

:::tip
如果您的系统环境是macos 或者 windows，或者linux版本不在 [支持列表](quick-start/#下载和编译curvine) 中， 则建议使用docker编译，这样您可以在隔离环境中安全操作，而不会影响您的系统环境。
:::


#### 1.使用curvine提供的编译镜像
curinve在dockerhub上提供了 基于`rock9` 的编译镜像

- `curvine/curvine-compile:latest` 最小化镜像，仅包含编译的各种依赖包
- `curvine/curvine-compile:build-cached` 缓存了项目的各类crates依赖包

:::tip
推荐使用curvine-compile镜像作为一个沙箱开发环境， 编译和运行都在docker容器中运行。
:::

快速尝鲜，您只需执行
```bash
make docker-build 

#or 使用带cache的镜像编译，更快速
make docker-build-cached
```

**常驻开发容器**
```bash
cd curvine
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

# 容器在后台运行，后续可以直接attach
docker exec -it curvine-compile /bin/bash
```


#### 2.进阶版：构建自己的编译镜像

:::tip
如果您遇到网络环境等问题，不方便使用官方提供的docker镜像，可以选择自己本地构建编译镜像。
:::

下载的代码中，`curvine-docker/compile`，包含了各种构建编译镜像的Dockerfile， 可以根据需要选择文件，构建一个编译镜像，
如下以rocky9为例，构建一个编译镜像，并且启动一个容器，进行编译：

```bash
cd curvine

docker build -f curvine-docker/compile/Dockerfile_rocky9 -t curvine-compile:rocky9 .

docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine-compile:rock9:latest /bin/bash

# 进入容器后
make all

# 容器在后台运行，后续可以直接attach
# docker exec -it curvine-compile /bin/bash
```

:::warning
如果您的编译镜像的os版本和宿主机os版本有较大差异或者不是相同的发行版，则可能因为libc或者abi等不兼容导致docker编译出来产物无法直接在宿主机运行。

因此， 对于docker编译出来的产物，强烈建议在相同的os版本或者docker容器中运行！
:::


## 启动本地集群
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