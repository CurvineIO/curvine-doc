本章节介绍 Curvine 的缓存策略以及如何缓存数据。

## 缓存策略

### 写入策略

写入策略控制文件位于 UFS 挂载点时的数据写入方式，按挂载配置（如 `cv mount ... --write-type <类型>`）。默认策略为 **AsyncThrough**。

| 策略 | CLI 取值 | 行为 | 适用场景 |
|------|----------|------|----------|
| Cache | `cache` | 仅写入 Curvine 缓存 | 临时数据、追求最大性能 |
| Through | `through` | 直接写 UFS，不经缓存 | 写一次、缓存无收益的场景 |
| CacheThrough | `cache_through` | 同步写入缓存和 UFS | 强一致性要求的数据共享 |
| AsyncThrough | `async_through`（默认） | 先写缓存，再异步同步到 UFS | 平衡性能与持久化 |

### 一致性策略

Curvine 提供两种策略，用于校验缓存数据与 UFS 的一致性（可按挂载点通过 `--consistency-strategy` 配置）：

| 策略 | 行为 |
|------|------|
| **None** | 不校验。信任缓存数据；过期项可由 TTL 清理。可能读到过期数据。 |
| **Always** | 每次读文件时校验：与 UFS 比较文件长度和最后修改时间（mtime）。一致则从缓存读；否则视为缓存失效。 |

当校验失败或缓存未命中时，会直接从 UFS 读取；若该挂载启用了自动缓存，可同时异步将数据加载到 Curvine。

## TTL机制

TTL是Curvine中用于自动管理缓存数据生命周期的核心机制，支持文件和目录的自动过期处理。

### 配置

**按挂载配置 TTL（推荐）**  
使用 `cv mount` 挂载 UFS 时，可为该挂载设置 TTL：

| 选项 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `--ttl-ms` | duration | `7d`（挂载默认） | 缓存数据过期时间 | `24h`、`7d`、`30d` |
| `--ttl-action` | enum | `delete`（挂载默认） | TTL 过期时的动作（见下表） | `none`、`delete`、`persist`、`evict`、`flush` |

**客户端默认值**  
在集群配置的 client 段（如 `curvine-cluster.toml`）中，可配置 `ttl_ms`（默认 `0`）和 `ttl_action`（默认 `none`），作为非挂载路径或创建文件时的默认值。

**Master 节点（TTL 检查器）**  
在集群配置的 `[master]` 段中，使用以下 TOML 键：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ttl_checker_interval` | duration | `1h` | TTL 检查器运行间隔 |
| `ttl_checker_retry_attempts` | u32 | `3` | TTL 操作失败时的最大重试次数 |
| `ttl_bucket_interval` | duration | `1h` | 批量处理过期 inode 的桶时间间隔 |
| `ttl_max_retry_duration` | duration | `30m` | 失败 TTL 操作的最大重试时长 |
| `ttl_retry_interval` | duration | `5s` | 重试间隔 |

### 动作类型

TTL 支持五种过期动作（取值：`none`、`delete`、`persist`、`evict`、`flush`）：

| 动作 | 说明 |
|------|------|
| **None** | 不执行操作；过期数据保留直至被显式删除或覆盖。 |
| **Delete** | 仅从 Curvine 删除文件或目录（不导出到 UFS）。 |
| **Persist** | 若 UFS 上不存在则导出（已存在则跳过）；保留在 Curvine 缓存中。 |
| **Evict** | 若 UFS 上不存在则导出（已存在则跳过）；然后从 Curvine 缓存中移除。 |
| **Flush** | 导出到 UFS（已存在则覆盖）；然后从 Curvine 缓存中移除。 |

### 执行流程

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    A[TTL检查器启动] --> B[获取过期桶列表]
    B --> C{是否有过期桶}
    C -->|是| D[处理每个过期桶]
    D --> E[执行TTL动作]
    E --> F[记录处理结果]
    C -->|否| G[跳过本次检查]

    classDef stepStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef decisionStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef endStyle fill:#48bb78,stroke:#276749,color:#fff,stroke-width:2px
    class A,B,D,E,F stepStyle
    class C decisionStyle
    class G endStyle
```

## 缓存方式

### 自动缓存

当某挂载配置了**非零 TTL**（例如 `cv mount s3://bucket/prefix /path --ttl-ms 7d`）时，即启用该挂载的自动缓存。在该挂载下**首次读取**某个 UFS 文件（缓存未命中）时，Curvine 会提交一个异步加载任务，将数据拉取到 Curvine；本次读取由 UFS 直接返回，任务在后台执行。

在日志中可看到类似输出：

```plain
Submit async cache successfully for s3://bucket/cache/test.log, job res CacheJobResult { job_id: 7c00853f-13c8-43c1-8b3f-44740750b5a0, target_path: /s3/cache/test.log }    
```
可用 job_id 查询缓存任务状态：
```plain
bin/cv load-status 7c00853f-13c8-43c1-8b3f-44740750b5a0
```
### 主动缓存

可以是load命令主动加载 UFS 数据到 Curvine，示例如下：

```plain
bin/cv load s3://bucket/cache/test.log
```
自动缓存与主动缓存可同时使用；主动缓存可缩短该文件首次读取的等待时间。

:::tip
加载数据前，须先将 UFS 挂载到 Curvine（`cv mount`）。  
自动缓存与主动缓存均使用固定缓存路径，与 UFS 目录结构一致。
:::

