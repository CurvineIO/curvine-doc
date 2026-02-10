---
sidebar_position: 1
---

# Basic Architecture

This document describes the core components and data flow of Curvine as implemented in the codebase: **Master** (metadata and Raft), **Worker** (block storage), and **Client** (read/write paths).

## Overview

Curvine is a distributed file cache layer. The **Master** manages metadata and block placement; **Workers** store block data and serve read/write; **Clients** (FUSE, SDK, CLI, S3 gateway) talk to Master for metadata and to Workers for data. Metadata is replicated via **Raft** for high availability.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph Client_Layer["Client layer"]
        FUSE[FUSE]
        SDK[SDK / CLI]
        S3[S3 Gateway]
    end

    subgraph Master_Layer["Master (Raft group)"]
        Leader[Leader<br/>Metadata · Journal]
        Follower[Follower(s)<br/>Replay journal]
        Leader -. Raft .-> Follower
    end

    subgraph Worker_Layer["Workers"]
        W1[Worker 1<br/>Block storage]
        W2[Worker 2<br/>Block storage]
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

The Master is the control plane: it holds the file system metadata (directory tree, file inodes, block locations), manages Worker registration, and allocates blocks for writes. For high availability, multiple Master nodes form a **Raft group**; only the **leader** serves metadata write RPC; **followers** replay the journal to keep state in sync.

### Leader (Active Master)

- **Role**: The Raft leader is the only node that accepts metadata-mutating RPC (create file, add block, rename, delete, mount/umount, etc.).
- **Journal**: Every metadata change is persisted as a **journal entry** (e.g. `Mkdir`, `CreateFile`, `AddBlock`, `CompleteFile`, `Rename`, `Delete`, `Mount`, `UnMount`). The leader appends entries to the Raft log; once committed, they are applied to the in-memory metadata tree (`FsDir`).
- **Components**: `MasterHandler` serves RPC; `MasterFilesystem` and `FsDir` hold the directory/file and block mapping; `JournalWriter` writes entries; `WorkerManager` tracks Workers and block placement; `MountManager` manages UFS mount points.

### Standby Master (Follower)

- **Role**: Raft followers do **not** serve metadata write RPC. They receive committed log entries from the leader and **replay** them to keep a copy of the metadata.
- **Replay**: `JournalLoader` applies each committed `JournalEntry` to the local `FsDir` (e.g. `mkdir`, `create_file`, `add_block`, `complete_file`, `rename`, `delete`, `mount`, `unmount`). This keeps standby state identical to the leader.
- **Snapshot**: The system supports Raft snapshots; when a snapshot exists, the metadata can be restored from it instead of replaying from the beginning.

### Raft

- **Storage**: Metadata log and Raft state use **RocksDB** (`RocksLogStorage`). The journal is the application payload carried in Raft log entries.
- **Role detection**: `MasterMonitor` exposes whether the current node is active: `is_active()` is true only when the Raft role is **Leader**. The client or upper layer should route metadata write requests to the current leader (e.g. by resolving the leader from the cluster config or a router).
- **Failover**: When the leader dies, Raft elects a new leader; the new leader continues applying the journal and serving metadata. Standby nodes that catch up via log replay or snapshot become eligible for leadership.

---

## Workers

Workers store **block data** and serve block read/write RPC. They do not hold file system metadata; they only manage blocks identified by block ID.

### Registration and heartbeat

- Workers **register** with the Master and send periodic **heartbeats** with storage information (`HeartbeatStatus`: Start, Running, End). The Master’s `WorkerManager` maintains a `WorkerMap` and `BlockMap` (which blocks are on which worker).
- The Master uses this information to **allocate blocks** for new writes (e.g. via worker selection policies: random, round-robin, load-based, local) and to return block locations for reads.

### Block storage

- Each Worker runs a **BlockStore** backed by a **BlockDataset**: blocks are stored on local storage (memory, SSD, HDD) according to cluster and storage policy.
- **Read path**: The Worker’s `ReadHandler` receives block-read RPCs, opens the block file, and returns data (with optional read-ahead and sendfile-style optimizations).
- **Write path**: The Worker’s write handlers accept block write RPCs, write data to the block store, and finalize or abort blocks as requested by the client/Master.

### Replication (optional)

- The Master can run a **block replication** flow (`MasterReplicationManager`): when multiple replicas are required, the Master coordinates copying block data from one Worker to others. Replication is configurable (e.g. concurrency limit, on/off).

---

## Client

The client is any component that uses the Curvine file system: **FUSE**, **Rust/Java/Python SDK**, **CLI** (`cv`), or **S3 gateway**. It always talks to the **Master** for metadata and to **Workers** for block data.

### Read path

1. **Metadata**: The client asks the Master for file metadata and **block locations** (which Worker(s) hold which block IDs, offsets, lengths). The Master returns `FileBlocks` (file status + list of block locations).
2. **Data**: The client reads block data from the corresponding Worker(s) via block-read RPC. It may use **parallel reads** and **read-ahead** (configurable chunk size, slice size, read-ahead length).
3. **Cache hit**: If the path is under a Curvine-native file (not a UFS mount), data is read from Workers as above. For paths under a **UFS mount**, the [unified file system](../../3-User-Manuals/1-Key-Features/01-ufs.md) and [cache behavior](../../3-User-Manuals/1-Key-Features/02-cache.md) apply: the client may serve from Curvine cache when valid, or from UFS on cache miss (with optional automatic caching when TTL is set).

### Write path

Write behavior depends on the **mount write type** (for UFS mounts) or the native Curvine path:

1. **Allocate blocks**: The client requests new blocks from the Master. The Master chooses Worker(s) (and replicas if needed), records block allocations in the journal (e.g. `AddBlock`, `CompleteFile`), and returns block locations to the client.
2. **Write data**: The client sends block data to the assigned Worker(s) via block-write RPC. The Worker persists data to its BlockStore.
3. **Write types** (for UFS-mounted paths, see [Data Orchestration — Mount Modes](../../3-User-Manuals/1-Key-Features/01-ufs.md#mount-modes)):
   - **Cache**: Data is written only to Curvine (Workers); not written to UFS.
   - **Through**: Data is written only to UFS; cache is bypassed.
   - **AsyncThrough** (default): Data is written to Curvine first (return immediately), then asynchronously synced to UFS.
   - **CacheThrough**: Data is written synchronously to both Curvine and UFS before returning.

For native Curvine paths (non-UFS), writes go to Workers and are recorded in the Master journal; replication is handled by the Master/Worker replication logic when configured.

---

## Summary

| Component | Responsibility |
|-----------|----------------|
| **Master (leader)** | Metadata (FsDir), journal write, block allocation, Worker map, mount table; serves all metadata RPC. |
| **Master (follower)** | Replay Raft journal (JournalLoader) to keep FsDir in sync; no metadata write RPC. |
| **Raft** | Replicate journal entries; leader election and failover; RocksDB log storage. |
| **Worker** | Block storage (BlockStore/BlockDataset), block read/write RPC, heartbeat to Master. |
| **Client** | Get metadata and block locations from Master; read/write block data from/to Workers; for UFS mounts, apply write type and cache/consistency behavior. |

For deployment topology and startup order, see [Deployment Architecture](../../2-Deploy/2-Deploy-Curvine-Cluster/0-Deployment-Architecture.md). For UFS and cache semantics, see [Data Orchestration](../../3-User-Manuals/1-Key-Features/01-ufs.md) and [Cache](../../3-User-Manuals/1-Key-Features/02-cache.md).
