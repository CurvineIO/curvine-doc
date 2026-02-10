---
sidebar_position: 1
---

# 开发指南

本文说明如何搭建 Curvine 开发环境、项目结构以及如何构建与运行测试，内容以 [Curvine 源码仓库](https://github.com/CurvineIO/curvine) 为准。

## 项目结构

仓库为 Cargo workspace，主要目录与 crate 如下：

```
.
├── build/                 # 构建与测试脚本
│   ├── bin/               # 启动脚本（curvine-master.sh, curvine-worker.sh, cv 等）
│   ├── build.sh           # 主构建脚本（-p 包, -u ufs 等）
│   ├── check-env.sh       # 依赖检查
│   ├── run-tests.sh       # 格式化、clippy、带测试集群的 cargo test
│   └── tests/             # 压测/回归脚本（meta-bench.sh, curvine-bench.sh, fio-test.sh 等）
├── Cargo.toml             # workspace 定义
├── rust-toolchain.toml    # Rust 版本（如 1.92.0）
├── orpc/                  # RPC 与运行时库
├── curvine-common/       # 共享类型、配置、协议、Raft、UFS 抽象
├── curvine-server/        # Master 与 Worker（同一二进制 --service master|worker）
├── curvine-client/        # Rust 客户端与块 IO
├── curvine-cli/           # cv 命令行（mount, fs, load, report, node 等）
├── curvine-fuse/          # FUSE 守护进程
├── curvine-ufs/           # UFS 实现（基于 OpenDAL：S3、HDFS 等）
├── curvine-libsdk/        # 多语言 SDK（Java、Python、Rust）
├── curvine-s3-gateway/    # S3 兼容对象网关
├── curvine-web/           # Web 管理与 API
├── curvine-tests/         # 集成测试与测试工具
├── curvine-csi/           # Kubernetes CSI 驱动（Go）
├── curvine-docker/        # Dockerfile（编译、部署、fluid）
└── etc/                   # 示例配置（curvine-cluster.toml, curvine-env.sh）
```

**Crate 职责（与 workspace members 对应）：**

| Crate | 职责 |
|-------|------|
| **orpc** | 异步 RPC、运行时、日志、网络；被 server 与 client 使用。 |
| **curvine-common** | 配置（ClusterConf、MasterConf、WorkerConf 等）、proto、Raft 存储、共享状态类型。 |
| **curvine-server** | Master（元数据、journal、WorkerManager）与 Worker（块存储、读写 handler）；单一二进制，`--service master` 或 `--service worker`。 |
| **curvine-client** | 客户端 API、块读写、统一文件系统（UFS + Curvine 路径解析）。 |
| **curvine-cli** | `cv` 命令：mount、umount、fs、load、load-status、report、node、version。 |
| **curvine-fuse** | FUSE 守护进程；将 POSIX 调用转为 Curvine RPC。 |
| **curvine-ufs** | UFS 后端（OpenDAL 的 S3、HDFS、WebHDFS 等）。 |
| **curvine-libsdk** | Java（Hadoop）、Python、Rust SDK 绑定。 |
| **curvine-s3-gateway** | S3 兼容 HTTP API（Axum）。 |
| **curvine-web** | Web 管理与 HTTP API。 |
| **curvine-tests** | 集成测试；`test_cluster` example 用于本地集群。 |

## 开发环境

### 前置依赖

与仓库 [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md) 及 [rust-toolchain.toml](https://github.com/CurvineIO/curvine/blob/main/rust-toolchain.toml) 一致：

- **Rust**：版本以 `rust-toolchain.toml` 为准（如 1.92.0）；组件：rustfmt、clippy、rust-analyzer。
- **Protobuf**：3.x（如 27.2）用于 proto 编译。
- **LLVM**：部分依赖需要。
- **FUSE**：libfuse2 或 libfuse3 开发包（编译 curvine-fuse）。
- **Java / Maven**：Java SDK 与 meta-bench（如 JDK 1.8+、Maven 3.8+）。
- **Node.js / npm**：Web UI（如 npm 9+）。
- **Python**：3.7+（脚本与 Python SDK）。

按操作系统安装步骤见 [环境初始化](/zh-cn/docs/Deploy/Deploy-Curvine-Cluster/Preparation/prerequisites)。

### 克隆与检查环境

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
make check-env
# 或：build/check-env.sh
```

## 构建

- **全量构建（release）**：产物在 `build/dist/`（二进制在 `lib/`，脚本在 `bin/`，配置在 `conf/`）：

  ```bash
  make all
  # 或：make build
  ```

- **部分构建**：通过 `make build ARGS='...'` 传入 `build/build.sh` 参数：

  ```bash
  make build ARGS='-p core'              # server, client, cli
  make build ARGS='-p core -p fuse'      # + FUSE
  make build ARGS='-p object'             # S3 网关
  make build ARGS='-d'                   # debug
  make build-hdfs                        # 带 HDFS 支持
  make build ARGS='--skip-java-sdk'      # 跳过 Java SDK
  ```

- **格式化与检查**：

  ```bash
  make format
  make cargo ARGS='clippy --release --all-targets -- --deny warnings'
  ```

更多构建方式与 Docker 构建见 [下载与编译 Curvine](/zh-cn/docs/Deploy/Deploy-Curvine-Cluster/Preparation/compile)。

## 测试

- **Rust 单元测试**（无需集群）：`cargo test --release` 或 `make cargo ARGS='test --release'`。
- **集成测试**：`build/run-tests.sh` 会做格式检查、可选 clippy、启动测试集群（`cargo run --release --example test_cluster`）并执行 `cargo test --release`。
- **本地集群**：在 `build/dist/` 下执行 `export CURVINE_MASTER_HOSTNAME=localhost` 后 `bin/curvine-master.sh start`、`bin/curvine-worker.sh start`；或使用 `bin/local-cluster.sh`（若存在）。

## 代码风格与贡献

- **Rust**：`cargo fmt`；`cargo clippy` 按项目要求（如 CI 中 deny warnings）。
- **提交**：建议 conventional commits（feat、fix、docs 等）；详见仓库 [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md)。
- **PR**：从 `main` 拉分支；包含测试与文档更新；确保 CI 通过。

贡献流程、标签与社区链接见仓库 [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md)。
