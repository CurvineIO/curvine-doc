# Data Orchestration

Curvine provides UFS (Unified File System) view to manage all supported distributed storage systems, including s3/hdfs etc.

```mermaid
flowchart TD
    subgraph Application Layer
        App[Application]
    end

    subgraph UFS Backend Layer - curve-ufs
        UEnum[UfsFileSystem enum]
        OFS[OpendalFileSystem]
        ODO[OpenDAL Operator]
    end

    subgraph Unified File System Layer
        UFS[UnifiedFileSystem]
        
        subgraph Path Resolution
            GM["get_mount()"<br/>Check mount point]
            TP["toggle_path()"<br/>Convert CV ↔ UFS]
        end
        MC[MountCache<br/>TTL-based cache]
    end

    subgraph External Storage
        S3[S3/OSS/COS]
        HDFS[HDFS/WebHDFS]
        Azure[Azure Blob]
        GCS[Google Cloud Storage]
    end

    subgraph Curve Cache Layer
        CFS[CurveFileSystem]
        FSC[FsClient<br/>RPC to Master]
    end

    App --> UFS
    UFS --> GM
    UFS --> TP
    UFS --> MC
    UFS --> UEnum
    MC --> CFS
    CFS --> FSC
    UEnum --> OFS
    OFS --> ODO
    ODO --> S3
    ODO --> HDFS
    ODO --> Azure
    ODO --> GCS
```
## Mounting

Curvine supports connecting multiple UFS sources by mounting them to different Curvine paths. Curvine does not provide default UFS configuration, which means if you want to load data from UFS, you must first mount the UFS source.

![mount-arch](../img/mount-arch.png)

Curvine persists the mount table in metadata, so there is no need to remount when Curvine restarts. However, some rules must be followed.
- Mounting to the root path is not allowed.
- Mounting other UFS under a mounted path is not allowed.
- The same mount path cannot be mounted to different UFS.

Mount command:
```bash
bin/cv mount ufs_path curvine_path [configs]
```

- ufs_path: UFS path, e.g., s3://bucket/path.
- curvine_path: Curvine path, e.g., /ufs/path.
- configs: Optional parameters, e.g., access_key_id, secret_access_key, region, endpoint, etc.

Example:
```
bin/cv mount s3://ai/xuen-test /s3 \
-c s3.endpoint_url=http://hostname.com \
-c s3.region_name=cn \
-c s3.credentials.access=access_key \
-c s3.credentials.secret=secret_key \
-c s3.path_style=true
```

:::tip
You can use command line, API to access ufs directories and files after UFS is mounted, but ufs data will not be automatically synchronized to curvine unless you load specific paths.
:::

### Mount Modes
#### Write Cache
WriteType controls the write behavior between Curvine cache and underlying storage (UFS)
| Mode | Behavior (Sync/Async) | Consistency | Use Cases |
|---|---|---|---|
| Cache mode | Write only to Curvine cache, not sync to UFS | Cache-only consistency, no data in UFS | Temporary data, scratch data, disposable intermediate results |
| Through mode | Write directly to UFS, bypass cache | Strong consistency, data directly persisted to UFS | Write-once-read-many scenarios, cache-unbeneficial data |
| AsyncThrough mode (default) | Write to cache first, async sync to UFS, return immediately | Eventual consistency, cache readable immediately, UFS updated async | Machine learning training, scenarios balancing performance and persistence |
| CacheThrough mode | Sync write to cache and UFS, wait for UFS completion | Strong consistency, ensure data exists in both cache and UFS | Shared data, scenarios requiring strong persistence guarantees |

#### Read Cache
ConsistencyStrategy determines whether consistency validation with underlying storage (UFS) is needed when reading logs
| Mode | Behavior | Consistency | Use Cases |
|---|---|---|---|
| None | Trust cache, no consistency validation during reads | No consistency guarantee, may read stale data | High-performance read scenarios, relatively static base data, temporary data/intermediate results |
| Always | Validate cache matches UFS on every read | Strong consistency guarantee, ensure latest data | Intermittent data updates, multi-client shared data, strong consistency requirement scenarios |

:::note
TTL controls read cache behavior in Curvine by determining cache validity to trigger automatic cache refresh or cleanup operations.
:::

## Unified Access
After UFS is mounted, Curvine provides a unified file system view, and you can access the UFS file system just like accessing the Curvine file system;
Clients, command line tools, fuse, etc. can all access the UFS file system through a unified path.

:::tip
Curvine does not cache UFS metadata, so there is no data consistency issue when accessing. Accessing UFS through Curvine is no different from accessing UFS directly.
When Curvine cache data read fails, it automatically falls back to reading data from UFS.
:::

## Disabling Unified Access
If you don't want to use unified access, you can add or modify the following configuration:
```
[client]
enable_unified_fs = false
```