---
sidebar_position: 1
---
# Bare Metal Deployment

Before deployment, you need to [create installation packages and modify configuration files](../1-Preparation/03-deployment-setup.md#create-installation-package).

## Logical Deployment Architecture

The following diagram shows the logical architecture of a Curvine bare metal deployment. The **cluster core** consists only of Master and Worker processes; they must be started for the cluster to operate. FUSE is an **optional** access method and is **not** part of the cluster startup—you only need it when applications require a POSIX mount point.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#4a9eff', 'primaryTextColor': '#1a202c', 'primaryBorderColor': '#3182ce', 'lineColor': '#4a5568', 'secondaryColor': '#805ad5', 'tertiaryColor': '#38a169', 'mainBkg': '#ffffff', 'nodeBorder': '#4a5568', 'clusterBkg': '#f8f9fa', 'clusterBorder': '#dee2e6', 'titleColor': '#1a202c'}}}%%
flowchart TB
    subgraph Optional["Optional access (not required for cluster)"]
        FUSE[curvine-fuse<br/>POSIX mount]
        CLI[CLI / SDK]
    end

    subgraph Core["Curvine cluster core (required for startup)"]
        subgraph Master_Group["Master"]
            M1[curvine-master<br/>Metadata · Raft]
        end
        subgraph Worker_Group["Workers"]
            W1[curvine-worker<br/>Block storage]
            W2[curvine-worker<br/>Block storage]
            WN[curvine-worker<br/>...]
        end
        M1 --> W1
        M1 --> W2
        M1 --> WN
    end

    FUSE -.->|RPC / data| M1
    FUSE -.->|data| W1
    CLI -.->|RPC| M1

    %% Styles - align with CSI / deployment-architecture
    classDef masterStyle fill:#4a9eff,stroke:#2b6cb0,color:#fff,stroke-width:2px
    classDef workerStyle fill:#805ad5,stroke:#553c9a,color:#fff,stroke-width:2px
    classDef optionalStyle fill:#ecc94b,stroke:#b7791f,color:#1a202c,stroke-width:2px
    
    class M1 masterStyle
    class W1,W2,WN workerStyle
    class FUSE,CLI optionalStyle
```

- **Cluster core (required):** Start `curvine-master` and `curvine-worker` on the intended hosts. The cluster is operational once Master and Workers are running; you can use the CLI (`cv`) or SDK without FUSE.
- **FUSE (optional):** Start `curvine-fuse` only when you need a POSIX filesystem mount (e.g. for legacy tools or scripts). FUSE is not a core service—the cluster does not depend on it to start or run.

:::info
**FUSE is not part of cluster startup.** The Curvine cluster is formed by Master and Worker nodes. FUSE is one of several access methods (along with CLI, SDK, S3 gateway) and is only needed when applications require a local mount point.
:::

---

:::warning
Each worker needs to have its own determined IP. In multi-network interface environments, it is recommended to explicitly specify the IP through environment variables to avoid automatically reading unexpected network interface addresses.
:::

## Startup Commands

Bare metal deployment requires manually starting the **cluster core** (master and worker). Optionally start FUSE on nodes where you need a POSIX mount:

```bash
# Start cluster core (required)
bin/curvine-master.sh start
bin/curvine-worker.sh start

# Optional: start FUSE only when you need a POSIX mount point
bin/curvine-fuse.sh start
```