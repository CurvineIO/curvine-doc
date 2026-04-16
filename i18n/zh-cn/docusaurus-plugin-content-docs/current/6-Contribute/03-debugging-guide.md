---
sidebar_position: 3
---

# 调试指南

本文总结 Curvine 参考仓库中的运行时文件、日志路径、默认端口以及常见调试入口。

## 配置文件

默认集群配置文件为：

```text
build/dist/conf/curvine-cluster.toml
```

源码中的示例文件位于 `etc/curvine-cluster.toml`。其中常见配置段包括：

- `[master]`
- `[journal]`
- `[worker]`
- `[client]`
- `[fuse]`
- `[log]`
- `[s3_gateway]`
- `[cli]`

脚本中涉及的运行时环境变量包括：

- `CURVINE_CONF_FILE`
- `CURVINE_MASTER_HOSTNAME`
- `CURVINE_WORKER_HOSTNAME`
- `CURVINE_CLIENT_HOSTNAME`

## 包装脚本与运行时文件

`build/dist/bin/` 下的包装脚本会先 source `conf/curvine-env.sh`，再调用 `build/dist/lib/` 下的实际二进制。

对于 `master`、`worker`、`fuse`，`build/bin/launch-process.sh` 还会统一管理：

- pid 文件：`$CURVINE_HOME/<service>.pid`
- stdout/stderr 输出：`$CURVINE_HOME/logs/<service>.out`
- 默认配置路径：`CURVINE_CONF_FILE=$CURVINE_HOME/conf/curvine-cluster.toml`

因此，如果通过包装脚本启动后立即失败，优先检查 `logs/master.out`、`logs/worker.out`、`logs/fuse.out`。

## 日志配置

示例配置中的默认值如下。

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

### Client 与 FUSE

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

当 `log_dir = "stdout"` 且组件通过包装脚本启动时，结构化日志最终会进入对应的 `logs/*.out` 文件，因为包装脚本把 stdout 重定向到了这些文件。若将 `log_dir` 改成目录路径，则需要直接查看该目录下的日志文件。

调试时建议将相关组件的日志级别提升到 `debug` 或 `trace`。

## 启动命令

| 组件 | 包装脚本命令 | 实际二进制 |
|------|--------------|------------|
| Master | `bin/curvine-master.sh start` | `lib/curvine-server --service master --conf $CURVINE_CONF_FILE` |
| Worker | `bin/curvine-worker.sh start` | `lib/curvine-server --service worker --conf $CURVINE_CONF_FILE` |
| FUSE | `bin/curvine-fuse.sh start` | `lib/curvine-fuse ... --conf $CURVINE_CONF_FILE` |
| 本地集群 | `bin/local-cluster.sh start` | 依次通过包装脚本启动 Master 与 Worker |
| S3 网关 | `bin/curvine-s3-gateway.sh start` | `lib/curvine-s3-gateway` |
| CLI | `bin/cv ...` | `lib/curvine-cli` |

`bin/curvine-fuse.sh` 默认挂载点为 `/curvine-fuse`，也支持通过 `--mnt-path` 传入自定义挂载点。

## 默认端口

这些默认值来自 `curvine-common/src/conf/cluster_conf.rs` 与示例配置：

| 服务 | 默认端口 | 来源 |
|------|----------|------|
| Master RPC | `8995` | `DEFAULT_MASTER_PORT` |
| Raft / journal | `8996` | `DEFAULT_RAFT_PORT` |
| Worker RPC | `8997` | `DEFAULT_WORKER_PORT` |
| Master Web / metrics | `9000` | `DEFAULT_MASTER_WEB_PORT` |
| Worker Web / metrics | `9001` | `DEFAULT_WORKER_WEB_PORT` |
| FUSE Web / metrics | `9002` | `DEFAULT_FUSE_WEB_PORT` |
| S3 网关监听 | `9900` | 示例配置中的 `[s3_gateway].listen` |

## 常见调试流程

### 服务启动失败

1. 先查看包装脚本输出文件：

   ```bash
   tail -n 100 build/dist/logs/master.out
   tail -n 100 build/dist/logs/worker.out
   tail -n 100 build/dist/logs/fuse.out
   ```

2. 确认配置路径：

   ```bash
   echo "$CURVINE_CONF_FILE"
   ```

3. 检查 pid 文件是否陈旧：

   ```bash
   ls build/dist/*.pid
   ```

### Master / Worker 连通性问题

在客户端或其它节点上使用 `nc` 或 `telnet`：

```bash
nc -vz <master-host> 8995
nc -vz <worker-host> 8997
```

然后检查集群配置与 hostname 覆盖：

- `CURVINE_MASTER_HOSTNAME`
- `CURVINE_WORKER_HOSTNAME`
- `conf/curvine-cluster.toml` 中的 journal 和 client 地址

### 集群状态异常

优先使用脚本和 CLI：

```bash
cd build/dist
bin/local-cluster.sh status
bin/cv report
bin/cv node
```

### 指标与性能分析

```bash
curl http://<master>:9000/metrics
curl http://<worker>:9001/metrics
```

然后结合 `htop`、`iostat -x 1`、`sar -n DEV 1`、`perf record -g` 等系统工具继续分析。

### FUSE 挂载问题

1. 检查挂载是否存在：

   ```bash
   mount | grep curvine
   ```

2. 如有需要，手动运行 FUSE：

   ```bash
   build/dist/lib/curvine-fuse --conf build/dist/conf/curvine-cluster.toml --mnt-path /mnt/curvine
   ```

3. 检查 FUSE 权限：

   ```bash
   ls -l /dev/fuse
   groups "$USER"
   ```

## 低层调试工具

- `gdb`：本地调试和 core 分析
- `strace -f -e trace=network ...`：排查连接问题
- `perf`：CPU Profiling
- `bin/cv fs ...`：从 Curvine 客户端视角检查路径与元数据

## Core Dump

```bash
ulimit -c unlimited
gdb build/dist/lib/curvine-server /tmp/core.curvine-server.12345
```

进入 gdb 后优先执行 `bt` 和 `info threads`。

## 反馈问题时建议附带的信息

- 操作系统与架构
- Curvine 版本或 commit
- 精确的包装脚本命令或二进制命令
- 已脱敏的相关配置
- 对应的 `logs/*.out` 或结构化日志片段
- 指标信息与复现步骤
