# OpenDAL Ecosystem Integration

## Overview

Curvine integrates with [OpenDAL](https://opendal.apache.org/) (Open Data Access Layer) at its core, providing powerful storage ecosystem support. This integration enables Curvine to work seamlessly with various storage backends while maintaining a unified interface.

## What is OpenDAL?

OpenDAL is a data access layer that provides unified APIs to access various storage services. It serves as an abstraction layer between applications and storage systems, offering:

- **Unified Interface**: Consistent APIs across different storage backends
- **Multi-Storage Support**: Support for object storage, filesystems, databases, and more
- **High Performance**: Optimized data access paths and caching mechanisms
- **Extensibility**: Easy addition of new storage backend support
- **Reliability**: Built-in retry mechanisms and error handling

## Supported Storage Backends

Through OpenDAL integration, Curvine currently supports the following storage services:

### Object Storage
- **Amazon S3**: AWS object storage service, supports `s3://` and `s3a://` protocols
- **Alibaba Cloud OSS**: Alibaba Cloud object storage service, supports `oss://` protocol
- **Tencent Cloud COS**: Tencent Cloud object storage, supports `cos://` protocol
- **Azure Blob Storage**: Microsoft Azure object storage, supports `azblob://` protocol
- **Google Cloud Storage**: Google cloud storage, supports `gcs://` and `gs://` protocols

### Distributed File Systems
- **HDFS**: Hadoop Distributed File System, supports `hdfs://` protocol (requires special environment setup)




## Core Features

Through OpenDAL integration, Curvine provides two core features for accessing external storage:

### Mount Feature - Mounting External Storage

The `mount` feature allows mounting external storage systems into Curvine's namespace, making external storage appear as part of the Curvine filesystem.

#### S3 Storage Mount Examples

```bash
# Mount S3 bucket to local path
./dist/bin/cv mount s3://flink/user /mnt/s3 \
    -c s3.endpoint_url=http://s3v2.dg-access-test.wanyol.com \
    -c s3.region_name=cn-south-1 \
    -c s3.credentials.access=*** \
    -c s3.credentials.secret=***
```

#### Other Storage Type Mounts

```bash
# Mount Alibaba Cloud OSS
./dist/bin/cv mount oss://my-bucket/data /mnt/oss \
    -c oss.endpoint_url=https://oss-cn-hangzhou.aliyuncs.com \
    -c oss.credentials.access_key_id=*** \
    -c oss.credentials.access_key_secret=***

# Mount HDFS (requires special environment setup)
./dist/bin/cv mount hdfs://namenode:9000/data /mnt/hdfs
```

### Load Feature - Loading External Data

The `load` feature allows directly loading data from external storage into Curvine, supporting single file or batch loading.

#### Single File Load Examples

```bash
# Load single file from S3
./dist/bin/cv load s3://flink/user/simple_test.txt \
    -c s3.endpoint_url=http://s3v2.dg-access-test.wanyol.com \
    -c s3.region_name=cn-south-1 \
    -c s3.credentials.access=*** \
    -c s3.credentials.secret=***
```

#### Batch Load Examples

```bash
# Load entire directory from OSS
./dist/bin/cv load oss://my-bucket/datasets/ \
    -c oss.endpoint_url=https://oss-cn-hangzhou.aliyuncs.com \
    -c oss.credentials.access_key_id=*** \
    -c oss.credentials.access_key_secret=***

# Load from HDFS
./dist/bin/cv load hdfs://namenode:9000/data/logs/
```

### Configuration Parameters

#### S3-Compatible Storage Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `s3.endpoint_url` | S3 service endpoint | `http://s3.amazonaws.com` |
| `s3.region_name` | S3 region | `us-east-1` |
| `s3.credentials.access` | Access key | `***` |
| `s3.credentials.secret` | Secret key | `***` |

#### OSS Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `oss.endpoint_url` | OSS service endpoint | `https://oss-cn-hangzhou.aliyuncs.com` |
| `oss.credentials.access_key_id` | Access key ID | `***` |
| `oss.credentials.access_key_secret` | Access key secret | `***` |

#### HDFS Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `hdfs.name_node` | HDFS NameNode address | `namenode:9000` |
| `hdfs.user` | HDFS username | `hadoop` |

### HDFS Environment Requirements

Using HDFS functionality requires special compilation and runtime environment configuration:

#### Compilation Requirements
To enable HDFS functionality, use the special build command with JNI features:

```bash
make build-hdfs
```

#### Runtime Environment Requirements
Worker nodes need to configure the following environment:

1. **Java Environment** (JDK 8 or above):
```bash
# Example: JDK 21 (adjust path according to your actual JDK version)
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export LD_LIBRARY_PATH=$JAVA_HOME/lib/server:$LD_LIBRARY_PATH
```

2. **Hadoop Environment** (version should match target HDFS cluster version):
```bash
# Example: Hadoop 3.x (adjust path according to your actual Hadoop version)
export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin

# Hadoop subsystem environment variables
export HADOOP_HDFS_HOME=$HADOOP_HOME
export HADOOP_MAPRED_HOME=$HADOOP_HOME
export HADOOP_YARN_HOME=$HADOOP_HOME
export LD_LIBRARY_PATH=/opt/hadoop/lib/native:$LD_LIBRARY_PATH
```

**Note**: Ensure all Worker nodes have the correct Java and Hadoop environment variables configured, otherwise HDFS mount and load operations will fail.


