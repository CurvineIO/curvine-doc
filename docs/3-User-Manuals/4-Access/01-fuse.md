# Fuse Mode Access
In addition to libsdk, s3 gateway and other methods, Curvine aims to provide a universal access method that requires no application modifications. Through FUSE local path mounting, applications can seamlessly integrate with Curvine services.

In cloud-native environments, using FUSE becomes more convenient as it can be accessed through volume mounting. Currently, Curvine also supports CSI driver. For details, see [Curvine CSI](../5-K8S-CSI-Driver/01-Setup.md)

# Usage
Execute `.bin/curvine-fuse restart` under `build/dist` to start mounting. By default, Curvine mounts under the `/curvine-fuse` path. You can also specify the mount path parameter `--mnt-path`.

Under the FUSE path, you can use conventional Linux file operation commands such as `ls`, `cat`, `rm`, `mv`, `mkdir`, `du`, etc.

Example:

```bash
[root@curvine-dev curvine-fuse]# echo "hello curvine" > a.txt
[root@curvine-dev curvine-fuse]# cat a.txt
hello curvine
[root@curvine-dev curvine-fuse]# du -h a.txt
512     a.txt
[root@curvine-dev curvine-fuse]# mkdir -p b/c
[root@curvine-dev curvine-fuse]# ls -l
total 1
-rw-rw-rw-. 1 root root   14 Sep 19 14:41 a.txt
drwxrwxrwx. 1 root root 4096 Sep 19 14:41 b
[root@curvine-dev curvine-fuse]# tree
.
├── a.txt
└── b
    └── c

2 directories, 1 file
```

# FUSE Support Level
:::tip
FUSE driver versions vary slightly across different distributions. Curvine currently supports most scenarios of FUSE2 and FUSE3. For details, see [Supported Distributions](../../2-Deploy/1-quick-start.md)
:::

In addition to conventional file operations, Curvine FUSE currently supports complete user/group file permission ownership control, as well as extended xattr, symbolic links (symlink), hard links (link) and other capabilities.

Curvine FUSE has currently passed the vast majority of LTP tests. On the ltp-full-20210524 test suite version, the pass rate has reached 72%.

Test results are as follows:

| Test Suite         | Total Tests | Skip (SKIP) | Fail (FAIL) | Pass (PASS) |
|--------------------|-------------|-------------|-------------|-------------|
| fs_perms_simple    | 18          | 0           | 0           | 18          |
| fsx                | 1           | 0           | 0           | 1           |
| fs_bind            | 1           | 0           | 0           | 1           |
| smoketest          | 13          | 0           | 1           | 12          |
| io                 | 2           | 0           | 1           | 1           |
| fs                 | 29          | 0           | 13          | 16          |
| syscall            | 1206        | 32          | 300         | 874         |
| **Total**          | 1270        | 32          | 315         | 923         |

Currently, most issues in test cases are caused by failures in random write, file locking and other capabilities. Related capabilities are continuously being iterated. Welcome to join us!