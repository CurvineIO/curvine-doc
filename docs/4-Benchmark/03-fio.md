# FIO Benchmark

This page documents the checked-in FIO benchmark script in `build/tests/fio-test.sh`.

## What the script checks before running

The current script:

- uses `/curvine-fuse/fio-test` as the default test directory
- verifies that the parent directory of the test path is a mount point
- requires the `fio` command to be installed

`build/tests/prepare_cluster.sh` makes the same assumption as the regression tooling: shell scripts should verify readiness, while cluster preparation is expected to happen before the script is invoked.

## Default checked-in parameters

The active defaults in `fio-test.sh` are:

- Test directory: `/curvine-fuse/fio-test`
- File size: `500m`
- Runtime: `30s`
- Parallel jobs: `1`
- Direct I/O: `1`
- Data verification: `1`
- Cleanup after test: `1`

You can override them with flags such as `--size`, `--runtime`, `--numjobs`, `--direct`, `--verify`, `--cleanup`, and `--json-output`.

## Workloads actually run

The checked-in script runs these FIO cases:

1. Sequential write, `256KB` blocks
2. Sequential read, `256KB` blocks
3. Random write, `256KB` blocks
4. Random read, `256KB` blocks
5. Mixed random read/write, `256KB` blocks with `70%` reads

Verification uses `crc32c` when `--verify 1` is left enabled.

## How to run

From the source tree:

```bash
# Default run
bash build/tests/fio-test.sh

# Larger files and more jobs
bash build/tests/fio-test.sh --size 2G --runtime 60s --numjobs 4

# Keep test files for inspection
bash build/tests/fio-test.sh --cleanup 0

# Emit JSON for regression tooling
bash build/tests/fio-test.sh --json-output /tmp/fio-test-results.json
```

## Regression integration

`curvine-tests/README.md` describes FIO as part of the "Daily Test (Full)" flow, and `curvine-tests/regression/tests/fio_test.py` runs the packaged script from `build/dist/tests/fio-test.sh` with `--json-output`.

That means this script is both a local benchmark utility and a regression-facing performance smoke test.

## Results

The reference tree does not check in a canonical throughput table for FIO. The script prints live FIO output and can also write structured JSON results for later reporting, so benchmark numbers should be collected from the environment where the test actually ran.
