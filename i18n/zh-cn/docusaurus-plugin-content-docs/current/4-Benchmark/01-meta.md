# 元数据性能测试

## 一、测试环境配置

本次测试基于阿里云 ECS 服务器搭建 Curvine 存储环境，所有配置均经过验证，确保测试环境的稳定性、一致性及测试结果的可复现性，详细配置如下：

### 1.1 服务器配置

- 测试机型：阿里云 ECS i5.8xlarge，配置为 32 核 CPU + 256GB 内存，满足高并发测试算力需求
- 网络带宽：80Gbps 高速网络，彻底规避网络传输瓶颈，确保测试结果反映存储本身性能

### 1.2 部署架构

- 服务节点：1 台 ECS 服务器，单独部署 `curvine-master`、`curvine-worker` 核心服务，保障服务运行独立性
- 客户端节点：1 台 ECS 服务器，部署 FUSE 客户端，用于模拟真实业务场景下的存储访问请求

## 二、NNBench 测试配置及操作

### 2.1 测试工具及参数

采用 hdfs `NNBenchWithoutMR` 工具进行元数据性能测试，测试参数固定如下，确保测试压力统一：

- 测试线程数：40 个
- 单线程处理文件数：10000 个
- 测试路径：`cv://default/fs-meta`
- 写入字节数：0（仅测试元数据操作，不涉及实际数据写入）

### 2.2 测试脚本修改

修改 `tests/meta-bench.sh` 脚本，具体内容如下（可直接复制替换原有脚本，确保脚本可正常执行）：

```bash
# 加载Curvine环境配置
. "$(cd "`dirname "$0"`"; pwd)"/../conf/curvine-env.sh

# 配置类路径，指定Curvine Hadoop相关依赖包
export CLASSPATH=$(echo $CURVINE_HOME/lib/curvine-hadoop-*shade.jar | tr ' ' ':')

# 测试操作类型（需传入参数，可选值如下）
# createWrite：创建写入测试
# openRead：打开读取测试
# rename：重命名测试
# delete：删除测试
# rmdir：删除目录测试
ACTION=$1

# 执行NNBenchWithoutMR测试
java -Xms256m -Xmx256m \
io.curvine.bench.NNBenchWithoutMR \
-operation $ACTION \
-bytesToWrite 0 \
-confDir ${CURVINE_HOME}/conf \
-threads 40 \
-baseDir cv://default/fs-meta \
-numFiles 10000
```

### 2.3 配置参数修改

修改 `curvine-site.xml`，将 master 连接数修改为 3，以达到最佳性能：

```xml
<property>
  <name>fs.cv.master_conn_pool_size</name>
  <value>3</value>
</property>
```

### 2.4 补充说明

- 脚本执行方式：在 `tests` 目录下执行 `sh meta-bench.sh [测试操作类型]`，例如 `sh meta-bench.sh createWrite` 执行创建写入测试
- JVM 参数说明：`-Xms256m -Xmx256m` 固定 JVM 堆内存，避免内存波动影响测试结果
- 依赖说明：确保 `CURVINE_HOME` 环境变量配置正确，且 `lib` 目录下存在对应的 `curvine-hadoop-*shade.jar` 依赖包

## 三、NNBench 测试结果

本次测试基于上述环境及参数，分别执行 `createWrite`（创建写入）、`openRead`（打开读取）、`rename`（重命名）、`delete`（删除）4 种元数据操作，每个操作重复执行 3 次，取平均值作为最终结果，确保测试数据的准确性。

### 3.1 测试结果汇总表

| 测试操作类型 | 平均每秒操作数（QPS） |
| --- | ---: |
| `createWrite`（创建写入） | 21192 |
| `openRead`（打开读取） | 60181 |
| `rename`（重命名） | 27776 |
| `delete`（删除） | 30511 |
