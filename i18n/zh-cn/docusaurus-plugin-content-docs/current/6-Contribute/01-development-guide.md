---
sidebar_position: 1
---

# 开发指南

本文基于 Curvine 主分支源码树，概述 Curvine 的开发环境、仓库结构、构建方式与测试流程。

## 仓库结构

Curvine 仓库同时包含 Cargo workspace，以及若干用于打包、部署和测试的顶层目录。

### Cargo workspace crates

`Cargo.toml` 中声明的 workspace members 如下：

| Crate / 目录 | 职责 |
|-------|------|
| `crates/core/` | 运行时、RPC、网络、I/O、内存分配、指标与故障注入相关 crate。 |
| `crates/common/` | 配置、协议、模型、文件系统、存储与 UFS API 相关 crate。 |
| `crates/metadata/curvine-raft` | Raft 日志与元数据复制。 |
| `crates/adapters/` | RocksDB、本地与 SPDK 存储、OpenDAL 与 OSS-HDFS UFS 后端、HDFS JNI 与服务发现。 |
| `crates/server/curvine-data-transfer` | 独立处理 Load / Export 作业的 Transfer 服务。 |
| `curvine-server` | 服务端二进制（`--service master`、`worker`、`mds` 或 `transfer`）。 |
| `curvine-master`、`curvine-worker`、`curvine-mds` | 各服务入口 crate。 |
| `crates/client/` | 客户端核心、统一文件系统、传输作业客户端与压测运行器。 |
| `crates/sdk/`、`curvine-libsdk` | Rust、Java、Python SDK crate 与打包。 |
| `curvine-fuse` | FUSE 守护进程。 |
| `curvine-web` | Web UI 与管理 API。 |
| `curvine-ufs` | UFS 集成 crate。 |
| `curvine-cli` | `cv` 命令行工具。 |
| `curvine-tests` | 集成测试、压测二进制与回归测试工具。 |

### 其他顶层目录

| 路径 | 用途 |
|------|------|
| `build/` | 构建、打包、启动、压测与测试脚本。 |
| `build/bin/` | 运行时包装脚本，例如 `curvine-master.sh`、`curvine-worker.sh`、`curvine-mds.sh`、`curvine-transfer.sh`、`curvine-fuse.sh`、`cv`、`local-cluster.sh`。 |
| `build/tests/` | 压测与回归辅助脚本，例如 `curvine-bench.sh`、`meta-bench.sh`、`java-bench.sh`、`fio-test.sh`。 |
| `curvine-csi/` | 基于 Go 的 CSI 驱动源码与镜像构建资源。 |
| `curvine-docker/` | Docker 构建与部署资源。 |
| `etc/` | 示例配置，包括 `curvine-cluster.toml` 与 `curvine-env.sh`。 |
| `scripts/` | 其它辅助脚本。 |

## 开发环境

### 前置依赖

按参考仓库中的 `rust-toolchain.toml`、`README.md` 与 `README_zh.md`：

- Rust `1.98`（由 `rust-toolchain.toml` 固定；`build/check-env.sh` 接受 1.86 及以上），并安装 `rustfmt`、`clippy`、`rust-analyzer`
- Protobuf `3.x`
- LLVM `12+`
- libfuse2 或 libfuse3 开发包
- JDK `1.8+` 与 Maven `3.8+`
- Node.js / npm `9+`
- Python `3.7+`

按操作系统安装依赖可参考 [环境初始化](/zh-cn/docs/Deploy/Deploy-Curvine-Cluster/Preparation/prerequisites)。

### 克隆与环境检查

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
make check-env
```

`make check-env` 会调用 `build/check-env.sh`。如果后续构建计划跳过 Java SDK，可在检查阶段传入同样的参数：

```bash
make check-env ARGS='--skip-java-sdk'
```

## 构建

`make all` 与 `make build` 都会调用 `build/build.sh`。构建成功后会生成 `build/dist/`，其中包含：

- `conf/`：复制后的配置文件
- `bin/`：启动包装脚本
- `lib/`：编译出的二进制与 jar
- `tests/`：复制后的压测与回归脚本
- `build-version`：commit、OS、FUSE、版本号与 UFS 类型等元数据

### 常用构建命令

```bash
make all
make build ARGS='-p core'
make build ARGS='-p server -p client'
make build ARGS='-p core -p fuse'
make build ARGS='-p web'
make build ARGS='-p tests'
make build ARGS='-d'
make build ARGS='--skip-java-sdk'
make build-hdfs
```

参考 `build/build.sh`，常用参数包括：

- `-p, --package`：`core`、`server`、`client`、`cli`、`web`、`fuse`、`java`、`python`、`rust-sdk`、`tests`、`all`
- `-u, --ufs`：`opendal-s3`、`opendal-oss`、`opendal-azblob`、`opendal-gcs`、`opendal-hdfs`、`opendal-webhdfs`、`oss-hdfs`
- `-d, --debug`：生成 debug 产物
- `--skip-java-sdk`：跳过 Java SDK 打包

如需完整参数说明：

```bash
build/build.sh --help
```

### 格式化与静态检查

```bash
make format
make cargo ARGS='clippy --release --all-targets -- --deny warnings'
```

其中 `make format` 实际执行的是 `build/pre-commit.sh`，不只是单独运行 `cargo fmt`。

## 测试

### Rust 测试

```bash
cargo test --release
```

### 完整测试脚本

在仓库根目录执行：

```bash
build/run-tests.sh
build/run-tests.sh --clippy
build/run-tests.sh --clippy --level warn
```

`build/run-tests.sh` 的实际步骤为：

1. `cargo fmt -- --check`
2. 可选执行 `cargo clippy --release --all-targets -- --<level> warnings`
3. `cargo run --release --example test_cluster`
4. `cargo test --release`

### 从构建产物启动本地集群

```bash
cd build/dist
bin/local-cluster.sh start
bin/local-cluster.sh status
bin/cv report
bin/local-cluster.sh stop
```

也可以手动分别启动组件：

```bash
cd build/dist
bin/curvine-master.sh start
bin/curvine-worker.sh start
bin/curvine-fuse.sh start
bin/cv report
```

## 贡献约定

贡献流程与提交约定应以仓库中的 `CONTRIBUTING.md` 和 `COMMIT_CONVENTION.md` 为准。实践上建议：

- 提交前先格式化代码
- 为所修改的模块运行针对性的测试
- 使用 `feat:`、`fix:`、`docs:` 等 conventional commit 前缀
- 当构建方式、目录布局或运行命令变更时，同步更新文档
