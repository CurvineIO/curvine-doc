# Curvine CSI 架构详解

`curvine-csi` 基于fuse实现，在csi-node中通过fuse挂载的方式和curvine集群建立关联。 


## 架构
下图为curvine-csi的整体设计架构， **如果仅需要使用csi，可以略过本章**， 直接参考[K8S CSI驱动](Setup) 这一章节。


curvine-csi的主要服务包含两个
| 组件 | 职责 |
|------|------|
| CSI Node Service | 处理 CSI gRPC 调用，管理 MountPod 生命周期 |
| MountPod Controller | 创建/删除/监控 MountPod |


## 挂载方式
大多csi的挂载管理是直接在csi-node中实现，通过将远程存储挂载到hosts上，并最终bind mount到pod容器中。  curvine-csi基于fuse实现，当csi组件重启之后，fuse进程会中断， 为了避免csi drvier的升级或者重启等场景导致fuse终端，curvine-csi 支持standalone和 embedded 两种挂载模式。

- StandAlone： 将 FUSE进程从 csi-node pod 中解耦，放入独立的Pod 运行
- Embedded： FUSE进程在csi-node plugin的pod中进行挂历

### Standalone

默认模式。Helm 安装时使用以下参数：

```bash
helm install curvine-csi ./curvine-csi \
  --set mountMode=standalone
```

架构示意图：

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%flowchart TB
    subgraph K8sNode["🖥️ Kubernetes Node"]
        subgraph CSIPod["CSI Node Pod"]
            CSIDriver["CSI Driver<br/>gRPC Handler"]
            MountPodCtrl["MountPod<br/>Controller"]
        end
        
        subgraph MountPods["MountPod Layer"]
            subgraph MP1["MountPod-1 (privileged)"]
                FUSE1["curvine-fuse<br/>Process"]
                MNT1["/mnt/curvine/<br/>cluster-A"]
            end
            
            subgraph MP2["MountPod-2 (privileged)"]
                FUSE2["curvine-fuse<br/>Process"]
                MNT2["/mnt/curvine/<br/>cluster-B"]
            end
        end
        
        subgraph HostFS["Host Filesystem"]
            PluginPath["/var/lib/kubelet/plugins/curvine/"]
            ClusterA["cluster-A/fuse-mount/"]
            ClusterB["cluster-B/fuse-mount/"]
        end
        
        subgraph AppPods["Application Pods"]
            App1["App Pod 1"]
            App2["App Pod 2"]
            VolPath1["/var/lib/kubelet/pods/xxx/<br/>volumes/.../mount"]
            VolPath2["/var/lib/kubelet/pods/yyy/<br/>volumes/.../mount"]
        end
        
        subgraph External["Curvine Cluster"]
            CurvineClusterA[("Curvine<br/>Cluster A")]
            CurvineClusterB[("Curvine<br/>Cluster B")]
        end
    end
    
    %% CSI Pod manages MountPods
    CSIDriver --> MountPodCtrl
    MountPodCtrl -->|"Create/Delete"| MP1
    MountPodCtrl -->|"Create/Delete"| MP2
    
    %% FUSE processes connect to clusters
    FUSE1 -.->|"gRPC"| CurvineClusterA
    FUSE2 -.->|"gRPC"| CurvineClusterB
    
    %% FUSE mounts to host paths
    FUSE1 --> MNT1
    MNT1 -->|"Bidirectional<br/>Mount Propagation"| ClusterA
    
    FUSE2 --> MNT2
    MNT2 -->|"Bidirectional<br/>Mount Propagation"| ClusterB
    
    %% Host paths organization
    PluginPath --> ClusterA
    PluginPath --> ClusterB
    
    %% App pods bind mount
    ClusterA -->|"bind mount<br/>+ subpath"| VolPath1
    ClusterB -->|"bind mount<br/>+ subpath"| VolPath2
    
    VolPath1 --> App1
    VolPath2 --> App2

    %% Styles - colors adjusted for light background
    classDef csiStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef mountPodStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    classDef fuseStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef hostStyle fill:#48bb78,stroke:#276749,color:#fff,stroke-width:2px
    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef storageStyle fill:#fc8181,stroke:#c53030,color:#1a202c,stroke-width:2px
    classDef pathStyle fill:#cbd5e0,stroke:#718096,color:#1a202c,stroke-width:1px
    
    class CSIDriver,MountPodCtrl csiStyle
    class MP1,MP2 mountPodStyle
    class FUSE1,FUSE2 fuseStyle
    class PluginPath,ClusterA,ClusterB hostStyle
    class App1,App2 appStyle
    class CurvineClusterA,CurvineClusterB storageStyle
    class MNT1,MNT2,VolPath1,VolPath2 pathStyle
