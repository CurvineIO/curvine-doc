---
authors: [david]
tags: [benchmark, fuse, compatibility]
---

<!-- truncate -->

# Curvine Passed 1,129 LTP Tests — Zero Failures

If you work on distributed file systems, this story probably sounds familiar: `dd` works, `cp` works, fio numbers look fine — and then production hits, an old app calls `flock`, or a Python library insists on reading extended attributes, and things fall apart.

POSIX compatibility is easy to say and hard to prove. File permissions, file locks, extended attributes, directory operations, plus a long tail of syscall edge cases that nobody touches in day-to-day development — miss any one of them, and you often do not find out until real workloads land in production.

We ran a full regression of Curvine's FUSE interface against the Linux Test Project (LTP). Seven filesystem-focused suites. The final score:

**1,129 passed, 0 failed, 0 broken, 141 skipped by LTP as environment TCONF.**

| Suite | Run | Pass | Fail | Broken | Skip |
|---|---|---|---|---|---|
| fs_perms_simple | 18 | 18 | 0 | 0 | 0 |
| fsx | 1 | 1 | 0 | 0 | 0 |
| fs_bind | 1 | 1 | 0 | 0 | 0 |
| smoketest | 13 | 12 | 0 | 0 | 1 |
| io | 2 | 2 | 0 | 0 | 0 |
| fs-jfs | 29 | 27 | 0 | 0 | 2 |
| syscalls-jfs | 1206 | 1068 | 0 | 0 | 138 |
| **Total** | **1270** | **1129** | **0** | **0** | **141** |

About those 141 skips: LTP marked them as `TCONF` — configuration skips because the current kernel capabilities, required devices, permissions, or isolation environment did not meet the test preconditions. They are not failures, and we did not count them as passes either.

## Why LTP

LTP (Linux Test Project) is a long-running open test suite originally contributed to by IBM, Cisco, and others. It validates reliability and compatibility across system calls, filesystems, file permissions, process and memory management, and I/O.

Curvine exposes a distributed filesystem to Linux applications through FUSE. Applications expect more than `open`, `read`, and `write` — metadata, permissions, file descriptor behavior, file locks, extended attributes, directory operations, and error semantics all need to match Linux/POSIX expectations.

A benchmark shows that one workload runs. A broad compatibility suite shows that behavior is correct across a much wider API surface. Those are different questions.

## What We Tested

Based on LTP 20210524, we selected seven suites closely tied to filesystem, FUSE, and POSIX semantics:

| Suite | Coverage |
|---|---|
| fs_perms_simple | Basic file permissions |
| fsx | Random file I/O and state transitions |
| fs_bind | Bind mount behavior |
| smoketest | Core Linux interface smoke tests |
| io | Basic I/O operations |
| fs-jfs | Scoped filesystem tests |
| syscalls-jfs | Scoped filesystem-related syscalls |

Together they cover file create/delete, permission management, random read/write, basic I/O, bind mounts, file locks, file descriptor operations, extended attributes, directory operations, and a large set of filesystem-related system calls.

This is not a performance benchmark. The goal is semantic correctness.

## Test Environment

| Item | Configuration |
|---|---|
| Host | ARM64 test server |
| OS | Alibaba Cloud Linux 3 (OpenAnolis Edition) |
| Kernel | 5.10.134-18.al8.aarch64 |
| Architecture | aarch64 |
| LTP version | 20210524 |
| Filesystem interface | FUSE |

## How We Scoped the Run

This is the section people question most, so we are explicit about it.

Running all of LTP mixes in hours-long stress tests, pure kernel tests, device-specific checks, and capabilities that a FUSE filesystem simply cannot provide. The signal gets buried in noise.

We therefore derived two scoped lists from LTP's default `fs` and `syscalls` runlists: `fs-jfs` and `syscalls-jfs`. Exclusion rules:

- Drop long-running stress tests
- Drop pure kernel tests unrelated to filesystem behavior
- Drop tests explicitly not applicable to FUSE
- Drop tests unsupported in the current Linux environment

Filesystem list:

```bash
cd /opt/ltp-20210524
FS_SKIP='gf01|gf02|gf03|gf04|gf05|gf06|gf07|gf08|gf09|gf10|gf11|gf12|gf13...'
grep -v -E "^(${FS_SKIP})[[:space:]]" \
  runtest/fs > runtest/fs-jfs
```

Syscall list:

```bash
SYSCALLS_SKIP='close_range01|close_range02|openat201|openat202|openat203...'
grep -v -E "^(${SYSCALLS_SKIP})[[:space:]]" \
  runtest/syscalls > runtest/syscalls-jfs
```

