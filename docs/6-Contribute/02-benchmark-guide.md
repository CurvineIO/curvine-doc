---
sidebar_position: 2
---

# Benchmark Guide

This guide describes how to run the benchmarks and performance tests provided in the Curvine repository. Scripts and tools are under `build/` and `build/tests/` in the [Curvine source repo](https://github.com/CurvineIO/curvine).

## Overview

- **Metadata benchmark**: Java-based metadata operations (NNBench-style), script `build/tests/meta-bench.sh`.
- **Throughput benchmark**: Rust client or FUSE read/write via `build/tests/curvine-bench.sh`; Java client via `build/tests/java-bench.sh`.
- **FIO benchmark**: FIO against the FUSE mount, script `build/tests/fio-test.sh`.

A running Curvine cluster (Master + Worker; FUSE optional for FUSE benchmarks) is required. Build first with `make all`, then run scripts from `build/dist/` or set `CURVINE_HOME` to the installation directory.

## Prerequisites

- Curvine cluster running (see [Quick Start](/docs/Deploy/quick-start) or [Bare Metal Deployment](/docs/Deploy/Deploy-Curvine-Cluster/Distributed-Mode/Bare-Metal-Deployment)).
- Config at `conf/curvine-cluster.toml`. For metadata/Java benchmarks: Java and Maven; `lib/curvine-hadoop-*shade.jar` (built with Java SDK).

## Running Benchmarks

### Metadata performance (meta-bench)

Script: `build/tests/meta-bench.sh`. Runs Java class `io.curvine.bench.NNBenchWithoutMR` (createWrite, openRead, rename, delete, rmdir). From repo root with `CURVINE_HOME` set to installation (e.g. `build/dist`):

```bash
build/tests/meta-bench.sh createWrite   # or openRead, rename, delete, rmdir
```

See [Metadata Performance Testing](/docs/Benchmark/meta) for details and results.

### Throughput (curvine-bench, java-bench)

**Rust client**: `bin/curvine-bench.sh` runs `lib/curvine-bench`:

```bash
bin/curvine-bench.sh fs.write /fs-bench
bin/curvine-bench.sh fs.read /fs-bench
bin/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
bin/curvine-bench.sh fuse.read /curvine-fuse/fs-bench
```

**Java client**: `bin/java-bench.sh` uses `io.curvine.bench.CurvineBenchV2` with `lib/curvine-hadoop-*shade.jar`.

See [Concurrent Performance Testing](/docs/Benchmark/concurrent) for parameters and examples.

### FIO (fio-test)

Script: `build/tests/fio-test.sh`. Runs FIO against the FUSE mount path (default `/curvine-fuse/fio-test`). FUSE must be mounted.

```bash
bin/fio-test.sh
```

See [FIO Performance Testing](/docs/Benchmark/fio) for commands and result examples.

## Best Practices

1. **Environment Consistency**: Ensure consistent test environment across runs
2. **Baseline Measurements**: Establish baseline performance metrics
3. **Multiple Runs**: Run tests multiple times and average results
4. **Resource Monitoring**: Monitor system resources during tests
5. **Documentation**: Document test configurations and results

## Troubleshooting

- Check cluster health before running benchmarks
- Verify network connectivity between test clients and cluster
- Monitor system logs for errors during testing
- Ensure sufficient resources (CPU, memory, disk) are available