# 部署准备

本章节介绍如何基于 release 包或本地构建出的 `build/dist` 为 Curvine 做部署前准备。

## 运行环境基线

当前 `main` 分支与 release 流程以 Linux 为主。已在文档中明确测试过的发行版如下：

| 操作系统 | 内核要求 | 测试版本 | 依赖 |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |

macOS 在代码中有部分支持，适合作为开发或有限的本地测试环境；Windows 应视为有限支持，不建议作为主部署平台。


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

## 环境脚本与主配置

解压安装包后，最重要的两个文件是：

- `conf/curvine-env.sh`：shell 环境初始化脚本
- `conf/curvine-cluster.toml`：主配置文件

环境脚本会导出这些关键变量：

- `CURVINE_MASTER_HOSTNAME`：默认取本机 hostname
- `CURVINE_WORKER_HOSTNAME`：Linux 下默认取 `hostname -I` 返回结果中的最后一个 IP
- `CURVINE_CLIENT_HOSTNAME`：默认取本机 hostname
- `CURVINE_CONF_FILE`：默认指向 `conf/curvine-cluster.toml`

在多网卡、容器、多机部署场景中，建议显式设置这些值，而不要完全依赖自动探测：

```bash
export CURVINE_MASTER_HOSTNAME=master1
export CURVINE_WORKER_HOSTNAME=10.0.0.21
export CURVINE_CLIENT_HOSTNAME=client1
```

:::warning
当前脚本并不是以 `LOCAL_HOSTNAME` 作为主要运行时输入。涉及部署或排障时，应优先使用上面的 `CURVINE_*_HOSTNAME` 变量。
:::

`conf/curvine-cluster.toml` 是主 TOML 配置文件。通常最先需要修改的是：

1. Master / journal 地址
2. Worker 存储目录
3. Client 侧 `master_addrs`
4. 日志级别与输出位置

示例配置：
``` 
format_master = false
format_worker = false

[master]
# 配置元数据保存目录
meta_dir = "data/meta" 

# 配置master日志目录
log = { level = "info", log_dir = "logs", file_name = "master.log" } 

[journal]
# Raft 节点列表。每个 hostname 都必须与对应节点上的
# Master 实际生效 hostname 一致。
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
# Master RPC 地址列表
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
`journal_addrs` 中每条记录的 hostname，必须和对应节点在应用 `CURVINE_MASTER_HOSTNAME` 覆盖后的实际 Master hostname 一致，否则该 Master 无法加入 Raft 组。
:::

如果需要使用 Java Hadoop 客户端，还需要同步更新 `conf/curvine-site.xml` 中的 `fs.cv.master_addrs`：
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```
