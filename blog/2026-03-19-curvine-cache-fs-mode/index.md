# Curvine: Next-Generation Unified Data Access Layer, Combining POSIX and High-Speed Cache

In our practice with distributed cache, we have identified core pain points users face: insufficient POSIX semantics support, high resource consumption, and complex operations. To better address these challenges, we have restructured Curvine's architecture and development roadmap, creating a next-generation unified data access layer that combines strong POSIX semantics with high-performance caching, delivering a qualitative improvement in remote data access experience.

## Two Core Mount Modes for Diverse Business Needs

Curvine optimizes data read/write patterns into two concise mount point modes: **CacheMode** and **FsMode**, each targeting different business scenarios. This design balances cache acceleration with complete semantics support, allowing users to choose flexibly based on actual requirements.

### CacheMode: Lightweight Read Cache Acceleration, Tightly Coupled with UFS

CacheMode centers on UFS (Underlying File System), primarily serving as a read cache accelerator and unified proxy for UFS. All read/write operations are UFS-centric:

- **Metadata caching** effectively accelerates common operations like `ls`
- **Write operations** go directly to UFS
- Users maintain strong awareness of UFS without changing existing data operation habits

This is the preferred solution for lightweight UFS read performance improvement.

### FsMode: Full Performance Acceleration with Strong POSIX Semantics

FsMode places Curvine itself at the core, with metadata independently managed by Curvine. Its path structure maps one-to-one with UFS, while UFS serves only as Curvine's cold storage layer. This mode provides:

- **Comprehensive read/write cache acceleration**
- **Better POSIX semantics support** for read/write operations
- **Ideal for large-scale file performance acceleration**
- **Best choice for scenarios requiring both semantic completeness and high performance**

## FsMode Deep Dive: Layered Design Balancing Performance and Consistency

As Curvine's core mode, FsMode employs a layered filesystem mount/write design. Through clear semantic definitions and process planning, it achieves balance among performance, semantics, and data consistency. Let's examine its core design details.

### Core Semantic Rules

1. **Unified IO Entry Point**: All data read/write operations go through Curvine. Applications should use only Curvine paths; direct UFS access is not recommended as it cannot guarantee data consistency.

2. **Asynchronous Cold Storage Writes**: When writing data, it first lands in Curvine (metadata + blocks). The Master side periodically submits Load/Dump tasks based on policies to asynchronously flush data to UFS (e.g., S3), making frontend write operations more efficient.

3. **Intelligent Read Backfill**: When reading data, Curvine is prioritized. If data has been evicted or exists only in UFS, a Load operation backfills UFS data to Curvine. The current read passes through directly from UFS, balancing read speed with data availability.

4. **Flexible Replica Forms**: Allows states where only UFS contains data. In such cases, UFS data serves as the file's sole replica, maximizing storage resource utilization.

5. **On-Demand Metadata Synchronization**: The `mount` operation synchronizes all metadata under the directory. Full synchronization is not performed actively afterward. If needed, use the `mount resync` command to manually update mount point metadata (synchronizing only file metadata that exists solely in UFS).

6. **Lazy Cache Loading**: If a file being read has no metadata in Curvine but exists in UFS, the first read will fail. On retry, UFS files are actively fetched. Alternatively, manually trigger the `mount resync` command in advance to synchronize metadata and avoid read failures.

7. **Fault Tolerance Design**: When Master fails, users can access data normally through UFS interfaces. When Worker fails, other replicas can be accessed in multi-replica scenarios; in single-replica scenarios, direct UFS reading ensures business continuity.

### Consistency Design: Usable Now, Better in Future

The current FsMode consistency implementation:

- When a UFS path is first mounted to Curvine, all metadata under that directory is mapped to Curvine as a whole
- If files are written directly to UFS bypassing Curvine, Curvine cannot automatically perceive these changes
- Manual re-synchronization via sync commands is required in such cases

**Future Planning**: Curvine will implement automatic perception of UFS metadata change events, enabling near real-time UFS metadata synchronization. This will technically guarantee data consistency completely, allowing users to operate without concerning themselves with synchronization—truly seamless usage.

### FsMode Core Design Objectives

