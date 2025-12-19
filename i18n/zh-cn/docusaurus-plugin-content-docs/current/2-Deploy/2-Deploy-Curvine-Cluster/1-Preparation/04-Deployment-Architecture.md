---
sidebar_position: 4
---

# 部署架构
```mermaid
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
```
## curvine fuse 使用场景
当需要让现有应用程序无需修改即可访问 Curvine 分布式缓存时，使用 FUSE 可以将 Curvine 挂载为本地文件系统。
- 默认挂载点
    - /curvine-fuse
    - /var/lib/curvine-fuse （Kubernetes 环境）
