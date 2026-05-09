# Metadata Performance Test

## 1. Test Environment Configuration

This test is based on a Curvine storage environment deployed on Alibaba Cloud ECS servers. All configurations have been verified to ensure the stability and consistency of the test environment and the reproducibility of the test results. The detailed configuration is as follows:

### 1.1 Server Configuration

- Test instance type: Alibaba Cloud ECS i5.8xlarge, configured with 32-core CPU and 256 GB memory, meeting the computing requirements of high-concurrency tests.
- Network bandwidth: 80 Gbps high-speed network, completely avoiding network transmission bottlenecks and ensuring that the test results reflect the performance of the storage itself.

### 1.2 Deployment Architecture

- Service node: 1 ECS server, independently deploying the core services `curvine-master` and `curvine-worker`, ensuring service runtime independence.
- Client node: 1 ECS server, deploying the FUSE client to simulate storage access requests in real business scenarios.

## 2. NNBench Test Configuration and Operations

### 2.1 Test Tool and Parameters

The HDFS `NNBenchWithoutMR` tool is used for metadata performance testing. The test parameters are fixed as follows to ensure consistent test pressure:

- Number of test threads: 40
- Number of files processed by a single thread: 10000
- Test path: `cv://default/fs-meta`
- Bytes written: 0, only metadata operations are tested and no actual data is written.

### 2.2 Test Script Modification

Modify the `tests/meta-bench.sh` script as follows. The following content can be directly copied to replace the original script to ensure that the script can execute normally:

```bash
# Load Curvine environment configuration
. "$(cd "`dirname "$0"`"; pwd)"/../conf/curvine-env.sh

# Configure the classpath and specify Curvine Hadoop dependencies
export CLASSPATH=$(echo $CURVINE_HOME/lib/curvine-hadoop-*shade.jar | tr ' ' ':')

# Test operation type. A parameter must be passed in. Optional values are as follows:
# createWrite: create write test
# openRead: open read test
# rename: rename test
# delete: delete test
# rmdir: remove directory test
ACTION=$1

# Execute the NNBenchWithoutMR test
java -Xms256m -Xmx256m \
io.curvine.bench.NNBenchWithoutMR \
-operation $ACTION \
-bytesToWrite 0 \
-confDir ${CURVINE_HOME}/conf \
-threads 40 \
-baseDir cv://default/fs-meta \
-numFiles 10000
```

### 2.3 Configuration Parameter Modification

Modify `curvine-site.xml` and change the master connection count to 3 to achieve the best performance:

```xml
<property>
  <name>fs.cv.master_conn_pool_size</name>
  <value>3</value>
</property>
```

### 2.4 Supplementary Notes

- Script execution method: execute `sh meta-bench.sh [test operation type]` in the `tests` directory. For example, execute `sh meta-bench.sh createWrite` to run the create write test.
- JVM parameter description: `-Xms256m -Xmx256m` fixes the JVM heap memory to avoid memory fluctuation affecting the test results.
- Dependency description: ensure that the `CURVINE_HOME` environment variable is configured correctly and that the corresponding `curvine-hadoop-*shade.jar` dependency exists in the `lib` directory.

## 3. NNBench Test Results

Based on the above environment and parameters, this test executed four metadata operations: `createWrite` (create write), `openRead` (open read), `rename` (rename), and `delete` (delete). Each operation was repeated 3 times, and the average value was taken as the final result to ensure the accuracy of the test data.

### 3.1 Test Result Summary Table

| Test Operation Type | Average Operations per Second (QPS) |
| --- | ---: |
| `createWrite` (create write) | 21192 |
| `openRead` (open read) | 60181 |
| `rename` (rename) | 27776 |
| `delete` (delete) | 30511 |