These exclusions were defined **before** the run — not retroactively removed after failures. The 141 runtime skips are separate: LTP's own TCONF decisions during execution.

## How to Reproduce

### Install LTP 20210524

```bash
tar -xvf ltp-full-20210524.tar.xz
cd ltp-full-20210524
./configure --prefix=/opt/ltp-20210524
make all
make install

grep 20210524 /opt/ltp-20210524/Version
test -x /opt/ltp-20210524/runltp
```

We used the upstream `runltp` runner, not Kirk.

### Start Curvine and Mount FUSE

Start Master and Worker:

```bash
curvine-server \
  --service master \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml

curvine-server \
  --service worker \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml
```

Mount:

```bash
mkdir -p /curvine-fuse
curvine-fuse \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml \
  --mnt-path /curvine-fuse

mountpoint /curvine-fuse
```

Verify basic read/write before kicking off the full suite:

```bash
echo ok > /curvine-fuse/.ltp-ready
cat /curvine-fuse/.ltp-ready
rm -f /curvine-fuse/.ltp-ready
```

### Run All Seven Suites

```bash
export LTPROOT=/opt/ltp-20210524
export PATH=/opt/ltp-20210524/testcases/bin:$PATH
cd /opt/ltp-20210524

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RESULT_DIR="$PWD/curvine-results/$RUN_ID"
mkdir -p "$RESULT_DIR"

for suite in \
  fs_perms_simple \
  fsx \
  fs_bind \
  smoketest \
  io \
  fs-jfs \
  syscalls-jfs
do
  sudo -E ./runltp \
    -d /curvine-fuse \
    -f "$suite" \
    -S /tmp/curvine-ltp-skips.txt \
    -l "$RESULT_DIR/${suite}.log" \
    -o "$RESULT_DIR/${suite}.output.log" \
    -C "$RESULT_DIR/${suite}.failed.cmd" \
    -T "$RESULT_DIR/${suite}.tconf.cmd"
done
```

We store four artifacts per suite — normal log, raw output, failed commands, and TCONF commands — so the full run is auditable and individual failures can be replayed.

## What Matters in the Results

One note on the table: the `syscalls-jfs` row combines the full regression with independent re-runs of `fcntl36`, `fcntl36_64`, and `fork09`.

`PASS: 1129` is the headline. More important is finishing all seven suites with **`FAIL: 0` and `BROKEN: 0`**.

Zero failures means no applicable test case failed. Zero broken means the filesystem never entered a bad or unusable state mid-run. If you have run suites like this before, broken is often the uglier number — the test never reached its assertion because the filesystem died first.

We kept all 141 skips visible. A serious compatibility report must separate "verified pass" from "not applicable in this environment." Blurring the two makes the numbers meaningless.

## What a Clean Run Actually Means

Zero failures is not the same as "basic file ops work." That bar is too low. LTP hits combinations and edge cases most applications never touch — permission bit interactions, lock contention, fd behavior on error paths, extended attribute size limits. Each fix is real semantic alignment work.

The lasting value is not this scoreboard. It is a **repeatable compatibility baseline**. When Curvine's metadata layer or FUSE path changes, run the same suites again and catch semantic regressions before release. A one-time screenshot ages; a gate does not.

## Scope and Limits

Read this result with the boundaries in mind:

1. Across the seven selected LTP suites, every test applicable to our defined scope passed;
2. Items unrelated to FUSE filesystem compatibility, unsupported in the current environment, or outside the test definition were explicitly excluded;
3. LTP TCONF skips are recorded separately and not counted as passes;
4. This validates Curvine FUSE compatibility within the selected LTP 20210524 filesystem and POSIX/Linux interface scope — **not** that FUSE implements every Linux kernel capability.

Two concrete examples: `fallocate06` depends on `FS_NOCOW_FL`, which Curvine does not support yet; Fanotify-related tests require kernel capabilities beyond what the FUSE interface can expose.

Stating these limits does not weaken a zero-failure result. A report that will not name its boundaries is usually not worth trusting.

## Closing

Curvine completed a full LTP filesystem regression within the selected scope: 1,129 passed, 141 skipped for documented environmental reasons, 0 failed, 0 broken.

For users, Curvine FUSE is no longer a basic read/write demo — it has been exercised across a much broader slice of Linux filesystem and POSIX semantics. For developers, there is now a reusable compatibility gate that makes regressions harder to slip in quietly.

Both of those matter more than the number 1,129.