```


### Embedded

Helm 安装时使用以下参数：

```bash
helm install curvine-csi ./curvine-csi \
  --set mountMode=embedded \
  --set node.resources.requests.memory=2Gi \
  --set node.resources.requests.cpu=1000m \
  --set node.resources.limits.memory=4Gi \
  --set node.resources.limits.cpu=2000m
```

架构示意图：

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%flowchart TB
    subgraph K8sNode["🖥️ Kubernetes Node"]
        subgraph CSIPod["CSI Node Pod (privileged)"]
            CSIDriver["CSI Driver<br/>gRPC Handler"]
            FUSE1["curvine-fuse<br/>Process"]
            FUSE2["curvine-fuse<br/>Process"]
            MNT1["/mnt/curvine/<br/>cluster-A"]
            MNT2["/mnt/curvine/<br/>cluster-B"]
        end
        
        subgraph HostFS["Host Filesystem"]
            PluginPath["/var/lib/kubelet/plugins/curvine/"]
            ClusterA["cluster-A/fuse-mount/"]
            ClusterB["cluster-B/fuse-mount/"]
        end
        
        subgraph AppPods["Application Pods"]
            App1["App Pod 1"]
            App2["App Pod 2"]
            VolPath1["/var/lib/kubelet/pods/xxx/<br/>volumes/.../mount"]
            VolPath2["/var/lib/kubelet/pods/yyy/<br/>volumes/.../mount"]
        end
        
        subgraph External["Curvine Cluster"]
            CurvineClusterA[("Curvine<br/>Cluster A")]
            CurvineClusterB[("Curvine<br/>Cluster B")]
        end
    end
    
    %% FUSE processes connect to clusters
    FUSE1 -.->|"gRPC"| CurvineClusterA
    FUSE2 -.->|"gRPC"| CurvineClusterB
    
    %% FUSE mounts to host paths
    FUSE1 --> MNT1
    MNT1 -->|"Bidirectional<br/>Mount Propagation"| ClusterA
    
    FUSE2 --> MNT2
    MNT2 -->|"Bidirectional<br/>Mount Propagation"| ClusterB
    
    %% Host paths organization
    PluginPath --> ClusterA
    PluginPath --> ClusterB
    
    %% App pods bind mount
    ClusterA -->|"bind mount<br/>+ subpath"| VolPath1
    ClusterB -->|"bind mount<br/>+ subpath"| VolPath2
    
    VolPath1 --> App1
    VolPath2 --> App2

    %% Styles
    classDef csiStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef fuseStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef hostStyle fill:#48bb78,stroke:#276749,color:#fff,stroke-width:2px
    classDef appStyle fill:#ed8936,stroke:#c05621,color:#fff,stroke-width:2px
    classDef storageStyle fill:#fc8181,stroke:#c53030,color:#1a202c,stroke-width:2px
    classDef pathStyle fill:#cbd5e0,stroke:#718096,color:#1a202c,stroke-width:1px
    
    class CSIDriver,FUSE1,FUSE2 csiStyle
    class PluginPath,ClusterA,ClusterB hostStyle
    class App1,App2 appStyle
    class CurvineClusterA,CurvineClusterB storageStyle
    class MNT1,MNT2,VolPath1,VolPath2 pathStyle
```


## FUSE 进程复用与生命周期管理

### 概述

Curvine CSI 采用智能的 FUSE 进程复用机制，通过 **ClusterID** 作为唯一标识，实现多个 PV 共享同一个 FUSE 进程（Standalone Pod）。这种设计显著提升了资源利用率和系统性能。

### 核心概念

#### ClusterID 生成规则

ClusterID 是 FUSE 进程复用的核心标识，由 `master-addrs` 的 SHA256 哈希前 8 位生成：

```go
// 示例：master-addrs 生成 ClusterID
masterAddrs := "10.0.0.1:8995,10.0.0.2:8995,10.0.0.3:8995"
clusterID := SHA256(masterAddrs)[:8]  // 例如：0893a5f6
```

**关键特性**：
- 相同的 `master-addrs` → 相同的 ClusterID → 共享 Standalone Pod
- 不同的 `master-addrs` → 不同的 ClusterID → 独立 Standalone Pod
- 支持多集群：同一节点可运行多个 Standalone Pod，访问不同 Curvine 集群

#### Standalone Pod 命名

