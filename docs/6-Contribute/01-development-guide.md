---
sidebar_position: 1
---

# Development Guide

This guide describes how to set up the Curvine development environment, project layout, and how to build and run tests, based on the [Curvine source repository](https://github.com/CurvineIO/curvine).

## Project Layout

The repository is a Cargo workspace. Main directories and crates:

```
.
├── build/                 # Build and test scripts
│   ├── bin/               # Shell wrappers (curvine-master.sh, curvine-worker.sh, cv, etc.)
│   ├── build.sh           # Main build script (-p package, -u ufs, etc.)
│   ├── check-env.sh       # Dependency check
│   ├── run-tests.sh       # Format, clippy, cargo test with test cluster
│   └── tests/             # Benchmark/regression scripts (meta-bench.sh, curvine-bench.sh, fio-test.sh, ...)
├── Cargo.toml             # Workspace definition
├── rust-toolchain.toml    # Rust version (e.g. 1.92.0)
├── orpc/                  # RPC and runtime library (used by server and client)
├── curvine-common/        # Shared types, config, protocol, Raft, UFS traits
├── curvine-server/        # Master and Worker (single binary: --service master|worker)
├── curvine-client/        # Rust client and block I/O
├── curvine-cli/           # cv CLI (mount, fs, load, report, node, etc.)
├── curvine-fuse/          # FUSE filesystem daemon
├── curvine-ufs/           # UFS implementations (OpenDAL-based: S3, HDFS, etc.)
├── curvine-libsdk/        # Multi-language SDK (Java, Python, Rust)
├── curvine-s3-gateway/    # S3-compatible object gateway
├── curvine-web/           # Web UI and management API
├── curvine-tests/         # Integration tests and test utilities
├── curvine-csi/           # Kubernetes CSI driver (Go)
├── curvine-docker/        # Dockerfiles (compile, deploy, fluid)
└── etc/                   # Sample config (curvine-cluster.toml, curvine-env.sh)
```

**Crate roles (from workspace members):**

| Crate | Role |
|-------|------|
| **orpc** | Async RPC, runtime, logging, network; used by server and client. |
| **curvine-common** | Config (`ClusterConf`, `MasterConf`, `WorkerConf`, etc.), protos, Raft storage, shared state types. |
| **curvine-server** | Master (metadata, journal, WorkerManager) and Worker (block store, read/write handlers); one binary, `--service master` or `--service worker`. |
| **curvine-client** | Client API, block reader/writer, unified filesystem (UFS + Curvine path resolution). |
| **curvine-cli** | `cv` command: mount, umount, fs, load, load-status, report, node, version. |
| **curvine-fuse** | FUSE daemon; translates POSIX calls into Curvine RPC. |
| **curvine-ufs** | UFS backends (OpenDAL operators for S3, HDFS, WebHDFS, etc.). |
| **curvine-libsdk** | Java (Hadoop), Python, Rust SDK bindings. |
| **curvine-s3-gateway** | S3-compatible HTTP API (Axum). |
| **curvine-web** | Web UI and HTTP API for cluster management. |
| **curvine-tests** | Integration tests; `test_cluster` example for local cluster. |

## Development Setup

### Prerequisites

Align with the repository’s [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md) and [rust-toolchain.toml](https://github.com/CurvineIO/curvine/blob/main/rust-toolchain.toml):

- **Rust**: Version specified in `rust-toolchain.toml` (e.g. 1.92.0); components: `rustfmt`, `clippy`, `rust-analyzer`.
- **Protobuf**: 3.x (e.g. 27.2) for proto compilation.
- **LLVM**: Required by some dependencies (e.g. bindgen).
- **FUSE**: libfuse2 or libfuse3 dev packages for building `curvine-fuse`.
- **Java / Maven**: For Java SDK and meta-bench (e.g. JDK 1.8+, Maven 3.8+).
- **Node.js / npm**: For Web UI (e.g. npm 9+).
- **Python**: 3.7+ for scripts and Python SDK.

Detailed install steps per OS are in the doc [Environment Initialization](/docs/Deploy/Deploy-Curvine-Cluster/Preparation/prerequisites).

### Clone and check environment

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
```

Check that required tools are available:

```bash
make check-env
# or: build/check-env.sh
```

## Build

- **Full build (release)**  
  Output is under `build/dist/` (binaries in `lib/`, scripts in `bin/`, config in `conf/`):

  ```bash
  make all
  # or: make build
  # internally runs: build/build.sh
  ```

- **Partial build**  
  Use `build/build.sh` options via `make build ARGS='...'`:

  ```bash
  make build ARGS='-p core'              # server, client, cli
  make build ARGS='-p core -p fuse'      # + FUSE
  make build ARGS='-p object'            # S3 gateway
  make build ARGS='-d'                   # debug build
  make build-hdfs                        # with HDFS support
  make build ARGS='--skip-java-sdk'      # skip Java SDK
  ```

- **Format and lint**

  ```bash
  make format        # cargo fmt + pre-commit hooks
  make cargo ARGS='clippy --release --all-targets -- --deny warnings'
  ```

See [Download and Compile Curvine](/docs/Deploy/Deploy-Curvine-Cluster/Preparation/compile) for more build options and Docker-based builds.

## Test

- **Rust unit tests**  
  No cluster needed:

  ```bash
  cargo test --release
  # or: make cargo ARGS='test --release'
  ```

- **Integration tests (with test cluster)**  
  `run-tests.sh` checks format, optionally clippy, starts a test cluster (`cargo run --release --example test_cluster`), then runs `cargo test --release`:

  ```bash
  build/run-tests.sh              # fmt + cargo test (with test cluster)
  build/run-tests.sh --clippy      # also run clippy (default: deny warnings)
  build/run-tests.sh --level warn  # clippy with warn level
  ```

- **Run a local cluster manually**  
  From `build/dist/` (after `make all`):

  ```bash
  export CURVINE_MASTER_HOSTNAME=localhost
  bin/curvine-master.sh start
  bin/curvine-worker.sh start
  # optional: bin/curvine-fuse.sh start
  ```

  Or use the workspace helper (if available):

  ```bash
  bin/local-cluster.sh
  ```

## Code style and contribution

- **Rust**: `cargo fmt`; `cargo clippy` with project policy (e.g. deny warnings in CI).
- **Commits**: Prefer conventional commits (`feat:`, `fix:`, `docs:`, etc.); see [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md) and any `COMMIT_CONVENTION.md` in the repo.
- **PRs**: Branch from `main`; include tests and doc updates; ensure CI passes.

For contribution workflow, labels, and community links, see the repository’s [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md).
