# SDK 访问

Curvine 提供多语言 SDK，使应用可通过 RPC 访问 Curvine 文件系统（元数据访问 Master，块数据访问 Worker），而无需使用 FUSE。

## 概览

| SDK | 包 / 模块 | 适用场景 |
|-----|-----------|----------|
| **Rust** | `curvine-client` / `curvine-libsdk` | 原生 Rust 应用、高性能场景 |
| **Java** | `io.curvine.CurvineFileSystem`（Hadoop `FileSystem`，scheme 为 `cv://`），以及 `curvine-libsdk` 的 Java SDK | Hadoop/Spark/Flink 等 JVM 应用 |
| **Python** | `curvinefs` —— `CurvineClient`（原生）与 `CurvineFileSystem`（fsspec） | 机器学习、数据流水线、pandas/dask、脚本 |

所有 SDK 均需在 Curvine 集群（Master 与 Worker）已启动、且客户端配置正确（如 `curvine-cluster.toml` 中的 `master_addrs`）的前提下使用。

## Rust SDK

通过 `curvine-client`（或 `curvine-libsdk` 暴露的 Rust API）编程式创建文件、读写数据、列举目录。配置通常从 `curvine-cluster.toml` 或环境变量加载。

构建与用法参见 [开发指南](../../6-Contribute/01-development-guide.md) 及 Curvine 源码仓库（如 `curvine-client`、`curvine-libsdk` 及 `curvine-tests` 下的集成测试）。

## Java SDK

### Hadoop FileSystem

Hadoop 路径使用的 URI scheme 是 **`cv://`**（不是 `fs.cv://`），实现类是 `io.curvine.CurvineFileSystem`，因此 `FileSystem.get(URI.create("cv://default/path"), conf)` 会返回 Curvine 客户端。

```xml
<property>
  <name>fs.defaultFS</name>
  <value>cv://default</value>
</property>
<property>
  <name>fs.cv.impl</name>
  <value>io.curvine.CurvineFileSystem</value>
</property>
<property>
  <name>fs.cv.master_addrs</name>
  <value>master1:8995,master2:8995,master3:8995</value>
</property>
```

`FilesystemConf` 的每个字段都按 `fs.cv.<字段名>` 读取——是 `fs.cv.master_addrs`，不是 `fs.cv.default.master_addrs`。`curvine-cluster.toml` 中 `[client]` 下的配置都可以用这种方式覆盖，且 `-D` 系统属性优先级高于配置文件。

可选键：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `fs.cv.transfer.enabled` | `false` | 将 load/export 路由到 Transfer 服务 |
| `fs.cv.transfer.endpoints` | — | Transfer RPC 地址 |
| `fs.cv.proxy.enabled` | `true` | 启用基于 ZooKeeper 的 proxy 开关 |
| `fs.cv.proxy.zk.server` | 空 | 该开关使用的 ZooKeeper 地址 |
| `fs.cv.proxy.zk.path` | `/curvine/proxy_enabled` | 存放开关状态的 znode |
| `fs.cv.proxy.timeout` | `60s` | proxy 查询超时 |
| `fs.cv.proxy.cluster.name` | `default` | proxy 查询使用的集群名 |

Spark 中使用时加上 `spark.hadoop.` 前缀，例如
`--conf spark.hadoop.fs.cv.master_addrs=master1:8995`。

### Java API

`io.curvine.CurvineFileSystem` 也可以直接使用（open/create/append/stat 等）；
`CurvineLoadClient`、`CurvineTransferClient`、`CurvineMountClient` 可在 JVM 代码中直接完成
load、transfer、mount 操作，无需调用 shell。

兼容 Hadoop、Spark、Flink 等支持自定义 FileSystem 的 JVM 框架。

## Python SDK

`curvinefs` 提供两个入口：

- **`CurvineClient`**——原生绑定，配置显式、chunk 大小可控：

  ```python
  from curvinefs import CurvineClient

  client = CurvineClient(
      config_path="conf/curvine-cluster.toml",
      write_chunk_num=4,
      write_chunk_size=1024 * 1024,
  )
  writer = client.create("/data/out.bin", overwrite=True)
  writer.write(b"hello curvine")
  writer.close()

  reader = client.open("/data/out.bin")
  print(reader.read(0, 64))
  ```

- **`CurvineFileSystem`**——fsspec 实现，注册为 `curvinefs` spec，因此 pandas、dask 等支持 fsspec 的库可以直接读取集群：

  ```python
  import fsspec

  fs = fsspec.filesystem("curvinefs", config_path="conf/curvine-cluster.toml")
  print(fs.ls("/"))
  ```

在源码树中安装：`pip install ./curvine-libsdk/python`。

## 通用配置

- **Master 地址**：在集群配置（如 `curvine-cluster.toml`）中设置 `client.master_addrs`，或在各 SDK 中传入等价配置（如 Java 的 `fs.cv.master_addrs`）。格式：`host1:8995,host2:8995`。
- **配置文件**：多数 SDK 支持传入配置文件路径（如 `conf/curvine-cluster.toml`），与 CLI（`cv`）、FUSE 共用同一配置。

若需 UFS（统一文件系统）访问，请先用 `cv mount` 挂载 UFS 路径；随后在对应 Curvine 路径上的 SDK 操作语义与 [数据编排](../1-Key-Features/01-ufs.md) 一致。
