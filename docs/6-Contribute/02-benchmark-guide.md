---
sidebar_position: 2
---

# Benchmark Guide

This guide covers the benchmark scripts shipped in the Curvine reference repository. The scripts live in `build/tests/` in the source tree and are copied to `build/dist/tests/` by `build/build.sh`.

## Before You Start

Build the distribution and point `CURVINE_HOME` at it:

```bash
git clone https://github.com/CurvineIO/curvine.git
cd curvine
make all
export CURVINE_HOME=$PWD/build/dist
```

The benchmark scripts expect:

- a running Curvine cluster
- `CURVINE_HOME/conf/curvine-cluster.toml`
- `CURVINE_HOME/lib/` to contain the required binaries or jars

You can either run scripts from the repository root as `build/tests/...` after exporting `CURVINE_HOME`, or `cd build/dist` and run the copied scripts as `tests/...`.

## Benchmark Families

- `meta-bench.sh`: Java metadata benchmark
- `curvine-bench.sh`: Rust throughput benchmark
- `java-bench.sh`: Java throughput benchmark
- `fio-test.sh`: FIO benchmark against a mounted FUSE path

## Metadata Benchmark

`build/tests/meta-bench.sh` runs `io.curvine.bench.NNBenchWithoutMR` with these built-in defaults:

- `-threads 10`
- `-baseDir cv://default/fs-meta`
- `-numFiles 1000`
- `-bytesToWrite 0`

Supported operations from the script are `createWrite`, `openRead`, `rename`, `delete`, and `rmdir`.

```bash
build/tests/meta-bench.sh createWrite
build/tests/meta-bench.sh openRead
```

Or from the built distribution:

```bash
cd build/dist
tests/meta-bench.sh createWrite
```

This benchmark requires the Java SDK jar under `lib/curvine-hadoop-*shade.jar`, which is produced by the normal `make all` flow.

## Throughput Benchmarks

### Rust client benchmark

`build/tests/curvine-bench.sh` shells into `lib/curvine-bench` with these defaults:

- `--checksum true`
- `--client-threads 10`
- `--buf-size 128KB`
- `--file-size 100MB`
- `--file-num 10`

If no directory is provided, the script uses `/fs-bench` for `fs.*` actions and `/curvine-fuse/fs-bench` for `fuse.*` actions.

```bash
build/tests/curvine-bench.sh fs.write /fs-bench
build/tests/curvine-bench.sh fs.read /fs-bench
build/tests/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
build/tests/curvine-bench.sh fuse.read /curvine-fuse/fs-bench
```

Or from the built distribution:

```bash
cd build/dist
tests/curvine-bench.sh fs.write /fs-bench
```

### Java client benchmark

`build/tests/java-bench.sh` runs `io.curvine.bench.CurvineBenchV2` with:

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

## FIO Benchmark

`build/tests/fio-test.sh` runs FIO against a mounted FUSE directory. The script defaults are:

- test directory: `/curvine-fuse/fio-test`
- size: `500m`
- runtime: `30s`
- jobs: `1`
- direct I/O: `1`
- verification: `1`
- cleanup: `1`

The script checks that the parent directory is an active mount point and that `fio` is installed before running.

```bash
build/tests/fio-test.sh
build/tests/fio-test.sh -t /curvine-fuse/fio-test --size 1G --runtime 60s --numjobs 4
build/tests/fio-test.sh --json-output /tmp/fio-test-results.json
```

Or from `build/dist`:

```bash
cd build/dist
tests/fio-test.sh
```

## Practical Notes

- `make all` is the simplest path because it builds `curvine-bench`, the Java SDK jar, launch wrappers, and the copied `tests/` directory together.
- If you customize the FUSE mount path with `bin/curvine-fuse.sh --mnt-path ...`, pass the same path to `curvine-bench.sh` or `fio-test.sh -t`.
- Benchmark scripts source `conf/curvine-env.sh`, so `CURVINE_HOME` must point to the install root rather than the repository root.

## Troubleshooting

- Missing `curvine-bench`: rebuild with `make all` or include the `tests` package.
- Missing `curvine-hadoop-*shade.jar`: rebuild without `--skip-java-sdk`.
- FIO says the path is not mounted: start FUSE first and verify with `mount | grep curvine`.
- Cluster connection failures: verify `conf/curvine-cluster.toml` and use the checks in [Debugging Guide](./03-debugging-guide.md).
