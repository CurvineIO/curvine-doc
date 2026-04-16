---
sidebar_position: 3
---

# Debugging Guide

This guide summarizes the runtime files, logging paths, ports, and common debugging entrypoints in the Curvine reference repository.

## Configuration File

The default cluster configuration file is:

```text
build/dist/conf/curvine-cluster.toml
```

The sample source file lives at `etc/curvine-cluster.toml`. Relevant sections in that file include:

- `[master]`
- `[journal]`
- `[worker]`
- `[client]`
- `[fuse]`
- `[log]`
- `[s3_gateway]`
- `[cli]`

Runtime overrides referenced by the scripts include:

- `CURVINE_CONF_FILE`
- `CURVINE_MASTER_HOSTNAME`
- `CURVINE_WORKER_HOSTNAME`
- `CURVINE_CLIENT_HOSTNAME`

## Wrapper Scripts and Runtime Files

The wrappers under `build/dist/bin/` source `conf/curvine-env.sh` and then delegate to the binaries under `build/dist/lib/`.

For `master`, `worker`, and `fuse`, `build/bin/launch-process.sh` also manages:

- pid files at `$CURVINE_HOME/<service>.pid`
- stdout/stderr capture at `$CURVINE_HOME/logs/<service>.out`
- default config path `CURVINE_CONF_FILE=$CURVINE_HOME/conf/curvine-cluster.toml`

This means `logs/master.out`, `logs/worker.out`, and `logs/fuse.out` are the first places to look when a wrapper-started process fails before structured logging is configured.

## Logging Configuration

The sample config uses these defaults:

### Master

```toml
[master]
log = { level = "info", log_dir = "stdout", file_name = "master.log" }
```

### Worker

```toml
[worker]
log = { level = "info", log_dir = "stdout", file_name = "worker.log" }
```

### Client and FUSE

```toml
[log]
level = "info"
log_dir = "stdout"
file_name = "curvine.log"
```

### CLI

```toml
[cli]
log = { level = "warn", log_dir = "stdout", file_name = "cli.log" }
```

When `log_dir = "stdout"` and you start a component through the shell wrappers, structured logs land in the matching `logs/*.out` file because stdout is redirected there. If you set `log_dir` to a directory path instead, inspect the configured log file directly.

For deeper debugging, raise the relevant section to `debug` or `trace`.

## Startup Commands

| Component | Wrapper command | Effective binary |
|-----------|-----------------|------------------|
| Master | `bin/curvine-master.sh start` | `lib/curvine-server --service master --conf $CURVINE_CONF_FILE` |
| Worker | `bin/curvine-worker.sh start` | `lib/curvine-server --service worker --conf $CURVINE_CONF_FILE` |
| FUSE | `bin/curvine-fuse.sh start` | `lib/curvine-fuse ... --conf $CURVINE_CONF_FILE` |
| Local cluster | `bin/local-cluster.sh start` | starts Master then Worker through the wrappers |
| S3 gateway | `bin/curvine-s3-gateway.sh start` | `lib/curvine-s3-gateway` |
| CLI | `bin/cv ...` | `lib/curvine-cli` |

`bin/curvine-fuse.sh` defaults to mount path `/curvine-fuse`, but accepts `--mnt-path` and passes the rest of the arguments through.

## Default Ports

These defaults come from `curvine-common/src/conf/cluster_conf.rs` and the sample config:

| Service | Default port | Source |
|---------|--------------|--------|
| Master RPC | `8995` | `DEFAULT_MASTER_PORT` |
| Raft / journal | `8996` | `DEFAULT_RAFT_PORT` |
| Worker RPC | `8997` | `DEFAULT_WORKER_PORT` |
| Master web / metrics | `9000` | `DEFAULT_MASTER_WEB_PORT` |
| Worker web / metrics | `9001` | `DEFAULT_WORKER_WEB_PORT` |
| FUSE web / metrics | `9002` | `DEFAULT_FUSE_WEB_PORT` |
| S3 gateway listen | `9900` | `[s3_gateway].listen` sample config |

## Common Debugging Flows

### Service will not start

1. Check the wrapper output file:

   ```bash
   tail -n 100 build/dist/logs/master.out
   tail -n 100 build/dist/logs/worker.out
   tail -n 100 build/dist/logs/fuse.out
   ```

2. Confirm the config path:

   ```bash
   echo "$CURVINE_CONF_FILE"
   ```

3. Confirm the pid file is not stale:

   ```bash
   ls build/dist/*.pid
   ```

### Master or Worker connectivity issues

Use `nc` or `telnet` from the client or another node:

```bash
nc -vz <master-host> 8995
nc -vz <worker-host> 8997
```

Then verify the cluster config and any hostname overrides:

- `CURVINE_MASTER_HOSTNAME`
- `CURVINE_WORKER_HOSTNAME`
- journal and client addresses in `conf/curvine-cluster.toml`

### Cluster looks unhealthy

Use the built CLI and the helper script first:

```bash
cd build/dist
bin/local-cluster.sh status
bin/cv report
bin/cv node
```

### Metrics and performance inspection

```bash
curl http://<master>:9000/metrics
curl http://<worker>:9001/metrics
```

Then inspect the host with tools such as `htop`, `iostat -x 1`, `sar -n DEV 1`, or `perf record -g`.

### FUSE mount problems

1. Check whether the mount exists:

   ```bash
   mount | grep curvine
   ```

2. If needed, run FUSE manually with an explicit mount path:

   ```bash
   build/dist/lib/curvine-fuse --conf build/dist/conf/curvine-cluster.toml --mnt-path /mnt/curvine
   ```

3. Verify FUSE permissions:

   ```bash
   ls -l /dev/fuse
   groups "$USER"
   ```

## Low-Level Tools

- `gdb` for native debugging and core inspection
- `strace -f -e trace=network ...` for connection issues
- `perf` for CPU profiling
- `bin/cv fs ...` for path-level checks from the Curvine client side

## Core Dumps

```bash
ulimit -c unlimited
gdb build/dist/lib/curvine-server /tmp/core.curvine-server.12345
```

Inside gdb, start with `bt` and `info threads`.

## Reporting Issues

When you file a bug, include:

- OS and architecture
- Curvine version or commit
- the exact wrapper command or binary command used
- relevant config with secrets removed
- the matching `logs/*.out` or structured log file excerpt
- any metrics or reproduction steps
