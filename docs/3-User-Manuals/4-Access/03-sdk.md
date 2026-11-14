# SDK Access

Curvine provides multi-language SDKs so applications can access the Curvine filesystem via RPC (metadata from Master, block data from Workers) without using FUSE.

## Overview

| SDK | Crate / Package | Use Case |
|-----|-----------------|----------|
| **Rust** | `curvine-client` / `curvine-libsdk` | Native Rust applications, high performance |
| **Java** | `io.curvine.CurvineFileSystem` (Hadoop `FileSystem`, scheme `cv://`), plus `curvine-libsdk` Java SDK | Hadoop/Spark/Flink and other JVM applications |
| **Python** | `curvinefs` — `CurvineClient` (native) and `CurvineFileSystem` (fsspec) | ML/data pipelines, pandas/dask, scripts |

All SDKs require a running Curvine cluster (Master and Workers) and correct client configuration (e.g. `master_addrs` in `curvine-cluster.toml` or equivalent).

## Rust SDK

Use the `curvine-client` crate (or the Rust API exposed by `curvine-libsdk`) to create files, read/write data, and list directories programmatically. Configuration is typically loaded from `curvine-cluster.toml` or via environment variables.

For build and usage, see the [Development Guide](../../6-Contribute/01-development-guide.md) and the Curvine source repository (e.g. `curvine-client`, `curvine-libsdk`, and integration tests under `curvine-tests`).

## Java SDK

### Hadoop FileSystem

The Hadoop path uses the URI scheme **`cv://`** (not `fs.cv://`) and
`io.curvine.CurvineFileSystem`, so `FileSystem.get(URI.create("cv://default/path"), conf)`
returns a Curvine client.

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

All `filesystemConf` fields are read as `fs.cv.<field>`, where `<field>` is the
field name on `io.curvine.FilesystemConf` — `fs.cv.master_addrs`, not
`fs.cv.default.master_addrs`. Anything you can set in `curvine-cluster.toml`
under `[client]` can be overridden this way, and `-D` system properties win
over the configuration file.

Optional keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `fs.cv.transfer.enabled` | `false` | Route load/export through the Transfer service |
| `fs.cv.transfer.endpoints` | — | Transfer RPC endpoints |
| `fs.cv.proxy.enabled` | `true` | Enable the ZooKeeper-backed proxy switch |
| `fs.cv.proxy.zk.server` | empty | ZooKeeper servers for that switch |
| `fs.cv.proxy.zk.path` | `/curvine/proxy_enabled` | ZooKeeper znode holding the flag |
| `fs.cv.proxy.timeout` | `60s` | Timeout for the proxy lookup |
| `fs.cv.proxy.cluster.name` | `default` | Cluster name used by the proxy lookup |

For Spark, set the same keys with the `spark.hadoop.` prefix, e.g.
`--conf spark.hadoop.fs.cv.master_addrs=master1:8995`.

### Java API

`io.curvine.CurvineFileSystem` also works directly (open/create/append/stat/…),
and `CurvineLoadClient` / `CurvineTransferClient` / `CurvineMountClient` cover
load, transfer, and mount operations from JVM code without shelling out.

Compatible with Hadoop, Spark, Flink, and other JVM-based frameworks that support custom FileSystem implementations.

## Python SDK

`curvinefs` ships two entry points:

- **`CurvineClient`** — native bindings, explicit config, chunks you control:

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

- **`CurvineFileSystem`** — an fsspec implementation, registered as the
  `curvinefs` spec, so pandas, dask, and anything fsspec-aware can read the
  cluster directly:

  ```python
  import fsspec

  fs = fsspec.filesystem("curvinefs", config_path="conf/curvine-cluster.toml")
  print(fs.ls("/"))
  ```

Install from the source tree with `pip install ./curvine-libsdk/python`.

## Common Configuration

- **Master address**: Set `client.master_addrs` in the cluster config (e.g. `curvine-cluster.toml`) or pass the equivalent in each SDK (Java: `fs.cv.master_addrs`, Spark: `spark.hadoop.fs.cv.master_addrs`). Format: `host1:8995,host2:8995`.
- **Config file**: Most SDKs accept a config file path (e.g. `conf/curvine-cluster.toml`). The same file is used by the CLI (`cv`) and FUSE.

For UFS (unified file system) access, mount UFS paths with `cv mount`; then SDK operations on the corresponding Curvine paths will follow the same semantics as [Data Orchestration](../1-Key-Features/01-ufs.md).