```bash
curvine-standalone-{clusterID}-{randomSuffix}
# 示例：curvine-standalone-0893a5f6-aefd8804
```

### FUSE 进程复用机制

#### 复用场景示例

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph PVs["📦 PersistentVolumes"]
        PV1["PV-1<br/>volumeHandle: vol-app1<br/>master-addrs: 10.0.0.1:8995,..."]
        PV2["PV-2<br/>volumeHandle: vol-app2<br/>master-addrs: 10.0.0.1:8995,..."]
        PV3["PV-3<br/>volumeHandle: vol-db<br/>master-addrs: 10.0.0.1:8995,..."]
        PV4["PV-4<br/>volumeHandle: vol-logs<br/>master-addrs: 192.168.1.1:8995,..."]
    end
    
    subgraph ClusterID["🔑 ClusterID 计算"]
        Hash1["SHA256(10.0.0.1:8995,...)<br/>→ 0893a5f6"]
        Hash2["SHA256(192.168.1.1:8995,...)<br/>→ 1a2b3c4d"]
    end
    
    subgraph Standalone["🚀 Standalone Pods"]
        SP1["Standalone-0893a5f6<br/>RefCount: 3<br/>Volumes: [vol-app1, vol-app2, vol-db]"]
        SP2["Standalone-1a2b3c4d<br/>RefCount: 1<br/>Volumes: [vol-logs]"]
    end
    
    PV1 --> Hash1
    PV2 --> Hash1
    PV3 --> Hash1
    PV4 --> Hash2
    
    Hash1 --> SP1
    Hash2 --> SP2
    
    classDef pvStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef hashStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef standaloneLightStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:3px
    classDef standaloneHeavyStyle fill:#e53e3e,stroke:#c53030,color:#fff,stroke-width:3px
    
    class PV1,PV2,PV3,PV4 pvStyle
    class Hash1,Hash2 hashStyle
    class SP1 standaloneHeavyStyle
    class SP2 standaloneLightStyle
```

**说明**：
- PV-1、PV-2、PV-3 使用相同的 `master-addrs`，共享 **Standalone-0893a5f6**
- PV-4 使用不同的 `master-addrs`，使用独立的 **Standalone-1a2b3c4d**
- Standalone-0893a5f6 的引用计数为 3（三个 PV 共享）
- Standalone-1a2b3c4d 的引用计数为 1

### 生命周期管理

#### 引用计数机制

Curvine CSI 使用精确的引用计数来管理 Standalone Pod 的生命周期：

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
stateDiagram-v2
    [*] --> NotExist: 第一个 PV 请求<br/>(RefCount: 0 → 1)
    NotExist --> Creating: CreateStandalone()
    Creating --> Running: Pod Ready<br/>FUSE 挂载成功
    
    Running --> Running: 新增 PV<br/>(RefCount++)
    Running --> Running: 删除 PV<br/>(RefCount--)
    
    Running --> Terminating: 最后一个 PV 删除<br/>(RefCount: 1 → 0)
    Terminating --> [*]: DeleteStandalone()<br/>优雅关闭
    
    note right of Running
        RefCount > 0
        持续服务多个 PV
    end note
    
    note right of Terminating
        RefCount = 0
        30秒优雅关闭期
        - preStop hook: 5秒
        - FUSE umount
        - 清理资源
    end note
```

#### 生命周期详细流程

##### 1. 创建阶段

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
sequenceDiagram
    participant Kubelet
    participant CSI as CSI Node
    participant SM as StandaloneManager
    participant K8s as Kubernetes API
    participant Pod as Standalone Pod
    
    Kubelet->>CSI: NodeStageVolume(volumeID, master-addrs)
    CSI->>CSI: clusterID = SHA256(master-addrs)[:8]
    
    CSI->>SM: EnsureStandalone(clusterID)
    
    alt Standalone 已存在
        SM->>SM: 检查 Pod 状态
        SM-->>CSI: 返回现有 Pod 信息
    else Standalone 不存在
        SM->>K8s: CreatePod(Standalone)
        K8s-->>SM: Pod Created
        SM->>SM: 等待 Pod Ready (60秒超时)
        
        loop 健康检查 (每2秒)
            SM->>K8s: GetPod(podName)
            K8s-->>SM: Pod Status
            alt Pod Ready
                SM-->>CSI: ✅ Standalone Ready
            else 超时
                SM->>K8s: DeletePod(podName)
                SM-->>CSI: ❌ 创建失败，Pod 已清理
            end
        end
    end
    
    CSI->>SM: AddVolumeRef(clusterID, volumeID)
    SM->>SM: state[clusterID].RefCount++<br/>state[clusterID].Volumes.Add(volumeID)
    SM->>K8s: UpdateConfigMap(state)
    
    CSI-->>Kubelet: ✅ Stage 成功
