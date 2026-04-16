# Metadata Benchmark

This page documents the metadata benchmark workflow that is currently checked into Curvine. The source of truth is `build/tests/meta-bench.sh`.

## What the script runs

The wrapper loads `../conf/curvine-env.sh`, sets `CLASSPATH` to `lib/curvine-hadoop-*shade.jar`, and invokes:

```bash
java -Xms256m -Xmx256m io.curvine.bench.NNBenchWithoutMR -operation $ACTION -bytesToWrite 0 -confDir ${CURVINE_HOME}/conf -threads 10 -baseDir cv://default/fs-meta -numFiles 1000
```

Because `-bytesToWrite` is fixed to `0`, this script is aimed at metadata operations rather than data-path throughput.

## Supported actions

The checked-in script lists these actions:

- `createWrite`
- `openRead`
- `rename`
- `delete`
- `rmdir`

Each run executes one action at a time.

## Default checked-in workload

The active wrapper parameters are:

- Java heap: `256m`
- Threads: `10`
- Base path: `cv://default/fs-meta`
- File count: `1000`

Older benchmark notes that mention larger heaps, higher thread counts, or published QPS tables are not reflected in the current checked-in script.

## How to run

From the source tree:

```bash
bash build/tests/meta-bench.sh createWrite
bash build/tests/meta-bench.sh openRead
bash build/tests/meta-bench.sh rename
bash build/tests/meta-bench.sh delete
bash build/tests/meta-bench.sh rmdir
```

Before running the benchmark, make sure:

- Curvine is built and `${CURVINE_HOME}/lib/curvine-hadoop-*shade.jar` is present.
- `${CURVINE_HOME}/conf` contains the cluster configuration.
- The target cluster is reachable at the `cv://default` endpoint used by the config.

## Results

The reference tree does not check in official metadata benchmark result tables for this workload. Record QPS from your own runs and annotate them with the cluster shape, storage tier, and config used for that run.
