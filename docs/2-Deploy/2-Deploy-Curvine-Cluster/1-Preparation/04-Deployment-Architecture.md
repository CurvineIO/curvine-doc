---
sidebar_position: 4
---

# Deployment Architecture

```mermaid
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
```

## Component Roles

**Master Node**: Responsible for metadata management, worker node coordination, and load balancing
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

```mermaid
flowchart LR
    subgraph Client_Layer
        App[Applications<br/>ls,cat,cp]
        fuse[curvine-fuse<br/>FUSE Daemon]
        App -- POSIX System Calls --> fuse
    end

    subgraph Sever_Side
        master[curvine-master<br/>Metadata Management]
        worker[curvine-worker<br/>Data Storage]
        master -- Coordination --> worker
    end

    fuse -- RPC Communication  --> master
    fuse -- Data Read/Write  --> worker
```

## curvine fuse Use Cases

When you need to enable existing applications to access Curvine distributed cache without modification, FUSE can be used to mount Curvine as a local file system.

- Default mount points
    - /curvine-fuse
    - /var/lib/curvine-fuse (Kubernetes environment)