---
sidebar_position: 1
---

# Standalone Mode

This chapter describes how to bring up a local Curvine cluster from `build/dist` and what the bundled helper scripts actually do.

## Start the Local Cluster

Build or unpack the distribution first, then run from `build/dist`:

```bash
cd build/dist
./bin/restart-all.sh
```

`restart-all.sh` performs these actions:

1. Unmount `/curvine-fuse` with lazy umount if it is still mounted.
2. Kill any previous Curvine processes.
3. Start `curvine-master`.
4. Start `curvine-worker`.
5. Start `curvine-fuse`.

It does not start a separate `webui` process. Web pages are served on the service web ports using the bundled `webui/` assets.

:::tip
If you compiled Curvine inside a Docker container, run it in the same environment unless you are sure the host runtime dependencies match the build environment.
:::

## Logs and PID Files

Service lifecycle management goes through `bin/launch-process.sh`.

- Logs are written to `logs/master.out`, `logs/worker.out`, and `logs/fuse.out`
- PID files are written at the Curvine home directory root as `master.pid`, `worker.pid`, and `fuse.pid`

## Verify Status

Check the cluster summary:

```bash
./bin/cv report
```

Check that FUSE is mounted:

```bash
mount | grep curvine-fuse
ls -la /curvine-fuse
```

## Web Endpoints

- Master web endpoint: `http://<host>:9000`
- Worker web endpoint: `http://<host>:9001`

:::tip
If you run inside Docker, use `--network host` or map at least `8995`, `8996`, `8997`, `9000`, and `9001`. If you need browser access to the FUSE web endpoint as well, include `9002`.
:::

## Alternative Helper Script

The distribution also includes `bin/local-cluster.sh`, which manages only Master and Worker:

```bash
./bin/local-cluster.sh start
./bin/local-cluster.sh status
./bin/local-cluster.sh stop
```

Use `restart-all.sh` when you want FUSE mounted as part of the local setup. Use `local-cluster.sh` when you only need the server-side processes.