All FsMode designs revolve around clear objectives, ensuring every capability precisely addresses business pain points:

- **Unified Entry Point**: All operations go through Curvine paths. Applications don't need to adapt to UFS, reducing development and operations costs.
- **POSIX Semantics**: Supports complete POSIX filesystem semantics, including directory trees, random read/write, renaming, atomicity, strong consistency, etc., adapting to various traditional and new applications.
- **Tiered Storage**: Curvine layer stores hot data (metadata + optional local blocks), UFS serves as persistent/cold replica, achieving hot/cold data separation for improved storage efficiency and access performance.
- **Background Flushing**: Master periodically submits Load/Dump tasks based on business operations and preset policies to asynchronously flush Curvine data to UFS without affecting frontend business.
- **UFS-Only Replica**: Supports scenarios where data exists only in UFS (e.g., S3). Data is backfilled on-demand or read-through as needed, balancing storage flexibility with data accessibility.

## CacheMode vs FsMode: Core Differences at a Glance

To help you clearly distinguish between the two modes and precisely match business scenarios, we've organized the core comparison dimensions:

| Comparison Item | CacheMode | FsMode |
|-----------------|-----------|--------|
| **Semantics Support** | Only supports UFS's native semantics | Supports complete POSIX semantics (directory trees, random read/write, renaming, atomicity, strong consistency, etc.) |
| **Write Method** | Data writes directly to UFS; applications tightly coupled with UFS | Data writes to Curvine; JM asynchronously flushes to UFS; applications face only Curvine |
| **Metadata Management** | Metadata cached but maintains strong consistency with UFS | Metadata maintained by Curvine Master, periodically synchronized to UFS; Curvine prevails in conflicts; UFS modifications via other interfaces are not actively perceived by Curvine |
| **Read Logic** | If cache exists, read from Curvine; if no cache, submit async task to load to Curvine, current read directly from UFS | Prioritize reading from Curvine; if no data in Curvine, Master marks as hot data and backfills to Curvine; current read directly from UFS |
| **Data Expiration Handling** | Deletes both metadata and data blocks in Curvine | Deletes only Curvine data blocks, retains metadata |
| **Consistency Guarantee** | Constrained by UFS (e.g., S3 eventual consistency) | Strong consistency on Curvine side; eventual consistency with UFS via async tasks |

## Extreme Resource Optimization, Lighter and More Friendly

Beyond refining functionality and performance, Curvine has made deep optimizations in resource consumption, upgrading comprehensively from underlying technology stack to implementation methods:

Curvine is built on **Rust**, naturally possessing high performance and low resource consumption characteristics. It also employs cutting-edge optimization techniques such as **asynchronous operations** and **zero-copy**, further reducing resource footprint.

**Online practice data shows**: A single Curvine Worker process occupies **less than 1GB of memory**. In large-scale cluster deployments, this effectively reduces server resource investment and operational costs, making it easily adaptable even in resource-constrained scenarios.

## Product Philosophy: Not a Replacement, Just a Better Data Access Method

Curvine has had a clear product positioning from the start:

> **Not pursuing to become a general-purpose POSIX filesystem, nor attempting to replace any storage product.**

We have always focused on one thing: **making remote data access so fast that you can't feel the "remote" aspect, without changing users' original data operation habits**. This is not only a technical challenge but also Curvine's core product philosophy—the best infrastructure is the kind that makes you unaware of its existence.

In the AI era, data volume is exploding. Remote data access performance and experience have become key factors affecting business efficiency. Curvine integrates the wisdom of distributed cache technology with POSIX completeness of distributed filesystems, while adhering to the core principle of "metadata transparency, unchanged file structure." Users can achieve a leap in remote data access performance without major modifications to existing business systems.

In the future, Curvine will continue to深耕 the unified data access layer field, continuously optimizing performance, stability, improving semantics support, and simplifying operations processes. We are committed to becoming a key part of data infrastructure in the AI era, providing efficient, stable, and lightweight data access support for digital upgrades of various businesses.

Finally, we hope more open-source enthusiasts from the storage and Rust fields will join us in building and sharing together!

---

*Powered by OPPO Bigdata.*
