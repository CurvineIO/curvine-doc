---
sidebar_position: 2
---

# 压测指南

本文说明 Curvine 参考仓库中的压测脚本如何使用。脚本源码位于 `build/tests/`，执行 `build/build.sh` 后会被复制到 `build/dist/tests/`。

## 开始前准备

先构建发行目录，并将 `CURVINE_HOME` 指向它：

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
make all
export CURVINE_HOME=$PWD/build/dist
```

这些压测脚本默认依赖：

- 已启动的 Curvine 集群
- `CURVINE_HOME/conf/curvine-cluster.toml`
- `CURVINE_HOME/lib/` 下存在对应二进制或 jar

你可以在仓库根目录下执行 `build/tests/...`，也可以进入 `build/dist` 后执行复制出来的 `tests/...`。

## 压测类型

- `meta-bench.sh`：Java 元数据压测
- `curvine-bench.sh`：Rust 吞吐压测
- `java-bench.sh`：Java 吞吐压测
- `fio-test.sh`：针对 FUSE 挂载路径的 FIO 压测

## 元数据压测

`build/tests/meta-bench.sh` 会运行 `io.curvine.bench.NNBenchWithoutMR`，脚本内置默认参数如下：

- `-threads 10`
- `-baseDir cv://default/fs-meta`
- `-numFiles 1000`
- `-bytesToWrite 0`

脚本支持的操作有 `createWrite`、`openRead`、`rename`、`delete`、`rmdir`。

```bash
build/tests/meta-bench.sh createWrite
build/tests/meta-bench.sh openRead
```

或在构建产物目录下执行：

```bash
cd build/dist
tests/meta-bench.sh createWrite
```

该脚本依赖 `lib/curvine-hadoop-*shade.jar`，正常执行 `make all` 即会生成。

## 吞吐压测

### Rust 客户端压测

`build/tests/curvine-bench.sh` 会调用 `lib/curvine-bench`，默认参数为：

- `--checksum true`
- `--client-threads 10`
- `--buf-size 128KB`
- `--file-size 100MB`
- `--file-num 10`

如果未传目录参数，`fs.*` 动作默认使用 `/fs-bench`，`fuse.*` 动作默认使用 `/curvine-fuse/fs-bench`。

```bash
build/tests/curvine-bench.sh fs.write /fs-bench
build/tests/curvine-bench.sh fs.read /fs-bench
build/tests/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
build/tests/curvine-bench.sh fuse.read /curvine-fuse/fs-bench
```

或在 `build/dist` 下执行：

```bash
cd build/dist
tests/curvine-bench.sh fs.write /fs-bench
```

### Java 客户端压测

`build/tests/java-bench.sh` 会运行 `io.curvine.bench.CurvineBenchV2`，默认参数为：

- `-threads 10`
- `-bufferSize 128kb`
- `-fileSize 100mb`
- `-fileNum 10`
- `-checksum true`
- `-clearDir false`

```bash
build/tests/java-bench.sh fs.write /fs-bench
build/tests/java-bench.sh fs.read /fs-bench
build/tests/java-bench.sh fuse.write /curvine-fuse/fs-bench
build/tests/java-bench.sh fuse.read /curvine-fuse/fs-bench
```

## FIO 压测

`build/tests/fio-test.sh` 面向已挂载的 FUSE 目录执行 FIO，脚本默认值为：

- 测试目录：`/curvine-fuse/fio-test`
- 大小：`500m`
- 时长：`30s`
- 并发 job 数：`1`
- direct I/O：`1`
- 数据校验：`1`
- 测试后清理：`1`

脚本开始前会检查父目录是否已经挂载，以及系统中是否安装了 `fio`。

```bash
build/tests/fio-test.sh
build/tests/fio-test.sh -t /curvine-fuse/fio-test --size 1G --runtime 60s --numjobs 4
build/tests/fio-test.sh --json-output /tmp/fio-test-results.json
```

或者在 `build/dist` 下运行：

```bash
cd build/dist
tests/fio-test.sh
```

## 实用说明

- `make all` 是最直接的方式，因为它会同时生成 `curvine-bench`、Java SDK jar、启动脚本和复制后的 `tests/` 目录。
- 如果你用 `bin/curvine-fuse.sh --mnt-path ...` 修改了挂载点，`curvine-bench.sh` 或 `fio-test.sh -t` 里也要使用同一路径。
- 这些脚本会 source `conf/curvine-env.sh`，因此 `CURVINE_HOME` 必须指向安装根目录，而不是源码根目录。

## 故障排查

- 找不到 `curvine-bench`：重新执行 `make all`，或至少构建 `tests` 包。
- 找不到 `curvine-hadoop-*shade.jar`：不要使用 `--skip-java-sdk`，重新构建。
- FIO 提示目录未挂载：先启动 FUSE，并用 `mount | grep curvine` 确认。
- 集群连接失败：检查 `conf/curvine-cluster.toml`，并参考 [调试指南](./03-debugging-guide.md)。
