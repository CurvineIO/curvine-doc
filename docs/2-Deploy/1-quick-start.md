---
sidebar_position: 0
---

# Quick Start

This chapter shows the shortest path to bring up a single-node Curvine cluster from a release package or a local `build/dist` directory, then verify that CLI and FUSE access both work.

## Start from a Release Package

Download the prebuilt package from https://github.com/CurvineIO/curvine/releases. If your target environment is not covered by a published package, build from source first; see [Download and Compile Curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md).

The release directory contains at least:

```text
.
├── bin
├── conf
├── lib
└── webui
```

From the extracted package directory, start a local cluster:

```bash
export CURVINE_MASTER_HOSTNAME=localhost
./bin/restart-all.sh
```

`restart-all.sh` stops any previous Curvine processes, unmounts `/curvine-fuse` if needed, then starts:

- `curvine-master`
- `curvine-worker`
- `curvine-fuse`

The Web UI is not started as a separate process. Static UI assets are bundled in `webui/` and served on the service web ports.

:::warning
`CURVINE_MASTER_HOSTNAME=localhost` is suitable for single-node local use. In multi-node or containerized environments, set `CURVINE_MASTER_HOSTNAME`, `CURVINE_WORKER_HOSTNAME`, and `CURVINE_CLIENT_HOSTNAME` to addresses that other nodes and clients can actually reach.
:::

By default, FUSE is mounted at `/curvine-fuse`.

## Verify the Cluster

Use the native CLI to confirm that Master and Worker are reachable:

```bash
bin/cv report
```

Create a test directory and list it back:

```bash
bin/cv fs mkdir /quick-start
bin/cv fs ls /
```

You can also validate the FUSE path directly:

```bash
mkdir -p /curvine-fuse/quick-start
ls -la /curvine-fuse
```

## Optional Compatibility Shell

The release also includes `bin/dfs`, a compatibility wrapper for Hadoop-style `fs` commands:

```bash
bin/dfs fs -ls /
bin/dfs fs -mkdir -p /compat-demo
```

Use `cv` for the full Curvine-native command set. Use `dfs` only when you specifically need Hadoop shell style.

## Web UI

After startup, the main web endpoints are:

- Master: `http://<host>:9000`
- Worker: `http://<host>:9001`

## About Benchmark Scripts

The benchmark and stress-test scripts live in the source tree under `build/tests/`; they are not the primary entry point of a release-package quick start. For throughput and FIO testing, refer to the Benchmark and Contribute sections instead of using this page as a benchmark guide.
