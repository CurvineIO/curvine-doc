# FUSE

## 1. Basic Understanding of FUSE

### 1. What Is FUSE?

FUSE stands for Filesystem in Userspace. It is a general mechanism provided by the Linux kernel. Its biggest advantage is that it turns distributed or custom storage into an operating experience like a local disk.

### 2. Core Role of FUSE in Curvine

FUSE is the most important and most general API entry point of Curvine, and it is also the simplest way to access Curvine:

- Zero-code-change usage: users do not need to modify business code or perform extra adaptation. Like operating a local C drive or D drive, users can operate Curvine storage through system-native file commands such as `ls`, `cat`, `vim`, and `git`.
- High-performance foundation: Curvine is based on Rust and has fully asynchronously reconstructed FUSE. It only depends on the kernel-native FUSE module and has no extra redundant dependencies. This is the core underlying guarantee for supporting high concurrency and high performance.

## 2. Data Consistency

### 1. Conventional Distributed Storage: Close-to-Open Semantics

Most distributed storage systems follow Close-to-Open by default: after a file is written, the written data becomes visible to other clients only after the file is closed. Content written in the middle is not exposed.

### 2. Curvine Consistency: Visible After Flush

Curvine does not follow Close-to-Open. Instead, it is fully consistent with local disk file semantics:

- Core rule: as long as data is flushed to storage, it immediately becomes visible to all clients without waiting for the file to be closed.
- Core value: this is the key for Curvine to support complex application scenarios such as `git clone` and database storage, which require file semantics fully consistent with local disks.

### 3. Notes on Concurrent Reads and Writes

Curvine supports multiple clients concurrently reading and writing the same file, but it has clear characteristics:

- To fully support POSIX semantics, Curvine removes write protection.
- Risk point: without write protection, if multiple clients write to the same file at the same time, data overwrite or dirty reads may occur.
- One-sentence summary of the difference: Curvine consistency equals local disk semantics, sacrificing part of write protection in exchange for concurrency and random write capability. Other distributed storage systems use write protection plus Close-to-Open, sacrificing visibility in exchange for strong consistency.

## 3. Metadata Cache

Metadata can be simply understood as the identity information of a file, such as file name, size, permission, modification time, and file or directory type. Caching metadata can greatly improve file query performance. Curvine divides metadata cache into kernel metadata cache and client metadata cache.

### 1. Kernel Metadata Cache

The Curvine FUSE client can control kernel-level metadata cache through configuration. The default cache time is 1 second, which significantly improves query efficiency.

Core configuration parameters:

| Configuration Item | Default Value | Function |
| --- | --- | --- |
| `attr_timeout` | 1 second | File attribute cache time, accelerating `getattr` operations. |
| `entry_timeout` | 1 second | File/directory type cache time, accelerating `lookup` operations. |
| `negative_timeout` | 1 second | Cache time for failed queries of nonexistent files, avoiding repeated invalid requests. |

Cache meaning:

When accessing a path such as `/a/b/c.log`, the kernel looks up `/`, `/a`, `/a/b`, and `/a/b/c.log` in sequence. Without cache, more than 4 remote RPC requests are required. With cache, data is directly retrieved from the kernel. In massive small-file scenarios, the performance improvement is extremely obvious. When file data does not change frequently, the cache time can be appropriately increased.

Core characteristics:

- Reduces context switching between kernel mode and user mode. When the cache hits, the Curvine user-space program is not accessed.
- Only accelerates a few interfaces such as `lookup` and `getattr`, and the cached content is limited.

### 2. Client Metadata Cache

The client-level cache developed by Curvine itself caches more complete content than kernel cache:

- Caches complete file attributes, file block information, and all file lists under directories.
- Advantage: repeatedly opening the same file does not require accessing the metadata service, greatly reducing remote RPC calls.
- Limitation: it only guarantees data consistency within a single client. Files created by the current client can be seen immediately by itself. Files created by other clients can only be seen after the current client's cache expires.

### 3. Comparison and Usage Recommendations

- Kernel cache: reduces kernel-mode switching and only accelerates part of the interfaces. It delivers the best performance when the full page cache hits.
- Client cache: caches complete content and reduces RPCs, but cannot reduce mode switching.
- Usage: either cache can be used independently, or both can be used together. Adjust flexibly according to the business scenario.

## 4. Data Cache

### 1. Kernel Page Cache

- Principle: the kernel caches file data that has already been read into memory page cache. Repeated reads are served directly from memory.
- Curvine optimization: Curvine tracks opened files. If a file is modified, the page cache automatically becomes invalid to ensure the latest data is read.
- Performance: repeatedly reading the same file can achieve microsecond-level latency and throughput of dozens of GiB per second, which is extremely fast.
- It is enabled by default. When memory is insufficient, `direct_io = true` can be configured to disable page cache.

### 2. Kernel Writeback Cache

- Kernel requirement: Linux kernel 3.15 or later is required. This is a FUSE-specific feature.
- Principle: the kernel merges many small, high-frequency random write requests and writes them in batches, reducing the number of I/O operations and improving random write performance.
- Side effect: it converts sequential writes into random writes, seriously reducing sequential write performance.
- It is disabled by default and must be manually enabled. It is only suitable for scenarios with many random writes and is not recommended for sequential write scenarios.

## 5. FUSE Version Selection

- Recommended configuration: Linux kernel version 5.0 or later, such as Ubuntu 22.04 and Rocky Linux 9. This can deliver the best FUSE performance, and the asynchronous and cache features are fully adapted.
- Low-kernel risk: when the kernel version is lower than 4.15, FUSE concurrency capability is poor and performance bottlenecks are obvious. It is not recommended for production environments.
