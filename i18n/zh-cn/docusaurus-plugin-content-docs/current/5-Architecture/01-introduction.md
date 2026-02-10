---
sidebar_position: 1
---

# 基本架构

本文基于源码说明 Curvine 的核心组件与数据流：**Master**（元数据与 Raft）、**Worker**（块存储）、**Client**（读写路径）。

## 概述

Curvine 是分布式文件缓存层。**Master** 负责元数据与块调度；**Worker** 存储块数据并响应读写；**Client**（FUSE、SDK、CLI、S3 网关）向 Master 请求元数据、向 Worker 请求数据。元数据通过 **Raft** 复制以实现高可用。

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph Client_Layer["客户端层"]
        FUSE[FUSE]
        SDK[SDK / CLI]
        S3[S3 网关]
    end

    subgraph Master_Layer["Master (Raft 组)"]
        Leader[Leader<br/>元数据 · 日志]
        Follower[Follower(s)<br/>回放日志]
        Leader -. Raft .-> Follower
    end

    subgraph Worker_Layer["Workers"]
        W1[Worker 1<br/>块存储]
        W2[Worker 2<br/>块存储]
    end

    FUSE --> Leader
    SDK --> Leader
    S3 --> Leader
    FUSE --> W1
    SDK --> W2
    Leader --> W1
    Leader --> W2

    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef masterStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef workerStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    class FUSE,SDK,S3 appStyle
    class Leader,Follower masterStyle
    class W1,W2 workerStyle
