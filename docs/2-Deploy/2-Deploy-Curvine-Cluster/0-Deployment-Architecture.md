---
sidebar_position: 0
---

# Deployment Architecture

Before deploying a cluster, you need to understand the roles of each Curvine component and their interaction patterns. The following diagram shows the typical deployment architecture of Curvine, divided into three layers from top to bottom:
- **Application Layer**: Includes curvine-fuse, applications accessed via SDK, CLI management tools, etc. For details, refer to [Access Methods](../../3-User-Manuals/4-Access/01-fuse.md).
- **Curvine Cluster Service Layer**: Consists of **curvine-master** (can be multiple nodes for HA, forming a Raft group) and **curvine-worker** nodes forming the Curvine cluster.
- **UFS Cluster**: As the underlying storage backend, connected to the Curvine cluster through [mounting](../../3-User-Manuals/1-Key-Features/01-ufs.md#mounting), such as S3, HDFS, and other clusters.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart TD
    subgraph Client_Applications
        App1[Application 1<br/>FUSE mount]
        App2[Application 2<br/>Hadoop HDFS API]
        App3[Application 3<br/>S3 SDK]
    end

    subgraph Cluster_Layer
        subgraph Master_Cluster
            MasterLeader[Master Leader<br/>MasterHandler<br/>RocksDB]
            MasterFollower1[Master Follower<br/>JournalLoader<br/>RocksDB]
            MasterFollower2[Master Follower<br/>JournalLoader<br/>RocksDB]
            MasterLeader -. Raft replication .-> MasterFollower1
            MasterLeader -. Raft replication .-> MasterFollower2
        end

        subgraph Worker_Cluster
            Worker1[Worker 1<br/>MEM: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            Worker2[Worker 2<br/>MEM: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            Worker3[Worker 3<br/>MEM: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            WorkerN[Worker N<br/>...]
        end
    end

    subgraph Storage_Backend
        S3Bucket[S3 Bucket]
        HDFSCluster[HDFS Cluster]
    end

    App1 --> MasterLeader
    App1 --> Worker1
    App2 --> MasterLeader
    App2 --> Worker2
    App3 --> MasterLeader
    App3 --> Worker3

    MasterLeader --> Worker1
    MasterLeader --> Worker2
    MasterLeader --> Worker3
    MasterLeader --> WorkerN

    Worker1 -. Cache backend .-> S3Bucket
    Worker2 -. Cache backend .-> HDFSCluster
    Worker3 -. Cache backend .-> S3Bucket
    WorkerN -. Cache backend .-> HDFSCluster

    %% Styles
    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef masterStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef workerStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    classDef storageStyle fill:#fc8181,stroke:#c53030,color:#1a202c,stroke-width:2px
    
    class App1,App2,App3 appStyle
    class MasterLeader,MasterFollower1,MasterFollower2 masterStyle
    class Worker1,Worker2,Worker3,WorkerN workerStyle
    class S3Bucket,HDFSCluster storageStyle
```

## Component Roles

**Master nodes** (can be multiple for high availability): Responsible for metadata management, worker node coordination, and load balancing
- Deployed as a Raft group (one leader, multiple followers); clients talk to the current leader
- Maintains file system metadata (directory structure, file locations, etc.)
- Manages worker node registration and health checks
- Handles client metadata requests
- Uses Raft consensus algorithm to ensure metadata consistency

**Worker Node**: Responsible for data storage and processing
- Stores actual data blocks (supports memory, SSD, HDD multi-level caching)
- Handles data read/write requests
- Periodically sends heartbeats to Master
- Supports multi-replica data storage

**FUSE Interface**: Provides POSIX file system interface, mounting distributed cache as local file system

**S3 Gateway**: Provides S3-compatible object storage interface, supporting S3 API

**Client Library**: Provides multi-language APIs, communicating with Master and Worker nodes via RPC

## Relationship between curvine master, curvine worker, and curvine fuse

Master is deployed as **multiple nodes** (Raft group). Clients and FUSE communicate with the current master leader; the diagram below shows the logical roles.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph Client_Layer
        App[Applications<br/>ls,cat,cp]
        fuse[curvine-fuse<br/>FUSE Daemon]
        App -- POSIX System Calls --> fuse
    end

    subgraph Server_Side["Server side (Master can be multiple nodes)"]
        subgraph Master_Group["curvine-master (Raft group)"]
            M1[Master 1]
            M2[Master 2]
            MN[Master N]
        end
        worker[curvine-worker<br/>Data Storage]
        M1 -- Coordination --> worker
    end

    fuse -- RPC --> M1
    fuse -- Data Read/Write  --> worker

    %% Styles
    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef fuseStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef masterStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef workerStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    
    class App appStyle
    class fuse fuseStyle
    class M1,M2,MN masterStyle
    class worker workerStyle
```

## curvine fuse Use Cases

When you need to enable existing applications to access Curvine distributed cache without modification, FUSE can be used to mount Curvine as a local file system.

- Default mount points
    - /curvine-fuse