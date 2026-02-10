---
sidebar_position: 3
---

# 调试指南

本文说明如何配置日志、查看日志与指标，以及如何基于 [Curvine 源码仓库](https://github.com/CurvineIO/curvine) 中的配置与二进制调试各组件。

## 配置文件

所有服务端与客户端组件共用 **集群配置文件**。默认路径为 `conf/curvine-cluster.toml`（相对于进程工作目录；从 `build/dist/` 启动时即该目录）。仓库示例在 `etc/curvine-cluster.toml`。

配置为 TOML；主要段落包括 `[master]`、`[worker]`、`[journal]`、`[client]`、`[fuse]`、`[log]`、`[cli]`、`[s3_gateway]`。环境变量可覆盖：`CURVINE_MASTER_HOSTNAME`、`CURVINE_WORKER_HOSTNAME`、`CURVINE_CLIENT_HOSTNAME`、`CURVINE_CONF_FILE`。

## 日志配置

日志使用 orpc 的 **LogConf**：`level`、`log_dir`、`file_name`。若 `log_dir` 为 `stdout`（或空），则输出到标准输出；否则写入 `log_dir` 下文件。

### Master

在 `curvine-cluster.toml` 中：

```toml
[master]
# ...
log = { level = "info", log_dir = "stdout", file_name = "master.log" }
```

- **level**：`trace`、`debug`、`info`、`warn`、`error`。
- **log_dir**：控制台用 `stdout`，或填写目录路径则写文件。
- **file_name**：日志文件名（如 `master.log`）。

### Worker

```toml
[worker]
# ...
log = { level = "info", log_dir = "stdout", file_name = "worker.log" }
```

### 客户端 / FUSE / 共用日志

全局 `[log]` 被客户端库与 FUSE（Rust/Java/FUSE 客户端）使用：

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

**调试时**可将对应段落设为 `level = "debug"`（或 `trace`）。例如 Master 与客户端：

```toml
[master]
log = { level = "debug", log_dir = "stdout", file_name = "master.log" }

[log]
level = "debug"
log_dir = "stdout"
file_name = "curvine.log"
```

## 二进制与启动方式

| 组件 | 启动方式 | 二进制 / 脚本 |
|------|----------|----------------|
| Master | `bin/curvine-master.sh start` | `lib/curvine-server --service master --conf conf/curvine-cluster.toml` |
| Worker | `bin/curvine-worker.sh start` | `lib/curvine-server --service worker --conf conf/curvine-cluster.toml` |
| FUSE | `bin/curvine-fuse.sh start` | `lib/curvine-fuse`（可传 `--conf`、`--mnt-path` 等） |
| S3 网关 | `bin/curvine-s3-gateway.sh start` | `lib/curvine-s3-gateway` |
| CLI | `bin/cv` | `lib/curvine-cli` |

脚本从 `conf/curvine-env.sh`（在 `build/dist/` 下）读取 `CURVINE_HOME`；二进制位于 `$CURVINE_HOME/lib/`。

## 默认端口

来自 curvine-common 默认值：

| 服务 | 默认端口 | 配置项 |
|------|----------|--------|
| Master RPC | 8995 | `[master]` `rpc_port` |
| Master Web（指标/API） | 9000 | `[master]` `web_port` |
| Raft（journal） | 8996 | `[journal]` `journal_addrs[].port` |
| Worker RPC | 8997 | `[worker]` `rpc_port` |
| Worker Web | 9001 | `[worker]` `web_port` |
| FUSE 指标 | 9002 | `[fuse]` `web_port` |
| S3 网关 | 9900 | `[s3_gateway]` `listen` |

可用于连通性检查与指标采集（如 Prometheus）。

## 常见调试场景

### Master / Worker 无法连接

1. **连通性**：在客户端或其它节点执行 `telnet <master-host> 8995`（Master RPC）、`telnet <worker-host> 8997`（Worker RPC）。  
2. **配置**：Worker 的 `[worker]` 与 `master_addrs`（或 client 配置）须指向 Master RPC 地址（host:8995）；多节点时可设置 `CURVINE_MASTER_HOSTNAME` / `CURVINE_WORKER_HOSTNAME`。  
3. **日志**：若写文件，查看 master/worker 的 `log_dir`/`file_name`（如 `tail -f /var/log/curvine/master.log`）；若 `log_dir = "stdout"` 则查看终端或 systemd/journal。

### 性能问题

1. **指标**：Master `curl http://<master>:9000/metrics`，Worker `curl http://<worker>:9001/metrics`（端口以配置为准）。  
2. **系统**：使用 `htop`、`iostat -x 1`、`sar -n DEV 1` 查看 CPU、磁盘、网络。  
3. **Profiling**：用 `perf record -g` 或其它 profiler 运行二进制；Rust 建议带 debug 符号（debug 构建或 release 开启 debuginfo）。

### FUSE 挂载问题

1. **挂载**：检查 `mount | grep curvine`；卸载 `fusermount -u /curvine-fuse`（或你使用的 `--mnt-path`）。  
2. **FUSE 调试**：将 `[log]` 或 `[fuse]` 的 `level` 设为 `debug`，或手动运行 `lib/curvine-fuse --conf conf/curvine-cluster.toml --mnt-path /mnt/curvine` 观察输出。  
3. **权限**：`ls -la /dev/fuse`；确认用户属于 `fuse` 组：`groups $USER`。

## 调试工具

- **CLI**：`bin/cv report`、`bin/cv node`、`bin/cv fs ls ...` 查看集群与路径（见 [命令行工具](../../3-User-Manuals/2-Operations/02-cli.md)）。  
- **gdb**：在 gdb 下运行或挂载进程；core 需先 `ulimit -c unlimited` 并设置 `kernel.core_pattern`。  
- **strace**：跟踪系统调用（如 `strace -f -e trace=network ./lib/curvine-server --service worker --conf conf/curvine-cluster.toml`）。

## Core 分析

1. 开启 core：`ulimit -c unlimited`；Linux 可设置 `echo '/tmp/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern`。  
2. 用 gdb 打开：`gdb $CURVINE_HOME/lib/curvine-server /tmp/core.curvine-server.12345`，然后 `bt`、`info threads`。

## 获取帮助

- [GitHub Issues](https://github.com/CurvineIO/curvine/issues) 提交缺陷与功能建议。  
- [CONTRIBUTING.md](https://github.com/CurvineIO/curvine/blob/main/CONTRIBUTING.md) 查看贡献与社区链接。

反馈问题时请包含：操作系统、Curvine 版本（或 git commit）、相关配置（脱敏）、以及故障时间段的日志或指标片段。
