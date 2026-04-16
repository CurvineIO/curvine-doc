# 元数据基准测试

本页以 Curvine 当前仓库中的 `build/tests/meta-bench.sh` 为准。

## 脚本实际执行的内容

该脚本会加载 `../conf/curvine-env.sh`，把 `CLASSPATH` 指向 `lib/curvine-hadoop-*shade.jar`，然后执行：

```bash
java -Xms256m -Xmx256m io.curvine.bench.NNBenchWithoutMR -operation $ACTION -bytesToWrite 0 -confDir ${CURVINE_HOME}/conf -threads 10 -baseDir cv://default/fs-meta -numFiles 1000
```

由于 `-bytesToWrite` 固定为 `0`，这个脚本压测的是元数据路径，不是数据吞吐路径。

## 支持的操作

脚本注释中列出的操作有：

- `createWrite`
- `openRead`
- `rename`
- `delete`
- `rmdir`

每次执行只跑一个操作。

## 当前脚本里的默认负载

当前生效的默认参数是：

- Java 堆大小：`256m`
- 线程数：`10`
- 基准目录：`cv://default/fs-meta`
- 文件数：`1000`

旧文档里更大的堆大小、更高线程数，以及固定 QPS 结果表，都不是当前脚本的已检入默认值。

## 运行方式

在源码树中可直接执行：

```bash
bash build/tests/meta-bench.sh createWrite
bash build/tests/meta-bench.sh openRead
bash build/tests/meta-bench.sh rename
bash build/tests/meta-bench.sh delete
bash build/tests/meta-bench.sh rmdir
```

运行前请确认：

- Curvine 已完成构建，且 `${CURVINE_HOME}/lib/curvine-hadoop-*shade.jar` 存在。
- `${CURVINE_HOME}/conf` 中已经准备好集群配置。
- 配置里指向的 `cv://default` 集群可达。

## 结果说明

参考代码树里没有随仓库发布这一负载的官方结果表。请以实际运行环境采集到的 QPS 为准，并同时记录集群规模、存储层级和配置参数。
