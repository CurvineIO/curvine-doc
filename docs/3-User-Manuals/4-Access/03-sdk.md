# SDK Access

Curvine provides multi-language SDKs so applications can access the Curvine filesystem via RPC (metadata from Master, block data from Workers) without using FUSE or the S3 gateway.

## Overview

| SDK | Crate / Package | Use Case |
|-----|-----------------|----------|
| **Rust** | `curvine-client` / `curvine-libsdk` | Native Rust applications, high performance |
| **Java** | Hadoop-compatible FileSystem (`fs.cv://`), Java SDK from curvine-libsdk | Hadoop/Spark/Flink and other JVM applications |
| **Python** | Python bindings from curvine-libsdk | ML/data pipelines, scripts |

All SDKs require a running Curvine cluster (Master and Workers) and correct client configuration (e.g. `master_addrs` in `curvine-cluster.toml` or equivalent).

## Rust SDK

Use the `curvine-client` crate (or the Rust API exposed by `curvine-libsdk`) to create files, read/write data, and list directories programmatically. Configuration is typically loaded from `curvine-cluster.toml` or via environment variables.

For build and usage, see the [Development Guide](../../6-Contribute/01-development-guide.md) and the Curvine source repository (e.g. `curvine-client`, `curvine-libsdk`, and integration tests under `curvine-tests`).

## Java SDK

- **Hadoop FileSystem**: Configure `fs.cv.impl` and `fs.cv.master_addrs` in `core-site.xml` or `curvine-site.xml` so that `FileSystem.get(URI.create("curvine:///path"), conf)` uses Curvine. See [Deployment Preparation](../../2-Deploy/2-Deploy-Curvine-Cluster/1-Preparation/03-deployment-setup.md#configuration-file-modification) for `fs.cv.master_addrs`.
- **Java API**: Use the Curvine Java SDK from curvine-libsdk for direct RPC access when not using the Hadoop FileSystem interface.

Compatible with Hadoop, Spark, Flink, and other JVM-based frameworks that support custom FileSystem implementations.

## Python SDK

The Python SDK (from curvine-libsdk) provides a native API to read/write files and list directories on Curvine. Typical use cases include ML training, data preprocessing, and automation scripts.

For installation and examples, see the Curvine source repository and [Development Guide](../../6-Contribute/01-development-guide.md).

## Common Configuration

- **Master address**: Set `client.master_addrs` in the cluster config (e.g. `curvine-cluster.toml`) or pass the equivalent in each SDK (e.g. Java `fs.cv.master_addrs`). Format: `host1:8995,host2:8995`.
- **Config file**: Most SDKs accept a config file path (e.g. `conf/curvine-cluster.toml`). The same file is used by the CLI (`cv`), FUSE, and S3 gateway.

For UFS (unified file system) access, mount UFS paths with `cv mount`; then SDK operations on the corresponding Curvine paths will follow the same semantics as [Data Orchestration](../1-Key-Features/01-ufs.md).
