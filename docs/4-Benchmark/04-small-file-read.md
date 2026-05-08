# Curvine Small File Read Performance Test

## 1. Test Environment and Configuration

### 1. Hardware and Network Environment

- Test instance type: Alibaba Cloud ECS i5.8xlarge, with 32-core CPU and 256 GB memory.
- Network bandwidth: 80 Gbps.
- Deployment architecture: 1 server deployed with `curvine-master`, `curvine-worker`, and MinIO services, and 1 server deployed with the FUSE client.

### 2. Basic Environment

- Operating system: Ubuntu 22.04 LTS.
- Test dataset: BDD100K image dataset, with 70,000 images in total. This is a typical AI training small-file scenario, and each file is about tens of KB.
- Dataset source: ModelScope open dataset, link: https://www.modelscope.cn/datasets/iic/BDD100K/feedback.

### 3. Test Tools and Scripts

- Core test script: `tests/load_img.py`, which simulates an AI training scenario by reading images with high concurrency and supports multi-process parallel scheduling.
- Data migration tool: `rclone`, using multi-threaded transfer to ensure migration efficiency and stability.
- Object storage service: MinIO, deployed on a single machine to simulate an S3-compatible object storage scenario.

## 2. Test Plan

This test focuses on two core Curvine mount modes, `fs-mode` and `cache-mode`. It verifies the impact of cold-start reads, Page Cache hit reads, and metadata cache optimization on performance. Native MinIO is used as the baseline for comparison to comprehensively evaluate Curvine small-file read capability.

## 3. Test Procedure

### 1. fs-mode Test Procedure

Mount Curvine to the specified directory:

```bash
bin/cv mount s3://xuen/fs_mode /xuen/fs_mode \
  --write-type fs_mode \
  -c s3.endpoint_url=http://hostname:9000 \
  -c s3.credentials.access=minioadmin \
  -c s3.credentials.secret=minioadmin \
  -c s3.region_name=cn
```

Data migration: use `rclone` to copy 70,000 images from the local `/data/img/bdd` directory to the Curvine mount directory. In fs-mode, copying 70,000 images to the Curvine mount directory with `rclone` took 55 seconds in total. The transfer efficiency was stable and met the requirements of fast large-scale small-file ingestion.

```bash
rclone copy /data/img/bdd /curvine-fuse/xuen/fs_mode/bdd -P --transfers=16
```

Data read test command:

```bash
python3 tests/load_img.py /curvine-fuse/xuen/fs_mode/bdd \
  --num_workers 32 \
  --num_samples 70000
```

Metadata cache optimization test: enable kernel metadata cache, client metadata cache, and dual cache separately.

### 2. cache-mode Test Procedure

First use the `mc` command to pre-copy 70,000 images to the corresponding MinIO bucket, `xuen/cache_mode`.

Mount Curvine to the specified directory:

```bash
bin/cv mount s3://xuen/cache_mode /xuen/cache_mode \
  --write-type cache_mode \
  -c s3.endpoint_url=http://10.212.185.64:9000 \
  -c s3.credentials.access=minioadmin \
  -c s3.credentials.secret=minioadmin \
  -c s3.region_name=cn
```

Read test command:

```bash
python3 tests/load_img.py /curvine-fuse/xuen/cache_mode/bdd \
  --num_workers 32 \
  --num_samples 70000
```

Metadata cache optimization test: enable kernel metadata cache, client metadata cache, and dual cache separately.

## 4. Test Results

| Test Type | Processing Speed (images/second) | Performance Improvement Compared with MinIO Cold Read |
| --- | ---: | ---: |
| Native MinIO cold read (baseline) | 1675 | - |
| Curvine basic version | 5615 | +235.2% |
| Curvine + kernel metadata cache | 5997 | +257.9% |
| Curvine + client metadata cache | 6174 | +268.6% |
| Curvine + dual metadata cache | 6117 | +265.2% |

## 5. Test Conclusion

- Far beyond native storage: Curvine's optimal read performance reached 6174 images/second, which is 3.68 times that of native MinIO at 1675 images/second. The basic version reached 5615 images/second, which is already 3.35 times that of native MinIO.
- Significant metadata cache gains: after metadata cache was enabled, performance improved by 6.8% to 10.0% compared with the Curvine basic version, and the client metadata cache delivered the best optimization effect.
- Efficient metadata mechanism: the native Curvine basic version already achieved high-performance reads of 5615 images/second. It can meet AI small-file read requirements without relying on cache, reducing configuration complexity and O&M costs.
- Strong mode compatibility: both `fs-mode` and `cache-mode` can stably deliver high performance, adapting to storage requirements in different business scenarios while balancing performance and flexibility.