```

**关键点**：
- 首次创建时，RefCount 从 0 增加到 1
- 后续相同 ClusterID 的请求，直接复用现有 Pod，RefCount++
- 创建失败（如连接不上集群）时，会自动清理失败的 Pod

##### 2. 复用阶段

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
sequenceDiagram
    participant Kubelet
    participant CSI as CSI Node
    participant SM as StandaloneManager
    participant Pod as Standalone Pod<br/>(RefCount: 2)
    
    Note over Pod: 已服务 2 个 PV
    
    Kubelet->>CSI: NodeStageVolume(volumeID-3, master-addrs)
    CSI->>CSI: clusterID = SHA256(master-addrs)[:8]
    
    CSI->>SM: EnsureStandalone(clusterID)
    SM->>SM: 检查：Standalone 已存在且 Ready
    SM-->>CSI: ✅ 返回现有 Pod 信息
    
    CSI->>SM: AddVolumeRef(clusterID, volumeID-3)
    SM->>SM: RefCount: 2 → 3<br/>Volumes: [vol-1, vol-2, vol-3]
    
    Note over Pod: 现在服务 3 个 PV
    
    CSI-->>Kubelet: ✅ Stage 成功（复用）
```

**优势**：
- 无需创建新 Pod，响应快速
- 节省资源：3 个 PV 仅用 1 个 Pod
- 共享连接：到 Curvine 集群的 gRPC 连接复用

##### 3. 删除阶段（自动清理）

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
sequenceDiagram
    participant Kubelet
    participant CSI as CSI Node
    participant SM as StandaloneManager
    participant K8s as Kubernetes API
    participant Pod as Standalone Pod<br/>(RefCount: 2)
    
    Note over Pod: 当前服务 2 个 PV
    
    Kubelet->>CSI: NodeUnstageVolume(volumeID-1)
    CSI->>CSI: clusterID = ExtractClusterID(volumeID-1)
    
    CSI->>SM: RemoveVolumeRef(clusterID, volumeID-1)
    SM->>SM: RefCount: 2 → 1<br/>Volumes: [vol-2]
    SM-->>CSI: shouldDelete=false<br/>(仍有引用)
    
    Note over Pod: 继续运行，服务剩余 1 个 PV
    
    Kubelet->>CSI: NodeUnstageVolume(volumeID-2)
    CSI->>CSI: clusterID = ExtractClusterID(volumeID-2)
    
    CSI->>SM: RemoveVolumeRef(clusterID, volumeID-2)
    SM->>SM: RefCount: 1 → 0<br/>Volumes: []
    SM-->>CSI: shouldDelete=true ⚠️<br/>(无引用，需清理)
    
    CSI->>SM: DeleteStandalone(clusterID)
    SM->>K8s: DeletePod(podName,<br/>gracePeriod=30s)
    
    K8s->>Pod: preStop hook 执行
    Pod->>Pod: sleep 5s (等待 I/O)
    Pod->>Pod: umount FUSE
    Pod->>Pod: 清理资源
    
    K8s->>K8s: 等待最多 30 秒
    K8s-->>SM: Pod Deleted
    SM-->>CSI: ✅ 清理完成
```

**自动清理机制**：
- **触发条件**：RefCount 降至 0（无任何 PV 引用）
- **优雅关闭**：30 秒优雅期，确保 FUSE 正确卸载
- **preStop Hook**：5 秒等待，让进行中的 I/O 完成
- **状态持久化**：引用计数保存在 ConfigMap，节点重启后恢复

#### PV Watch 兜底机制

为了处理异常情况（如 PV 直接删除，未调用 Unstage），CSI 实现了 PV Watch 机制：

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart TB
    subgraph Main["主清理路径"]
        A1[NodeUnstageVolume] --> B1[RemoveVolumeRef]
        B1 --> C1{RefCount = 0?}
        C1 -->|是| D1[DeleteStandalone]
        C1 -->|否| E1[保留 Pod]
    end
    
    subgraph Fallback["兜底清理路径"]
        A2[PV Informer] --> B2[监听 PV 删除事件]
        B2 --> C2[提取 volumeID]
        C2 --> D2[FindClusterIDByVolumeID]
        D2 --> E2[RemoveVolumeRef]
        E2 --> F2{RefCount = 0?}
        F2 -->|是| G2[DeleteStandalone]
        F2 -->|否| H2[保留 Pod]
    end
    
    subgraph GC["定期垃圾回收"]
        A3[每 10 分钟] --> B3[扫描所有 Standalone Pod]
        B3 --> C3[列出所有 PV]
        C3 --> D3[对比引用关系]
        D3 --> E3{发现孤立 Pod?}
        E3 -->|是| F3[删除孤立 Pod]
        E3 -->|否| G3[无操作]
    end
    
    Z[PV 删除] --> A1
    Z -.异常情况.-> A2
    Z -.异常遗漏.-> A3
    
    classDef mainStyle fill:#38a169,stroke:#276749,color:#fff,stroke-width:3px
    classDef fallbackStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    classDef gcStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    
    class A1,B1,C1,D1,E1 mainStyle
    class A2,B2,C2,D2,E2,F2,G2,H2 fallbackStyle
    class A3,B3,C3,D3,E3,F3,G3 gcStyle
```

