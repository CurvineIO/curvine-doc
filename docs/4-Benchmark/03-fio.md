# FIO Benchmark

## 1. Test Environment Configuration

This test is based on a Curvine storage environment deployed on Alibaba Cloud ECS servers. The detailed configuration is as follows to ensure the stability and reproducibility of the test environment:

- Test instance type: Alibaba Cloud ECS i5.8xlarge, with 32-core CPU and 256 GB memory.
- Network bandwidth: 80 Gbps, ensuring that data transmission has no network bottleneck.
- Deployment architecture: 1 server independently deployed with `curvine-master` and `curvine-worker` services; 1 server deployed with the FUSE client to simulate business access.
- Storage configuration: `curvine-worker` mounts 1 SSD disk. The upper limit of disk performance is 16 GB/s for reads and 28 GB/s for writes.

## 2. 100G Large File Performance Test

For this large file test, `block_size` is uniformly set to 1G. The FIO tool is used for performance testing. FIO is a common I/O benchmark tool on Linux/Unix and can accurately simulate various storage read/write workloads. The test scenarios include write test, 256k sequential read, and 256k random read. The detailed test process and results are as follows:

### 2.1 Write Test

Test purpose: verify the sequential write performance of a 100G large file. A 256k block size is used, and kernel cache is bypassed with `direct=1` to ensure that the test results reflect the real storage write capability.

Execution command:

```bash
fio --name=seq_write \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--numjobs=1 \
--rw=write \
--group_reporting \
--time_based=0
```

### 2.2 256k Sequential Read Test

Test purpose: verify the 256k sequential read performance of a 100G large file under different thread counts. The test duration is 60 seconds, kernel cache is bypassed, and the focus is on observing how bandwidth changes with the number of threads.

Execution command:

```bash
fio --name=seq_read \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--group_reporting \
--time_based=0 \
--runtime=60 \
--rw=read \
--numjobs={numjobs}
```

Test results, corresponding relationship between thread count and read speed:

| Thread Count | Read Speed (GiB/s) |
| ---: | ---: |
| 1 | 2.1 |
| 2 | 3.7 |
| 4 | 6.1 |
| 8 | 8.5 |
| 16 | 9.8 |
| 32 | 9.2 |
| 64 | 9.3 |
| 128 | 9.3 |

### 2.3 256k Random Read Test

Test purpose: verify the 256k random read performance of a 100G large file under different thread counts, and observe the IOPS indicator at the same time to reflect the storage support capability for random access.

Client configuration:

Description: this FIO random read test uses a fully random mode and frequently switches blocks. The following two client configurations ensure that block connections are effectively cached, avoiding frequent connection establishment and disconnection, and ensuring the stability and data accuracy of the test process.

```toml
[client]
block_size = "1g"
max_cache_block_handles = 200
```

Execution command:

```bash
fio --name=seq_read \
--filename=/curvine-fuse/100g.data \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=100g \
--rw=randread \
--group_reporting \
--time_based=0 \
--runtime=60 \
--numjobs={numjobs}
```

Test results, corresponding relationship between thread count, read speed, and IOPS:

| Thread Count | Read Speed (GiB/s) | IOPS (K) |
| ---: | ---: | ---: |
| 1 | 0.2 | 0.9 |
| 2 | 0.5 | 1.9 |
| 4 | 1.0 | 4.2 |
| 8 | 2.4 | 9.8 |
| 16 | 4.9 | 19.9 |
| 32 | 8.1 | 32.4 |
| 64 | 9.3 | 37.9 |
| 128 | 9.3 | 40 |

## 3. Concurrent Read/Write Test

Test purpose: verify the concurrent read/write performance of Curvine storage under different thread counts, covering four core scenarios: sequential write, sequential read, random write, and random read. The test file size is 1G, the block size is 256k, and kernel cache is bypassed. The focus is on the performance of 16 and 128 threads, while data from other thread counts is supplemented for reference.

### 3.1 Test Commands

#### 3.1.1 Sequential Write

```bash
fio --name=seq_write \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=write \
--group_reporting \
--time_based=0 \
--numjobs=8{numjobs}
```

#### 3.1.2 Sequential Read

```bash
fio --name=seq_read \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=read \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

#### 3.1.3 Random Write

```bash
fio --name=rand_write \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=randwrite \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

#### 3.1.4 Random Read

```bash
fio --name=rand_read \
--directory=/curvine-fuse/fio-test \
--ioengine=libaio \
--direct=1 \
--bs=256k \
--size=1g \
--rw=randread \
--group_reporting \
--time_based=0 \
--numjobs={numjobs}
```

### 3.2 Test Results

| Thread Count | Sequential Write (GiB/s) | Sequential Read (GiB/s) | Random Write (GiB/s) | Random Read (GiB/s) |
| ---: | ---: | ---: | ---: | ---: |
| 8 | 4.6 | 3.8 | 4.6 | 2.5 |
| 16 | 7.2 | 6.7 | 7.2 | 5.0 |
| 32 | 10.5 | 9.7 | 10.5 | 8.8 |
| 64 | 12.6 | 12.6 | 12.6 | 11.3 |
| 128 | 10.2 | 14.0 | 9.6 | 14.0 |

## 4. Test Notes

This test enables the `direct=1` parameter throughout, bypassing the kernel page cache to ensure that the test results reflect the real performance of Curvine storage and SSD disks, avoiding cache interference with test data.

The FIO test tool uses the `libaio` I/O engine and supports asynchronous I/O operations, which better matches high-concurrency I/O scenarios in actual business workloads. The test results have high reference value.
