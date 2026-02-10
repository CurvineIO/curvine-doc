# 部署准备

本章节介绍部署curvine前的准备。

## 操作系统

Curvine有良好的跨平台能力，
支持在几乎所有主流架构的各类操作系统上运行，包括且不限于 Linux、macOS、Windows 等；支持不同的cpu架构arm64、x86_64等。

如下一个建议的操作系统版本：
- Linux, `Rocky` >= 9 、`Centos` >= 7, `Ubuntu` > 22.04
- MacOS
- Windows

**已支持的发行版**
| 操作系统 | 内核要求 | 测试版本 | 依赖 |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |


## 资源需求
curvine没有最小资源要求，使用很小的资源就支撑极高的并发和流量。这里提供一个参考值：
- cpu 2核 
- 内存 4G
- 网络 10G
- SSD磁盘 1个 
  
根据这个参考值, 用其中一个资源值反推其他硬件的资源需求。  
假设有2个SSD磁盘，那么需要cpu 4核、内存8G、带宽20G；内存用4G也可以，这取决于业务并发，如果并发不高，内存不用增加。

:::warning
仅供参考，以实际业务为准。
:::


## 创建安装包

编译并打包。编译步骤见 [下载和编译 Curvine](./02-compile.md)。

在项目根目录执行：
```bash
make dist
```
该命令会先执行 `make all`（如尚未编译），再将 `build/dist` 打成一个 tar.gz，生成在**项目根目录**，文件名形如 `curvine-<平台>-<架构>-<时间戳>.tar.gz`；若设置 `RELEASE_VERSION`（如 `RELEASE_VERSION=v1.0.0 make dist`），则形如 `curvine-<版本>-<平台>-<架构>.tar.gz`。该压缩包即为用于部署或构建运行时镜像的安装包。

## 配置文件修改

解压安装包后（或直接使用 `build/dist` 时），环境脚本在 `conf/curvine-env.sh`，主配置在 `conf/curvine-cluster.toml`。（源码树中模板在 `etc/`，构建时会复制到 `build/dist/conf`。）

必须正确设置的环境变量是 **`LOCAL_HOSTNAME`**（或下文覆盖项），集群依赖其识别成员。建议设为本机 hostname：
```
export LOCAL_HOSTNAME=$(hostname)
```
:::warning
CURVINE_MASTER_HOSTNAME 和 CURVINE_WORKER_HOSTNAME 用于显式指定 Master 和 Worker 节点的IP地址，多网卡环境下建议显式指定。默认情况下执行hostname -I 并取最后一个IP，您也可以自行修改conf/curvine-env.sh中的IP获取方式。
:::

curvine的配置文件在conf/curvine-cluster.toml，这个文件是一个toml格式的配置文件，配置文件中包含了curvine的各种配置，通常需要修改的配置如下：
1. 配置master节点地址
2. 配置worker存储目录。

如下是一个示例配置：
``` 
format_master = false
format_worker = false

[master]
# 配置元数据保存目录
meta_dir = "data/meta" 

# 配置master日志目录
log = { level = "info", log_dir = "logs", file_name = "master.log" } 

[journal]
# 配置raft主节点列表。hostname需要和LOCAL_HOSTNAME环境变量一致，否则无法识别主节点。
# id为整数，不能重复。port为master raft端口，默认为8996
journal_addrs = [
    {id = 1, hostname = "master1", port = 8996},
    {id = 2, hostname = "master2", port = 8996},
    {id = 3, hostname = "master3", port = 8996}
]

# 配置raft 日志存储目录
journal_dir = "testing/journal"  

[worker]
# 预留空间，默认为0
dir_reserved = "0"

# 配置worker存储目录
data_dir = [
    "[SSD]/data/data1",
    "[SSD]/data/data2"
]

# 配置worker日志
log = { level = "info", log_dir = "logs", file_name = "worker.log" }

[client]
# 配置master地址，端口为master rpc端口，默认为8995
master_addrs = [
    { hostname = "master1", port = 8995 },
    { hostname = "master2", port = 8995 },
    { hostname = "master3", port = 8995 },
]


# 客户端日志配置
[log]
level = "info"
log_dir = "logs"
file_name = "curvine.log"

```

:::danger
**journal_addrs** 中每条配置的 hostname 必须与该 master 进程启动时本机 hostname（或 `LOCAL_HOSTNAME`）一致，否则该 master 无法加入 Raft 组。
:::

如果需要使用java hadoop 客户端，修改curvine-site.xml中fs.cv.master_addrs值，示例如下：
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```