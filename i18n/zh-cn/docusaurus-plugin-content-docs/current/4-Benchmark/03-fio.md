# FIO 基准测试

本页以仓库中的 `build/tests/fio-test.sh` 为准。

## 脚本运行前会检查什么

当前脚本会：

- 默认使用 `/curvine-fuse/fio-test` 作为测试目录
- 校验测试目录父路径是否已经是挂载点
- 要求系统已安装 `fio`

`build/tests/prepare_cluster.sh` 也说明了同样的前提：shell 脚本只负责检查集群是否就绪，真正的集群准备应当在调用脚本之前完成。

## 当前脚本里的默认参数

`fio-test.sh` 当前生效的默认值为：

- 测试目录：`/curvine-fuse/fio-test`
- 文件大小：`500m`
- 运行时长：`30s`
- 并发作业数：`1`
- 直接 I/O：`1`
- 数据校验：`1`
- 测试后清理：`1`

可通过 `--size`、`--runtime`、`--numjobs`、`--direct`、`--verify`、`--cleanup`、`--json-output` 等参数覆盖。

## 当前脚本实际执行的负载

已检入脚本会运行以下 FIO 用例：

1. `256KB` 顺序写
2. `256KB` 顺序读
3. `256KB` 随机写
4. `256KB` 随机读
5. `256KB` 混合随机读写，读占比 `70%`

当 `--verify 1` 保持开启时，脚本会使用 `crc32c` 做校验。

## 运行方式

在源码树中可直接执行：

```bash
# 默认执行
bash build/tests/fio-test.sh

# 放大文件与并发
bash build/tests/fio-test.sh --size 2G --runtime 60s --numjobs 4

# 保留测试文件，便于排查
bash build/tests/fio-test.sh --cleanup 0

# 输出 JSON，供回归测试消费
bash build/tests/fio-test.sh --json-output /tmp/fio-test-results.json
```

## 与回归测试的关系

`curvine-tests/README.md` 把 FIO 列为 "Daily Test (Full)" 的一部分，`curvine-tests/regression/tests/fio_test.py` 则会以 `--json-output` 方式执行打包后的 `build/dist/tests/fio-test.sh`。

因此，这个脚本既是本地性能工具，也是回归流程中的性能冒烟测试入口。

## 结果说明

参考代码树没有随仓库提供固定的 FIO 吞吐结果表。应以实际运行时的 FIO 输出或 JSON 结果为准，而不是沿用旧文档中的静态表格。
