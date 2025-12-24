# Curvine CSI Architecture

`curvine-csi` is based on FUSE implementation, establishing connection with Curvine cluster through FUSE mount in csi-node.

## Architecture

**If you only need to use CSI, you can skip this chapter** and refer to [K8S CSI Driver](Setup) directly.

Curvine-csi mainly consists of the following components:

| Component | Responsibility |
|-----------|---------------|
| CSI Node | Handle CSI gRPC calls, manage volume mounts |
| CSI Controller | Create/Delete/Monitor PVs |
| Standalone POD | In `standalone` mode, independently manages FUSE processes |

## Mount Modes

Most CSI implementations manage mounts directly in `csi-node` by mounting remote storage to hosts and finally bind mounting to pod containers. Curvine-csi is based on FUSE. When the CSI component restarts, the FUSE process will be interrupted. To avoid FUSE interruption caused by CSI driver upgrades or restarts, curvine-csi supports two mount modes: standalone and embedded.

- **Standalone**: Decouple the FUSE process from the csi-node pod and run it in an independent Pod
- **Embedded**: FUSE process runs in the csi-node plugin pod

### Standalone Mode (Recommended)

Default mode. Install with Helm:

```bash
helm install curvine-csi ./curvine-csi \
  --set mountMode=standalone
```

#### Resource Configuration

Configure Standalone Pod resource limits via Helm values:

```bash
helm install curvine-csi ./curvine-csi \
  --set node.mountMode=standalone \
  --set node.standalone.resources.requests.cpu=500m \
  --set node.standalone.resources.requests.memory=512Mi \
  --set node.standalone.resources.limits.cpu=2 \
  --set node.standalone.resources.limits.memory=2Gi
```

Or use a values file:

```yaml
node:
  mountMode: standalone
  standalone:
    image: ""  # Empty uses CSI image
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "2"
        memory: "2Gi"
```

Default configuration:
- CPU: requests 500m, limits 2
- Memory: requests 512Mi, limits 2Gi

Architecture diagram:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%flowchart TB
    subgraph K8sNode["Kubernetes Node"]
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

### Embedded Mode

Install with Helm:

```bash
helm install curvine-csi ./curvine-csi \
  --set node.mountMode=embedded \
  --set node.resources.requests.memory=2Gi \
  --set node.resources.requests.cpu=1000m \
  --set node.resources.limits.memory=4Gi \
  --set node.resources.limits.cpu=2000m
```

Architecture diagram:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%flowchart TB
    subgraph K8sNode["Kubernetes Node"]
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

:::warning
In Embedded mode, if curvine-csi restarts or upgrades, the FUSE process will be interrupted, causing Pods to be unable to use Curvine normally. Please choose carefully based on your scenario.
:::

## FUSE Process Reuse and Lifecycle Management

### Overview

Curvine CSI implements intelligent FUSE process reuse mechanism. Using **ClusterID** as a unique identifier, multiple PVs can share the same FUSE process (Standalone Pod). This design significantly improves resource utilization and system performance.

### Core Concepts

#### ClusterID Generation

ClusterID is generated from the first 8 characters of the SHA256 hash of `master-addrs`:

```go
// Example: Generate ClusterID from master-addrs
masterAddrs := "10.0.0.1:8995,10.0.0.2:8995,10.0.0.3:8995"
clusterID := SHA256(masterAddrs)[:8]  // e.g., 0893a5f6
```

**Key Features**:
- Same `master-addrs` → Same ClusterID → Shared Standalone Pod
- Different `master-addrs` → Different ClusterID → Independent Standalone Pod
- Multi-cluster support: Same node can run multiple Standalone Pods for different Curvine clusters

#### Standalone Pod Naming

```bash
curvine-standalone-{clusterID}-{randomSuffix}
# Example: curvine-standalone-0893a5f6-aefd8804
```

### FUSE Process Reuse Mechanism

#### Reuse Scenario Example

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart LR
    subgraph PVs["PersistentVolumes"]
        PV1["PV-1<br/>volumeHandle: vol-app1<br/>master-addrs: 10.0.0.1:8995,..."]
        PV2["PV-2<br/>volumeHandle: vol-app2<br/>master-addrs: 10.0.0.1:8995,..."]
        PV3["PV-3<br/>volumeHandle: vol-db<br/>master-addrs: 10.0.0.1:8995,..."]
        PV4["PV-4<br/>volumeHandle: vol-logs<br/>master-addrs: 192.168.1.1:8995,..."]
    end
    
    subgraph ClusterID["ClusterID Calculation"]
        Hash1["SHA256(10.0.0.1:8995,...)<br/>→ 0893a5f6"]
        Hash2["SHA256(192.168.1.1:8995,...)<br/>→ 1a2b3c4d"]
    end
    
    subgraph Standalone["Standalone Pods"]
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

**Explanation**:
- PV-1, PV-2, PV-3 use the same `master-addrs`, sharing **Standalone-0893a5f6**
- PV-4 uses different `master-addrs`, using independent **Standalone-1a2b3c4d**
- Standalone-0893a5f6 has a reference count of 3 (three PVs sharing)
- Standalone-1a2b3c4d has a reference count of 1

**Automatic Cleanup Mechanism**:
- **Trigger Condition**: RefCount drops to 0 (no PV references)
- **Graceful Shutdown**: 30-second grace period to ensure FUSE unmounts correctly
- **preStop Hook**: 5-second wait to allow ongoing I/O to complete
- **State Persistence**: Reference counts stored in ConfigMap, state restored after node restarts

### RBAC Requirements

Standalone mode requires the following permissions:

| Resource | Permissions | Purpose |
|----------|-------------|---------|
| `pods` | `create`, `delete`, `get`, `list`, `watch` | Manage Standalone Pods |
| `configmaps` | `create`, `delete`, `get`, `list`, `update`, `watch` | State persistence |
| `persistentvolumes` | `get`, `list`, `watch` | PV Watch fallback cleanup |
| `events` | `create`, `patch` | Event logging and debugging |

### Best Practices

1. **Use Standalone Mode** (default, recommended)
   - Independent FUSE process, CSI upgrades don't affect business
   - Resource isolation, clear problem domain

2. **Use consistent master-addrs for same cluster**
   - Ensure PV's `master-addrs` format is consistent
   - Maximize FUSE process reuse

3. **Monitor Standalone Pods**
   ```bash
   # View all Standalone Pods
   kubectl get pods -n curvine-system -l app=curvine-standalone
   
   # View reference count state
   kubectl get configmap -n curvine-system -l app=curvine-standalone-state
   ```

4. **Check logs for lifecycle events**
   ```log
   # Creation
   I1222 10:00:00 Creating Standalone for cluster 0893a5f6
   
   # Reference addition
   I1222 10:01:00 Added volume ref, refCount=2
   
   # Automatic cleanup
   I1222 10:15:00 Removed volume ref, refCount=0
   I1222 10:15:00 No more refs, deleting Standalone
   ```
