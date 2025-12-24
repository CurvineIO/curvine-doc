---
sidebar_position: 1
---

# 项目结构
```bash
.
├── build
├── Cargo.lock
├── Cargo.toml
├── curvine-client
├── curvine-common
├── curvine-docker
├── curvine-fuse
├── curvine-libsdk
├── curvine-server
├── curvine-tests
├── curvine-ufs
├── curvine-web
├── etc
├── orpc
├── rustfmt.toml
├── target
└── testing
```

**模块说明**
- orpc：高性能网络通信框架，支持异步 RPC 调用，为 curvine-server 和 curvine-client 提供通信功能。
- curvine-common：共享库，包含协议定义、错误处理和通用工具，被多个组件依赖。
- curvine-server：包含 Master 和 Worker 实现，Master 管理 Worker。
- curvine-client：提供与服务器交互的 API。
- curvine-fuse：FUSE 文件系统接口，允许 Curvine 作为本地文件系统挂载。
- curvine-libsdk：支持多语言访问，包含 Java SDK 等。
- curvine-web：Web 管理界面和 API，用于管理服务器。
- curvine-tests：测试框架和性能基准测试工具，对多个组件进行测试。
- curvine-ufs：统一文件系统接口，支持多种底层存储系统。





