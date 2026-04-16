# 并发读写基准测试

本页以 `build/tests/curvine-bench.sh`、`build/tests/java-bench.sh` 以及 `curvine-tests/src` 下的 Rust 实现为准。

## 支持的模式

两个脚本都支持以下四种动作：

- `fs.write`
- `fs.read`
- `fuse.write`
- `fuse.read`

Rust 包装脚本调用 `${CURVINE_HOME}/lib/curvine-bench`，Java 包装脚本调用 `io.curvine.bench.CurvineBenchV2`。

当前脚本中的默认目标目录是：

- `fs.*` 默认写到 `/fs-bench`
- `fuse.*` 默认写到 `/curvine-fuse/fs-bench`

顶层 `README.md` 和 `README_zh.md` 都把 `/curvine-fuse` 说明为 Curvine FUSE 的默认挂载点。

## 当前脚本里的默认负载

两个脚本当前生效的默认参数都是：

- 客户端线程数：`10`
- 文件数：`10`
- 单文件大小：`100MB`
- Buffer 大小：`128KB`
- 校验和：`true`

Rust 脚本：

```bash
${CURVINE_HOME}/lib/curvine-bench --action ${ACTION} --dir $DIR --conf $CURVINE_HOME/conf/curvine-cluster.toml --checksum true --client-threads 10 --buf-size 128KB --file-size 100MB --file-num 10
```

Java 脚本：

```bash
java -Xms256m -Xmx1g -Dcurvine.conf.dir=${CURVINE_HOME}/conf io.curvine.bench.CurvineBenchV2 -action $ACTION -dataDir $DIR -threads 10 -bufferSize 128kb -fileSize 100mb -fileNum 10 -checksum true -clearDir false
```

两个脚本里确实还保留了更重的注释示例，但那些只是注释里的性能压测配置，不是当前脚本真正启用的默认值。

## Rust 基准程序当前的执行方式

当前 Rust 实现只支持上面的四个动作，并且会：

- 按需创建目标目录
- 每个文件启动一个任务
- 以 `128KB` 为块大小循环读写，直到单文件达到 `100MB`
- 结束时输出总字节数、校验和以及解析后的参数

## 运行方式

在源码树中可直接执行：

```bash
# Rust 客户端走 Curvine RPC
bash build/tests/curvine-bench.sh fs.write
bash build/tests/curvine-bench.sh fs.read

# Rust 客户端走 FUSE 挂载路径
bash build/tests/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
bash build/tests/curvine-bench.sh fuse.read /curvine-fuse/fs-bench

# Java 客户端走 Curvine RPC
bash build/tests/java-bench.sh fs.write
bash build/tests/java-bench.sh fs.read

# Java 客户端走 FUSE 挂载路径
bash build/tests/java-bench.sh fuse.write /curvine-fuse/fs-bench
bash build/tests/java-bench.sh fuse.read /curvine-fuse/fs-bench
```

执行 `fuse.*` 之前，请先确认 `/curvine-fuse` 已挂载完成。

## 结果说明

当前参考代码树没有发布这两个脚本的官方吞吐结果表。吞吐数字应当来自实际测试环境，不能把旧文档中的结果表当作当前默认表现。
