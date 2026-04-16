---
sidebar_position: 1
---

# 单机模式

本章说明如何从 `build/dist` 启动本地 Curvine 集群，以及发行包内置脚本的真实行为。

## 启动本地集群

先完成编译或解压 release 包，然后在 `build/dist` 下执行：

```bash
cd build/dist
./bin/restart-all.sh
```

`restart-all.sh` 会依次执行：

1. 对 `/curvine-fuse` 做懒卸载（若仍处于挂载状态）
2. 杀掉旧的 Curvine 进程
3. 启动 `curvine-master`
4. 启动 `curvine-worker`
5. 启动 `curvine-fuse`

它不会额外启动独立的 `webui` 进程；Web 页面通过服务自身的 Web 端口和打包在 `webui/` 下的静态资源提供。

:::tip
如果你是在 Docker 容器里完成编译，运行 Curvine 时也建议放在同一环境中，除非你确认宿主机运行时依赖与容器一致。
:::

## 日志与 PID 文件

服务生命周期由 `bin/launch-process.sh` 管理。

- 日志输出到 `logs/master.out`、`logs/worker.out`、`logs/fuse.out`
- PID 文件位于 Curvine 根目录，例如 `master.pid`、`worker.pid`、`fuse.pid`

## 验证状态

查看集群概览：

```bash
./bin/cv report
```

确认 FUSE 已挂载：

```bash
mount | grep curvine-fuse
ls -la /curvine-fuse
```

## Web 入口

- Master Web：`http://<host>:9000`
- Worker Web：`http://<host>:9001`

:::tip
如果你在 Docker 中运行，请使用 `--network host`，或者至少映射 `8995`、`8996`、`8997`、`9000`、`9001`；如果还需要访问 FUSE Web 端口，则再加上 `9002`。
:::

## 另一个本地脚本

发行包还包含 `bin/local-cluster.sh`，它只管理 Master 与 Worker：

```bash
./bin/local-cluster.sh start
./bin/local-cluster.sh status
./bin/local-cluster.sh stop
```

如果你希望本地集群同时自动挂载 FUSE，优先使用 `restart-all.sh`；如果只需要服务端进程，可以使用 `local-cluster.sh`。
