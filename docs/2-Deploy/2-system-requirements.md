---
sidebar_position: 1
---

# System Requirements

This page summarizes the base requirements to build and run Curvine. For a full, step-by-step environment setup (including per-OS installation commands), see [Environment Initialization](./2-Deploy-Curvine-Cluster/1-Preparation/01-prerequisites.md).

- Rust 1.86+
- Linux or macOS (Limited support on Windows)
- FUSE library (for file system functionality)

## Officially Supported Linux Distributions

| OS Distribution     | Kernel Requirement | Tested Version | Dependencies |
|---------------------|--------------------|----------------|--------------|
| **CentOS 7**        | ≥3.10.0            | 7.6            | fuse2-2.9.2  |
| **CentOS 8**        | ≥4.18.0            | 8.5            | fuse3-3.9.1  |
| **Rocky Linux 9**   | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **RHEL 9**          | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **Ubuntu 22**       | ≥5.15.0            | 22.4           | fuse3-3.10.5 |