```

---

## Master

Master 是控制面：维护文件系统元数据（目录树、文件 inode、块位置）、管理 Worker 注册、为写入分配块。为实现高可用，多个 Master 节点组成 **Raft 组**；只有 **Leader** 对外提供元数据写 RPC；**Follower** 通过回放日志与 Leader 状态保持一致。

### Leader（主 Master）

- **职责**：Raft Leader 是唯一接受元数据变更 RPC 的节点（创建文件、添加块、重命名、删除、挂载/卸载等）。
- **日志**：每次元数据变更都会落盘为 **journal 条目**（如 `Mkdir`、`CreateFile`、`AddBlock`、`CompleteFile`、`Rename`、`Delete`、`Mount`、`UnMount`）。Leader 将条目追加到 Raft 日志；提交后在内存目录树（`FsDir`）上应用。
- **组件**：`MasterHandler` 处理 RPC；`MasterFilesystem` 与 `FsDir` 维护目录/文件与块映射；`JournalWriter` 写日志；`WorkerManager` 管理 Worker 与块分布；`MountManager` 管理 UFS 挂载点。

### Standby Master（备 Master）

- **职责**：Raft Follower **不**处理元数据写 RPC。它们接收 Leader 已提交的日志条目并 **回放**，以保持元数据副本一致。
- **回放**：`JournalLoader` 将每条已提交的 `JournalEntry` 应用到本地 `FsDir`（如 `mkdir`、`create_file`、`add_block`、`complete_file`、`rename`、`delete`、`mount`、`unmount`），使备节点状态与 Leader 一致。
- **快照**：支持 Raft 快照；存在快照时可从快照恢复元数据，无需从头回放。

### Raft

- **存储**：元数据日志与 Raft 状态使用 **RocksDB**（`RocksLogStorage`）。Journal 作为应用负载承载在 Raft 日志条目中。
- **角色**：`MasterMonitor` 暴露当前节点是否为主：仅当 Raft 角色为 **Leader** 时 `is_active()` 为 true。客户端或上层应将元数据写请求路由到当前 Leader（例如通过集群配置或路由解析）。
- **故障转移**：Leader 宕机后，Raft 选举新 Leader；新 Leader 继续应用日志并对外提供元数据服务。通过日志回放或快照追齐的备节点可参与选举。

---

## Workers

Worker 负责 **块数据** 的存储与块读写 RPC。不保存文件系统元数据，只管理以块 ID 标识的块。

### 注册与心跳

- Worker 向 Master **注册**并周期性发送 **心跳**，携带存储信息（`HeartbeatStatus`：Start、Running、End）。Master 的 `WorkerManager` 维护 `WorkerMap` 与 `BlockMap`（块与 Worker 的对应关系）。
- Master 据此为写入 **分配块**（如通过 Worker 选择策略：随机、轮询、基于负载、本地等），并在读请求时返回块位置。

### 块存储

- 每个 Worker 运行 **BlockStore**，底层为 **BlockDataset**：块按集群与存储策略落在本地存储（内存、SSD、HDD）。
- **读路径**：Worker 的 `ReadHandler` 接收块读 RPC，打开块文件并返回数据（可选读前向、sendfile 等优化）。
- **写路径**：Worker 的写处理逻辑接收块写 RPC，将数据写入 BlockStore，并按请求完成或中止块。

### 复制（可选）

- Master 可运行 **块复制** 流程（`MasterReplicationManager`）：在需要多副本时，由 Master 协调将块数据从某一 Worker 复制到其他 Worker。复制可配置（如并发上限、开关）。

---

## Client

Client 指使用 Curvine 文件系统的任何一方：**FUSE**、**Rust/Java/Python SDK**、**CLI**（`cv`）或 **S3 网关**。它们都向 **Master** 要元数据、向 **Worker** 要块数据。

### 读路径

1. **元数据**：Client 向 Master 请求文件元数据与 **块位置**（哪些 Worker 持有哪些块 ID、偏移、长度）。Master 返回 `FileBlocks`（文件状态 + 块位置列表）。
2. **数据**：Client 通过块读 RPC 从对应 Worker 读取块数据。可配置 **并行读** 与 **读前向**（chunk 大小、slice 大小、读前向长度）。
3. **缓存命中**：若路径为 Curvine 原生文件（非 UFS 挂载），数据按上述方式从 Worker 读取。若路径在 **UFS 挂载** 下，则 [统一文件系统](../../3-User-Manuals/1-Key-Features/01-ufs.md) 与 [缓存行为](../../3-User-Manuals/1-Key-Features/02-cache.md) 生效：在缓存有效时从 Curvine 返回，未命中时从 UFS 读取（可配置 TTL 下的自动缓存）。

### 写路径

写行为由 **挂载写类型**（UFS 挂载）或原生 Curvine 路径决定：

1. **分配块**：Client 向 Master 申请新块。Master 选择 Worker（及副本），将块分配记入日志（如 `AddBlock`、`CompleteFile`），并返回块位置给 Client。
2. **写数据**：Client 通过块写 RPC 将数据发往指定 Worker。Worker 将数据持久化到 BlockStore。
3. **写类型**（UFS 挂载路径见 [数据编排 — 挂载模式](../../3-User-Manuals/1-Key-Features/01-ufs.md#挂载模式)）：
   - **Cache**：仅写入 Curvine（Worker），不写 UFS。
   - **Through**：仅写 UFS，绕过缓存。
   - **AsyncThrough**（默认）：先写 Curvine 后立即返回，再异步同步到 UFS。
   - **CacheThrough**：同步写入 Curvine 与 UFS 后返回。

原生 Curvine 路径（非 UFS）的写入直接落 Worker 并由 Master 记入日志；多副本由 Master/Worker 的复制逻辑在配置开启时处理。

---

## 小结

| 组件 | 职责 |
|------|------|
| **Master (Leader)** | 元数据（FsDir）、写日志、块分配、Worker 映射、挂载表；处理所有元数据 RPC。 |
| **Master (Follower)** | 回放 Raft 日志（JournalLoader）以同步 FsDir；不处理元数据写 RPC。 |
| **Raft** | 复制 journal 条目；Leader 选举与故障转移；RocksDB 日志存储。 |
| **Worker** | 块存储（BlockStore/BlockDataset）、块读写 RPC、向 Master 心跳。 |
| **Client** | 从 Master 获取元数据与块位置；从 Worker 读写块数据；UFS 挂载下按写类型与缓存/一致性策略执行。 |

部署拓扑与启动顺序见 [部署架构](../../2-Deploy/2-Deploy-Curvine-Cluster/0-Deployment-Architecture.md)。UFS 与缓存语义见 [数据编排](../../3-User-Manuals/1-Key-Features/01-ufs.md) 与 [缓存](../../3-User-Manuals/1-Key-Features/02-cache.md)。
