---
sidebar_position: 0
---

# 部署架构
在部署集群之前，您需要了解清楚curvine各个组件的作用，以及交互模式。下图展示了curvine的典型部署架构，自上而下分为三层：
- 应用层：包括 curvine-fuse、通过 SDK 接入的应用、CLI 运维工具等。详细内容请参考[接入方式](../../../3-User-Manuals/Access/fuse.md)。
- curvine集群服务层：由 curvine-master 和 curvine-worker 组成 curvine 集群。
- UFS集群作为底层存储后端通过[挂载](../../../3-User-Manuals/1-Key-Features/01-ufs.md#挂载)的方式接入到curvine集群上，比如S3、HDFS等集群

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart TD
    subgraph 客户端应用
        App1[应用程序1<br/>FUSE挂载]
        App2[应用程序2<br/>Hadoop HDFS API]
        App3[应用程序3<br/>S3 SDK]
    end

    subgraph 集群层
        subgraph Master集群
            MasterLeader[Master主节点<br/>Master处理器<br/>RocksDB]
            MasterFollower1[Master从节点<br/>日志加载器<br/>RocksDB]
            MasterFollower2[Master从节点<br/>日志加载器<br/>RocksDB]
            MasterLeader -. Raft复制 .-> MasterFollower1
            MasterLeader -. Raft复制 .-> MasterFollower2
        end

        subgraph Worker集群
            Worker1[Worker节点1<br/>内存: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            Worker2[Worker节点2<br/>内存: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            Worker3[Worker节点3<br/>内存: 64GB<br/>SSD: 1TB<br/>HDD: 10TB]
            WorkerN[Worker节点N<br/>...]
        end
    end

    subgraph 存储后端
        S3Bucket[S3存储桶]
        HDFSCluster[HDFS集群]
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
    Worker1 -. 缓存后端 .-> S3Bucket
    Worker2 -. 缓存后端 .-> HDFSCluster
    Worker3 -. 缓存后端 .-> S3Bucket
    WorkerN -. 缓存后端 .-> HDFSCluster

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
## 组件作用
**Master节点**：负责元数据管理、工作节点协调和负载均衡
- 维护文件系统元数据（目录结构、文件位置等）
- 管理Worker节点注册和健康检查
- 处理客户端的元数据请求
- 使用Raft共识算法确保元数据一致性

**Worker节点**：负责数据存储和处理 
- 存储实际数据块（支持内存、SSD、HDD多级缓存）
- 处理数据读写请求
- 定期向Master发送心跳
- 支持多副本数据存储

**FUSE接口**：提供POSIX文件系统接口，将分布式缓存挂载为本地文件系统

**S3 Gateway**：提供S3兼容的对象存储接口，支持S3 API

**客户端库**：提供多语言API，通过RPC与Master节和Worker节点通信

## curvine master, curvine worker 和 curvine fuse 的关系
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph 客户端层
    App[应用程序<br/>ls,cat,cp]
    fuse[curvine-fuse<br/>FUSE 守护进程]
    App -- POSIX 系统调用 --> fuse
    end
    subgraph 服务端
    master[curvine-master<br/>元数据管理]
    worker[curvine-worker<br/>数据存储]
    master -- 协调 --> worker
    end
    fuse -- RPC 通信 --> master
    fuse -- 数据读写 --> worker

    %% Styles
    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef fuseStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef masterStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef workerStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    
    class App appStyle
    class fuse fuseStyle
    class master masterStyle
    class worker workerStyle
```
## curvine fuse 使用场景
当需要让现有应用程序无需修改即可访问 Curvine 分布式缓存时，使用 FUSE 可以将 Curvine 挂载为本地文件系统。
- 默认挂载点
    - /curvine-fuse
    - /var/lib/curvine-fuse （Kubernetes 环境）
