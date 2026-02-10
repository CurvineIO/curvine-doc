# 并发性能测试

本章节介绍了Curvine并发性能测试的方法和结果。

## 测试环境

测试机器配置如下：

- CPU：80核
- 内存：256GB
- 磁盘：1SSD

## 测试工具

使用curvine自带的性能测试工具进行测试，测试工具位于bin目录下：

- curvine-bench：使用rust客户端测试
- java-bench：使用java客户端测试

测试用例：使用40个线程并发读写1000个文件，每个文件大小为100MB；测试磁盘读，需要每次清理page cache。

rust客户端测试，修改bin/curvine-bench.sh：

```
${CURVINE_HOME}/lib/curvine-bench \
--action ${ACTION} \
--dir $DIR \
--conf $CURVINE_HOME/conf/curvine-cluster.toml \
--checksum true \
--client-threads 14 \
--buf-size 128KB \
--file-size 100MB \
--file-num 1000 \
```

java 客户端测试，修改bin/java-bench.sh：

```
java -Xms10g -Xmx10g \
-Dcurvine.conf.dir=${CURVINE_HOME}/conf \
io.curvine.bench.CurvineBenchV2 \
-action $ACTION \
-dataDir $DIR \
-threads 40 \
-bufferSize 128kb \
-fileSize 100mb \
-fileNum 1000 \
-checksum true \
-clearDir false
```

## 客户端测试结果

运行脚本：

```
# rust 客户端读写数据
bin/curvine-bench.sh fs.write
bin/curvine-bench.sh fs.read

# java 客户端读写数据
bin/java-bench.sh fs.write
bin/java-bench.sh fs.read
```

rust客户端测试结果：

| 操作类型 | 速度（Gib/s) |
|------|-----------|
| 写内存  | 11.7      |
| 读内存  | 17.3      |
| 写磁盘  | 4.3       |
| 读磁盘  | 3.5       |

java客户端测试结果：

| 操作类型 | 速度（Gib/s) |
|------|-----------|
| 写内存  | 10.1      |
| 读内存  | 10.6      |
| 写磁盘  | 4.0       |
| 读磁盘  | 3.5       |

## FUSE测试结果

使用fuse3进行测试。

运行脚本：

```
# rust file api读写数据
bin/curvine-bench.sh fuse.write
bin/curvine-bench.sh fuse.read

# java file api读写数据
bin/java-bench.sh fuse.write
bin/java-bench.sh fuse.read
```

rust测试结果：

| 类型  | 速度（Gib/s） |
|-----|-----------|
| 内存写 | 10.6      |
| 内存读 | 11.1      |
| 磁盘写 | 3.5       |
| 磁盘读 | 2.6       |

java测试结果：

| 类型  | 速度（Gib/s） |
|-----|-----------|
| 内存写 | 9.0       |
| 内存读 | 9.3       |
| 磁盘写 | 3.2       |
| 磁盘读 | 2.4       |
