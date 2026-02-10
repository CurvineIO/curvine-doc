# SDK 访问

Curvine 提供多语言 SDK，使应用可通过 RPC 访问 Curvine 文件系统（元数据访问 Master，块数据访问 Worker），而无需使用 FUSE 或 S3 网关。

## 概览

| SDK | 包 / 模块 | 适用场景 |
|-----|-----------|----------|
| **Rust** | `curvine-client` / `curvine-libsdk` | 原生 Rust 应用、高性能场景 |
| **Java** | Hadoop 兼容 FileSystem（`fs.cv://`）、curvine-libsdk 的 Java SDK | Hadoop/Spark/Flink 等 JVM 应用 |
| **Python** | curvine-libsdk 的 Python 绑定 | 机器学习、数据流水线、脚本 |

所有 SDK 均需在 Curvine 集群（Master 与 Worker）已启动、且客户端配置正确（如 `curvine-cluster.toml` 中的 `master_addrs`）的前提下使用。

## Rust SDK

通过 `curvine-client`（或 `curvine-libsdk` 暴露的 Rust API）编程式创建文件、读写数据、列举目录。配置通常从 `curvine-cluster.toml` 或环境变量加载。

构建与用法参见 [开发指南](../../6-Contribute/01-development-guide.md) 及 Curvine 源码仓库（如 `curvine-client`、`curvine-libsdk` 及 `curvine-tests` 下的集成测试）。

## Java SDK

- **Hadoop FileSystem**：在 `core-site.xml` 或 `curvine-site.xml` 中配置 `fs.cv.impl` 与 `fs.cv.master_addrs`，使 `FileSystem.get(URI.create("curvine:///path"), conf)` 使用 Curvine。`fs.cv.master_addrs` 配置见 [部署准备](../../2-Deploy/2-Deploy-Curvine-Cluster/1-Preparation/03-deployment-setup.md#配置文件修改)。
- **Java API**：在不使用 Hadoop FileSystem 时，可使用 curvine-libsdk 的 Java SDK 直接通过 RPC 访问。

兼容 Hadoop、Spark、Flink 等支持自定义 FileSystem 的 JVM 框架。

## Python SDK

Python SDK（来自 curvine-libsdk）提供读写文件、列举目录等原生 API，适用于 ML 训练、数据预处理和自动化脚本。

安装与示例见 Curvine 源码仓库及 [开发指南](../../6-Contribute/01-development-guide.md)。

## 通用配置

- **Master 地址**：在集群配置（如 `curvine-cluster.toml`）中设置 `client.master_addrs`，或在各 SDK 中传入等价配置（如 Java 的 `fs.cv.master_addrs`）。格式：`host1:8995,host2:8995`。
- **配置文件**：多数 SDK 支持传入配置文件路径（如 `conf/curvine-cluster.toml`），与 CLI（`cv`）、FUSE、S3 网关共用同一配置。

若需 UFS（统一文件系统）访问，请先用 `cv mount` 挂载 UFS 路径；随后在对应 Curvine 路径上的 SDK 操作语义与 [数据编排](../1-Key-Features/01-ufs.md) 一致。
