# Concurrent Read/Write Benchmark

This page reflects the benchmark wrappers in `build/tests/curvine-bench.sh` and `build/tests/java-bench.sh`, plus the Rust benchmark implementation under `curvine-tests/src`.

## Supported benchmark modes

Both wrappers support the same four actions:

- `fs.write`
- `fs.read`
- `fuse.write`
- `fuse.read`

The Rust wrapper launches `${CURVINE_HOME}/lib/curvine-bench`. The Java wrapper launches `io.curvine.bench.CurvineBenchV2`.

Default target directories come from the checked-in scripts:

- `fs.*` actions default to `/fs-bench`
- `fuse.*` actions default to `/curvine-fuse/fs-bench`

The top-level README and README_zh both describe `/curvine-fuse` as the default mount point for Curvine FUSE.

## Default checked-in workload

The active wrapper settings in both scripts are:

- Client threads: `10`
- File count: `10`
- File size: `100MB`
- Buffer size: `128KB`
- Checksum: `true`

Rust wrapper:

```bash
${CURVINE_HOME}/lib/curvine-bench --action ${ACTION} --dir $DIR --conf $CURVINE_HOME/conf/curvine-cluster.toml --checksum true --client-threads 10 --buf-size 128KB --file-size 100MB --file-num 10
```

Java wrapper:

```bash
java -Xms256m -Xmx1g -Dcurvine.conf.dir=${CURVINE_HOME}/conf io.curvine.bench.CurvineBenchV2 -action $ACTION -dataDir $DIR -threads 10 -bufferSize 128kb -fileSize 100mb -fileNum 10 -checksum true -clearDir false
```

Both wrappers still contain commented heavier profiles, but those are examples only. They are not the active defaults in the checked-in scripts.

## How the Rust benchmark behaves

The current Rust implementation supports only the four actions above. For each run it:

- creates the target directory if needed
- launches one task per file
- writes or reads each file in `128KB` chunks until `100MB` per file is reached
- prints total bytes, checksum, and the parsed arguments at the end

## How to run

From the source tree:

```bash
# Rust client against Curvine RPC
bash build/tests/curvine-bench.sh fs.write
bash build/tests/curvine-bench.sh fs.read

# Rust client through the mounted FUSE path
bash build/tests/curvine-bench.sh fuse.write /curvine-fuse/fs-bench
bash build/tests/curvine-bench.sh fuse.read /curvine-fuse/fs-bench

# Java client against Curvine RPC
bash build/tests/java-bench.sh fs.write
bash build/tests/java-bench.sh fs.read

# Java client through the mounted FUSE path
bash build/tests/java-bench.sh fuse.write /curvine-fuse/fs-bench
bash build/tests/java-bench.sh fuse.read /curvine-fuse/fs-bench
```

Before running `fuse.*` actions, make sure `/curvine-fuse` is mounted.

## Results

The current reference tree does not publish official throughput tables for these wrappers. Treat any throughput numbers as environment-specific measurements, not repository defaults.
