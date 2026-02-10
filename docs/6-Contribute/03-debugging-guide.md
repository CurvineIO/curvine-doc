---
sidebar_position: 3
---

# Debugging Guide

This guide describes how to configure logging, locate logs and metrics, and debug Curvine components using the configuration and binaries from the [Curvine source repository](https://github.com/CurvineIO/curvine).

## Configuration file

All server and client components use the **cluster configuration file**. The default path is `conf/curvine-cluster.toml` (relative to the process working directory when started from `build/dist/`). Sample config is in the repo under `etc/curvine-cluster.toml`.

Config is TOML; main sections include `[master]`, `[worker]`, `[journal]`, `[client]`, `[fuse]`, `[log]`, `[cli]`, `[s3_gateway]`. Environment overrides: `CURVINE_MASTER_HOSTNAME`, `CURVINE_WORKER_HOSTNAME`, `CURVINE_CLIENT_HOSTNAME`, `CURVINE_CONF_FILE`.

## Logging configuration

Logging uses the **LogConf** structure (from the orpc library): `level`, `log_dir`, `file_name`. If `log_dir` is `stdout` (or empty), logs go to standard output; otherwise they are written to files under `log_dir`.

### Master

In `curvine-cluster.toml`:

```toml
[master]
# ...
log = { level = "info", log_dir = "stdout", file_name = "master.log" }
```

- **level**: `trace`, `debug`, `info`, `warn`, `error`.
- **log_dir**: `stdout` for console, or a directory path for file output.
- **file_name**: Base name for the log file (e.g. `master.log`).

### Worker

```toml
[worker]
# ...
log = { level = "info", log_dir = "stdout", file_name = "worker.log" }
```

### Client / FUSE / shared client-side log

The global `[log]` section is used by the client library and FUSE (Rust/Java/FUSE clients):

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

For **debugging**, set the relevant section to `level = "debug"` (or `trace` for very verbose). Example for master and client:

```toml
[master]
log = { level = "debug", log_dir = "stdout", file_name = "master.log" }

[log]
level = "debug"
log_dir = "stdout"
file_name = "curvine.log"
```

## Binaries and startup

| Component | How it is started | Binary / script |
|-----------|-------------------|------------------|
| Master | `bin/curvine-master.sh start` | `lib/curvine-server --service master --conf conf/curvine-cluster.toml` |
| Worker | `bin/curvine-worker.sh start` | `lib/curvine-server --service worker --conf conf/curvine-cluster.toml` |
| FUSE | `bin/curvine-fuse.sh start` | `lib/curvine-fuse` (options passed through, e.g. `--conf`, `--mnt-path`) |
| S3 gateway | `bin/curvine-s3-gateway.sh start` | `lib/curvine-s3-gateway` |
| CLI | `bin/cv` | `lib/curvine-cli` |

Scripts read `CURVINE_HOME` from `conf/curvine-env.sh` (under `build/dist/`); binaries are under `$CURVINE_HOME/lib/`.

## Default ports

From `curvine-common` defaults:

| Service | Default port | Config key |
|---------|--------------|------------|
| Master RPC | 8995 | `[master]` `rpc_port` |
| Master Web (metrics/API) | 9000 | `[master]` `web_port` |
| Raft (journal) | 8996 | `[journal]` `journal_addrs[].port` |
| Worker RPC | 8997 | `[worker]` `rpc_port` |
| Worker Web | 9001 | `[worker]` `web_port` |
| FUSE metrics | 9002 | `[fuse]` `web_port` |
| S3 gateway | 9900 | `[s3_gateway]` `listen` |

Use these to check connectivity and to scrape metrics (e.g. Prometheus).

## Common debugging scenarios

### Master / Worker not connecting

1. **Connectivity**  
   From the client or another node: `telnet <master-host> 8995` (Master RPC), `telnet <worker-host> 8997` (Worker RPC).

2. **Config**  
   - Worker: `[worker]` and `master_addrs` (or client section) must point to the Master RPC address (host:8995).  
   - Multi-node: set `CURVINE_MASTER_HOSTNAME` / `CURVINE_WORKER_HOSTNAME` if hostnames in config are wrong.

3. **Logs**  
   If logs go to files, check `log_dir`/`file_name` for master and worker (e.g. `tail -f /var/log/curvine/master.log`). If `log_dir = "stdout"`, look at the terminal or systemd/journal output.

### Performance issues

1. **Metrics**  
   - Master: `curl http://<master>:9000/metrics` (or the port in `[master]` `web_port`).  
   - Worker: `curl http://<worker>:9001/metrics`.

2. **System**  
   Use `htop`, `iostat -x 1`, `sar -n DEV 1` to check CPU, disk, and network.

3. **Profiling**  
   Run the binary under `perf record -g` or your preferred profiler; for Rust, debug symbols (e.g. debug build or `release` with debuginfo) improve traces.

### FUSE mount issues

1. **Mount**  
   - Check: `mount | grep curvine`.  
   - Unmount: `fusermount -u /curvine-fuse` (or the path you used with `--mnt-path`).

2. **Debug FUSE**  
   Run FUSE with debug logging: set `[log]` or `[fuse]` log `level = "debug"`, or run manually:  
   `lib/curvine-fuse --conf conf/curvine-cluster.toml --mnt-path /mnt/curvine` and watch stdout.

3. **Permissions**  
   - `ls -la /dev/fuse`  
   - User in `fuse` group: `groups $USER`.

## Debugging tools

- **CLI**: `bin/cv report`, `bin/cv node`, `bin/cv fs ls ...` to inspect cluster and paths (see [CLI](../../3-User-Manuals/2-Operations/02-cli.md)).
- **gdb**: Run the binary under gdb or attach; for core dumps, enable with `ulimit -c unlimited` and set `kernel.core_pattern` if needed.
- **strace**: Trace system calls for the process (e.g. `strace -f -e trace=network ./lib/curvine-server --service worker --conf conf/curvine-cluster.toml`).

## Core dump analysis

1. Enable core dumps:
   ```bash
   ulimit -c unlimited
   # Linux: echo '/tmp/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern
   ```

2. Open in gdb:
   ```bash
   gdb $CURVINE_HOME/lib/curvine-server /tmp/core.curvine-server.12345
   (gdb) bt
   (gdb) info threads
   ```

## Getting help

- [GitHub Issues](https://github.com/CurvineIO/curvine/issues) for bugs and feature requests.
- [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md) for contribution and community links.

When reporting issues, include: OS, Curvine version (or git commit), relevant config (redact secrets), and log snippets or metrics around the failure time.
