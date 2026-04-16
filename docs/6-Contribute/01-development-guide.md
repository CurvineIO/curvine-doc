---
sidebar_position: 1
---

# Development Guide

This guide summarizes the Curvine development workflow using the main-branch repository layout and scripts in the Curvine source tree.

## Repository Layout

The repository contains a Cargo workspace plus several top-level directories used for packaging, deployment, and testing.

### Cargo workspace crates

`Cargo.toml` lists these workspace members:

| Crate | Role |
|-------|------|
| `orpc` | Async RPC, runtime, logging, and network primitives shared across the project. |
| `curvine-common` | Shared config, protocol types, metadata helpers, and cluster defaults. |
| `curvine-server` | Master and Worker server binary (`--service master` or `--service worker`). |
| `curvine-client` | Rust client, block I/O path, and UFS-facing client logic. |
| `curvine-libsdk` | SDK bindings and Java packaging. |
| `curvine-tests` | Integration tests, benchmark binary, and regression tooling. |
| `curvine-fuse` | FUSE daemon. |
| `curvine-web` | Web UI and management API. |
| `curvine-ufs` | UFS backends and storage integrations. |
| `curvine-cli` | `cv` command-line client. |
| `curvine-s3-gateway` | S3-compatible object gateway. |

### Other top-level directories

| Path | Purpose |
|------|---------|
| `build/` | Build, packaging, launch, benchmark, and test scripts. |
| `build/bin/` | Runtime wrappers such as `curvine-master.sh`, `curvine-worker.sh`, `curvine-fuse.sh`, `cv`, and `local-cluster.sh`. |
| `build/tests/` | Benchmark and regression helpers such as `curvine-bench.sh`, `meta-bench.sh`, `java-bench.sh`, and `fio-test.sh`. |
| `curvine-csi/` | Go-based CSI driver sources and image build assets. |
| `curvine-docker/` | Docker build and deployment assets. |
| `etc/` | Sample configuration, including `curvine-cluster.toml` and `curvine-env.sh`. |
| `scripts/` | Miscellaneous helper scripts. |

## Development Setup

### Prerequisites

Align with `rust-toolchain.toml`, `README.md`, and `README_zh.md` in the reference repository:

- Rust `1.92.0` with `rustfmt`, `clippy`, and `rust-analyzer`
- Protobuf `3.x`
- LLVM `12+`
- libfuse2 or libfuse3 development packages
- JDK `1.8+` and Maven `3.8+`
- Node.js / npm `9+`
- Python `3.7+`

See [Environment Initialization](/docs/Deploy/Deploy-Curvine-Cluster/Preparation/prerequisites) for OS-specific package installation.

### Clone and check the environment

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
make check-env
```

`make check-env` runs `build/check-env.sh`. If you intend to skip Java packaging during the build, pass the same flag here:

```bash
make check-env ARGS='--skip-java-sdk'
```

## Build

`make all` and `make build` both drive `build/build.sh`. A successful build creates `build/dist/` with:

- `conf/` for copied config files
- `bin/` for launch wrappers
- `lib/` for compiled binaries and jars
- `tests/` for copied benchmark and regression scripts
- `build-version` for commit, OS, FUSE, version, and UFS metadata

### Common build commands

```bash
make all
make build ARGS='-p core'
make build ARGS='-p server -p client'
make build ARGS='-p core -p fuse'
make build ARGS='-p object'
make build ARGS='-p tests'
make build ARGS='-d'
make build ARGS='--skip-java-sdk'
make build-hdfs
```

Useful `build/build.sh` options from the reference script:

- `-p, --package`: `core`, `server`, `client`, `cli`, `web`, `fuse`, `java`, `python`, `tests`, `object`, or `all`
- `-u, --ufs`: `opendal-s3`, `opendal-oss`, `opendal-azblob`, `opendal-gcs`, `opendal-hdfs`, `opendal-webhdfs`, or `oss-hdfs`
- `-d, --debug`: build debug artifacts instead of release
- `--skip-java-sdk`: skip Java SDK packaging

Show the script help for the full matrix:

```bash
build/build.sh --help
```

### Formatting and linting

```bash
make format
make cargo ARGS='clippy --release --all-targets -- --deny warnings'
```

`make format` runs `build/pre-commit.sh`, not just `cargo fmt`.

## Test

### Rust tests

```bash
cargo test --release
```

### Full test runner

From the repository root:

```bash
build/run-tests.sh
build/run-tests.sh --clippy
build/run-tests.sh --clippy --level warn
```

`build/run-tests.sh` performs these steps:

1. `cargo fmt -- --check`
2. Optional `cargo clippy --release --all-targets -- --<level> warnings`
3. `cargo run --release --example test_cluster`
4. `cargo test --release`

### Start a local cluster from the built distribution

```bash
cd build/dist
bin/local-cluster.sh start
bin/local-cluster.sh status
bin/cv report
bin/local-cluster.sh stop
```

To launch components manually:

```bash
cd build/dist
bin/curvine-master.sh start
bin/curvine-worker.sh start
bin/curvine-fuse.sh start
bin/cv report
```

## Contribution Conventions

Use the repository’s `CONTRIBUTING.md` and `COMMIT_CONVENTION.md` as the source of truth for workflow expectations. In practice:

- format Rust code before sending changes
- run targeted tests for the area you touched
- use conventional commit prefixes such as `feat:`, `fix:`, and `docs:`
- keep docs in sync with build or runtime behavior when commands or layout change