**三重保障**：
1. **主路径**：正常 Unstage 调用（最快，0 延迟）
2. **PV Watch**：监听 PV 删除事件（秒级响应）
3. **定期 GC**：扫描孤立 Pod（10 分钟兜底）

#### 状态持久化

引用计数和 Volume 列表保存在 ConfigMap 中，确保节点重启后状态不丢失：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: curvine-standalone-state-minikube
  namespace: curvine-system
data:
  state.json: |
    {
      "mounts": {
        "0893a5f6": {
          "clusterID": "0893a5f6",
          "podName": "curvine-standalone-0893a5f6-aefd8804",
          "refCount": 3,
          "volumes": ["vol-app1", "vol-app2", "vol-db"],
          "createdAt": "2025-12-22T10:00:00Z"
        },
        "1a2b3c4d": {
          "clusterID": "1a2b3c4d",
          "podName": "curvine-standalone-1a2b3c4d-xyz123",
          "refCount": 1,
          "volumes": ["vol-logs"],
          "createdAt": "2025-12-22T10:05:00Z"
        }
      }
    }
```

### RBAC 权限要求

Standalone 模式需要以下权限：

| 资源 | 权限 | 用途 |
|------|------|------|
| `pods` | `create`, `delete`, `get`, `list`, `watch` | 管理 Standalone Pod |
| `configmaps` | `create`, `delete`, `get`, `list`, `update`, `watch` | 状态持久化 |
| `persistentvolumes` | `get`, `list`, `watch` | PV Watch 兜底清理 |
| `events` | `create`, `patch` | 事件记录和调试 |

### 监控与调试

#### 查看 Standalone Pod 状态

```bash
# 查看所有 Standalone Pod
kubectl get pods -n curvine-system -l app=curvine-standalone

# 查看特定 ClusterID 的 Pod
kubectl get pods -n curvine-system -l curvine.io/cluster-id=0893a5f6

# 查看引用计数状态
kubectl get configmap curvine-standalone-state-$(hostname) -n curvine-system -o yaml
```

#### 日志关键信息

```log
# 创建 Standalone
I1222 10:00:00 Creating Standalone for cluster 0893a5f6
I1222 10:00:05 Standalone curvine-standalone-0893a5f6-aefd8804 is ready

# 增加引用
I1222 10:01:00 Added volume ref vol-app1 for cluster 0893a5f6, refCount=1
I1222 10:02:00 Added volume ref vol-app2 for cluster 0893a5f6, refCount=2

# 删除引用
I1222 10:10:00 Removed volume ref vol-app1 for cluster 0893a5f6, refCount=1

# 自动清理
I1222 10:15:00 Removed volume ref vol-app2 for cluster 0893a5f6, refCount=0
I1222 10:15:00 No more volume refs for cluster 0893a5f6, deleting Standalone
I1222 10:15:01 Standalone curvine-standalone-0893a5f6-aefd8804 deleted
```

### 最佳实践

1. **使用 Standalone 模式**（默认推荐）
   - FUSE 进程独立，CSI 升级不影响业务
   - 资源隔离，问题域清晰

2. **相同集群使用相同 master-addrs**
   - 确保 PV 的 `master-addrs` 格式一致
   - 最大化 FUSE 进程复用

3. **合理规划 StorageClass**
   - 不同集群使用不同 StorageClass
   - 避免手动修改 master-addrs

4. **监控 Standalone Pod**
   - 定期检查 Pod 状态和引用计数
   - 关注异常重启和 OOM

