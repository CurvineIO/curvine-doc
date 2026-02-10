# OpenDAL 生态集成

## 概述

Curvine 在核心层面集成了 [OpenDAL](https://opendal.apache.org/)（Open Data Access Layer，开放数据访问层），为 Curvine 提供强大的存储生态支持。这种集成使得 Curvine 能够与各种存储后端无缝协作，同时保持统一的接口。

## 什么是 OpenDAL？

OpenDAL 是一个数据访问层，提供统一的 API 来访问各种存储服务。它作为应用程序和存储系统之间的抽象层，提供：

- **统一接口**：跨不同存储后端的一致 API
- **多存储支持**：支持对象存储、文件系统、数据库等多种存储类型
- **高性能**：优化的数据访问路径和缓存机制
- **可扩展性**：轻松添加新的存储后端支持
- **可靠性**：内置重试机制和错误处理

## 支持的存储后端

通过 OpenDAL 集成，Curvine 目前支持以下存储服务：

### 对象存储
- **Amazon S3**：AWS 的对象存储服务，支持 `s3://` 和 `s3a://` 协议
- **阿里云 OSS**：阿里云对象存储服务，支持 `oss://` 协议
- **腾讯云 COS**：腾讯云对象存储，支持 `cos://` 协议
- **Azure Blob Storage**：Microsoft Azure 的对象存储，支持 `azblob://` 协议
- **Google Cloud Storage**：Google 云存储，支持 `gcs://` 和 `gs://` 协议

### 分布式文件系统
- **HDFS**：Hadoop 分布式文件系统，支持 `hdfs://` 协议（需要特殊环境配置）






## 核心功能

通过 OpenDAL 集成，Curvine 提供了两个核心功能来访问外部存储：

### Mount 功能 - 挂载外部存储

`mount` 功能允许将外部存储系统挂载到 Curvine 的命名空间中，使外部存储看起来像 Curvine 文件系统的一部分。

#### S3 存储挂载示例

```bash
# 挂载 S3 存储桶到本地路径
bin/cv mount s3://flink/user /mnt/s3 \
    -c s3.endpoint_url=http://s3v2.dg-access-test.wanyol.com \
    -c s3.region_name=cn-south-1 \
    -c s3.credentials.access=*** \
    -c s3.credentials.secret=***
```

#### 其他存储类型挂载

```bash
# 挂载阿里云 OSS
bin/cv mount oss://my-bucket/data /mnt/oss \
    -c oss.endpoint_url=https://oss-cn-hangzhou.aliyuncs.com \
    -c oss.credentials.access_key_id=*** \
    -c oss.credentials.access_key_secret=***

# 挂载 HDFS (需要特殊环境配置)
bin/cv mount hdfs://namenode:9000/data /mnt/hdfs
```

### Load 功能 - 加载外部数据

`load` 功能允许直接从外部存储加载数据到 Curvine 中，支持单文件或批量加载。

#### 单文件加载示例

```bash
# 从 S3 加载单个文件
bin/cv load s3://flink/user/simple_test.txt \
    -c s3.endpoint_url=http://s3v2.dg-access-test.wanyol.com \
    -c s3.region_name=cn-south-1 \
    -c s3.credentials.access=*** \
    -c s3.credentials.secret=***
```

#### 批量加载示例

```bash
# 从 OSS 加载整个目录
bin/cv load oss://my-bucket/datasets/ \
    -c oss.endpoint_url=https://oss-cn-hangzhou.aliyuncs.com \
    -c oss.credentials.access_key_id=*** \
    -c oss.credentials.access_key_secret=***

# 从 HDFS 加载
bin/cv load hdfs://namenode:9000/data/logs/
```

### 配置参数说明

#### S3 兼容存储配置

| 参数 | 描述 | 示例 |
|------|------|------|
| `s3.endpoint_url` | S3 服务端点 | `http://s3.amazonaws.com` |
| `s3.region_name` | S3 区域 | `us-east-1` |
| `s3.credentials.access` | 访问密钥 | `***` |
| `s3.credentials.secret` | 密钥 | `***` |

#### OSS 配置

| 参数 | 描述 | 示例 |
|------|------|------|
| `oss.endpoint_url` | OSS 服务端点 | `https://oss-cn-hangzhou.aliyuncs.com` |
| `oss.credentials.access_key_id` | 访问密钥 ID | `***` |
| `oss.credentials.access_key_secret` | 访问密钥 | `***` |

#### HDFS 配置

| 参数 | 描述 | 示例 |
|------|------|------|
| `hdfs.name_node` | HDFS NameNode 地址 | `namenode:9000` |
| `hdfs.user` | HDFS 用户名 | `hadoop` |

### HDFS 环境要求

使用 HDFS 功能需要特殊的编译和运行环境配置：

#### 编译要求
使用 HDFS 功能需要使用特殊的编译命令开启 JNI 特性：

```bash
make build-hdfs
```

#### 运行环境要求
Worker 节点需要配置以下环境：

1. **Java 环境**（JDK 8 及以上版本）：
```bash
# 示例：JDK 21 (请根据实际安装的 JDK 版本调整路径)
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export LD_LIBRARY_PATH=$JAVA_HOME/lib/server:$LD_LIBRARY_PATH
```

2. **Hadoop 环境**（版本需与目标 HDFS 集群版本一致）：
```bash
# 示例：Hadoop 3.x (请根据实际安装的 Hadoop 版本调整路径)
export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin

# Hadoop 子系统环境变量
export HADOOP_HDFS_HOME=$HADOOP_HOME
export HADOOP_MAPRED_HOME=$HADOOP_HOME
export HADOOP_YARN_HOME=$HADOOP_HOME
export LD_LIBRARY_PATH=/opt/hadoop/lib/native:$LD_LIBRARY_PATH
```

**注意**：请确保所有 Worker 节点都配置了正确的 Java 和 Hadoop 环境变量，否则 HDFS 挂载和加载操作将会失败。

