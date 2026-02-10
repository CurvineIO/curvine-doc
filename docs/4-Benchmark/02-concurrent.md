# Concurrent Performance Testing

This chapter introduces the methods and results of Curvine concurrent performance testing.

## Test Environment

The test machine configuration is as follows:

- CPU: 80 cores
- Memory: 256GB
- Disk: 1 SSD

## Test Tools

Using Curvine's built-in performance testing tools for testing. The test tools are located in the bin directory:

- curvine-bench: Testing using Rust client
- java-bench: Testing using Java client

Test case: Using 40 threads to concurrently read and write 1000 files, each file size is 100MB; for disk read testing, page cache needs to be cleared each time.

Rust client testing, modify bin/curvine-bench.sh:

```
${CURVINE_HOME}/lib/curvine-bench \
--action ${ACTION} \
--dir $DIR \
--conf $CURVINE_HOME/conf/curvine-cluster.toml \
--checksum true \
--client-threads 10 \
--buf-size 128KB \
--file-size 100MB \
--file-num 1000 \
```

Java client testing, modify bin/java-bench.sh:

```
java -Xms10g -Xmx10g \
-Dcurvine.conf.dir=${CURVINE_HOME}/conf \
io.curvine.bench.CurvineBenchV2 \
-action $ACTION \
-dataDir $DIR \
-threads 10 \
-bufferSize 128kb \
-fileSize 100mb \
-fileNum 10000 \
-checksum true \
-clearDir false
```

## Client Test Results

Running scripts:

```
# Rust client read/write data
bin/curvine-bench.sh fs.write
bin/curvine-bench.sh fs.read

# Java client read/write data
bin/java-bench.sh fs.write
bin/java-bench.sh fs.read
```

Rust client test results:

| Operation Type | Speed (GiB/s) |
|----------------|---------------|
| Write Memory   | 11.7          |
| Read Memory    | 17.3          |
| Write Disk     | 4.3           |
| Read Disk      | 3.5           |

Java client test results:

| Operation Type | Speed (GiB/s) |
|----------------|---------------|
| Write Memory   | 10.1          |
| Read Memory    | 10.6          |
| Write Disk     | 4.0           |
| Read Disk      | 3.5           |

## FUSE Test Results

Using fuse3 for testing.

Running scripts:

```
# Rust file api read/write data
bin/curvine-bench.sh fuse.write
bin/curvine-bench.sh fuse.read

# Java file api read/write data
bin/java-bench.sh fuse.write
bin/java-bench.sh fuse.read
```

Rust test results:

| Type        | Speed (GiB/s) |
|-------------|---------------|
| Memory Write| 10.6          |
| Memory Read | 11.1          |
| Disk Write  | 3.5           |
| Disk Read   | 2.6           |

Java test results:

| Type        | Speed (GiB/s) |
|-------------|---------------|
| Memory Write| 9.0           |
| Memory Read | 9.3           |
| Disk Write  | 3.2           |
| Disk Read   | 2.4           |