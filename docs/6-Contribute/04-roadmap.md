# Curvine 2025 Roadmap


## Overview
This roadmap outlines the goals our team is pursuing and our vision for the entire community.
The evolution of Curvine in 2025 is marked by a series of major feature updates. These enhancements stem from community feedback and the latest demands in real-world scenarios, reflecting our ongoing commitment to excellence.

## Join Us
- For existing tasks with trackable issues, you can directly comment on them in [GitHub Issues](https://github.com/CurvineIO/curvine/issues)
- For open suggestions, please submit them through [GitHub Discussions](https://github.com/CurvineIO/curvine/discussions)
- We are committed to developing an open-source ecosystem, and we welcome global contributors to join!

---

## Core Feature Planning

### 1. Cache function improvement
- [ ] Cache data automatic cleanup
- [ ] Support mainstream storage systems：
    - HDFS
    - S3
    - OSS (OSS-HDFS)
- [ ] Cache data preloading

### 2. Data write consistency
- [ ] Write data automatically manages cache and refreshes to storage systems
- [ ] Pipeline multi-replica copy and maintenance
- [ ] Strong consistency protocol support

### 3. Shuffle support
- [ ] File aggregation function
- [ ] Integration with Spark RSS (Remote Shuffle Service)

### 4. Performance optimization
- [ ] ORPC uses `io_uring` to implement full-link zero-copy (solving the `splice` failure problem in cloud environments)
- [ ] FUSE full-link zero-copy (performance alignment with Client mode)
- [ ] RDMA network support

### 5. Cloud-native support
- [ ] Curvine Operator
- [ ] Curvine CSI driver

---

## Version release plan

### Milestones for 2025
| Version number          | Release date   | Core features                          |
|-----------------|------------|-----------------------------------|
| `0.1.1-beta`    | 2025-07    | Use Curvine FUSE as Spark Shuffle local disk (through TPC-DS test) |
| `0.2.1-beta`    | 2025-08    | Shuffle function completion + Spark integration test  |
|                 |            | `io_uring` acceleration for read/write               |
|                 |            | HDFS protocol support                  |
| `0.2.2-beta`    | 2025-08    | Cloud-native CSI driver support                   |
| `0.3.1-beta`    | 2025-09    | Cache data automatic cleanup + multi-storage system adaptation      |

### Major version planning
| Version number          | Time node   | Target scene                          |
|-----------------|------------|-----------------------------------|
| `1.0.0-base`   | 2025-12-30 | Comprehensive support for big data scenarios:              |
|                 |            | - Shuffle optimization                    |
|                 |            | - Local Spill support                 |
|                 |            | - Hot data cache acceleration                  |
| `2.0.0-base`   | 2026-09-30 | AI scenario enhancement:                     |
|                 |            | - Training acceleration framework integration                |
|                 |            | - RDMA/GDS support                  |


