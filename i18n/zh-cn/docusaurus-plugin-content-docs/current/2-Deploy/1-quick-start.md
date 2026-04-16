---
sidebar_position: 0
---

# 快速开始

本章节介绍如何从 release 包或本地 `build/dist` 目录快速拉起一个单机 Curvine 集群，并验证 CLI 与 FUSE 都可正常工作。

## 从 Release 包启动

从 https://github.com/CurvineIO/curvine/releases 下载预编译包。如果你的目标环境没有现成发布包，请先从源码编译，参考 [下载和编译 Curvine](./2-Deploy-Curvine-Cluster/1-Preparation/02-compile.md)。

解压后的目录至少包含：

```text
.
├── bin
├── conf
├── lib
└── webui
```

在解压目录下启动本地集群：

```bash
export CURVINE_MASTER_HOSTNAME=localhost
./bin/restart-all.sh
```

`restart-all.sh` 会先停止旧的 Curvine 进程、按需卸载 `/curvine-fuse`，然后启动：

- `curvine-master`
- `curvine-worker`
- `curvine-fuse`

这里的 Web UI 不是独立进程；静态页面资源打包在 `webui/` 中，通过服务自身的 Web 端口提供访问。

:::warning
`CURVINE_MASTER_HOSTNAME=localhost` 只适合本机单节点测试。多机或容器环境下，请显式设置 `CURVINE_MASTER_HOSTNAME`、`CURVINE_WORKER_HOSTNAME`、`CURVINE_CLIENT_HOSTNAME` 为实际可达地址。
:::

默认 FUSE 挂载点为 `/curvine-fuse`。

## 验证集群可用

先用原生 CLI 确认 Master / Worker 已可访问：

```bash
bin/cv report
```

再创建一个测试目录并回读：

```bash
bin/cv fs mkdir /quick-start
bin/cv fs ls /
```

也可以直接验证 FUSE 挂载路径：

```bash
mkdir -p /curvine-fuse/quick-start
ls -la /curvine-fuse
```

## 兼容命令入口

release 包还包含 `bin/dfs`，用于 Hadoop 风格的兼容 `fs` 命令：

```bash
bin/dfs fs -ls /
bin/dfs fs -mkdir -p /compat-demo
```

完整的 Curvine 原生命令集请优先使用 `cv`；只有在明确需要 Hadoop Shell 风格时才使用 `dfs`。

## Web UI

启动后，常用 Web 入口为：

- Master：`http://<host>:9000`
- Worker：`http://<host>:9001`

## 关于压测脚本

基准测试和压测脚本位于源码树的 `build/tests/` 下，不是 release 包快速开始的主入口。吞吐、FIO、元数据压测请参考 Benchmark 和 Contribute 章节，不要把本页当成压测指南使用。
