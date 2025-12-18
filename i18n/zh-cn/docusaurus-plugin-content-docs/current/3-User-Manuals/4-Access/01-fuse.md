# Fuse模式访问
除了libsdk、s3 gateway等方式， curvine旨在提供一个通用的接入方式, 无需对应用做任何修改，通过fuse本地路径挂载，无缝接入curvine服务。 

在云原生环境下，通过fuse的方式使用会更加便捷， 可以通过卷挂载的形式来接入。 目前curvine同样支持csi driver， 详情参见 [curvine csi](../5-K8S-CSI-Driver/01-Setup.md)

# 使用方法
 `在build/dist` 下执行 `.bin/curvine-fuse restart`,  便可以启动挂载。默认情况下， curvine挂载在 `/curvine-fuse` 路径下，你也可以指定路径挂载参数`--mnt-path`。
 
 在fuse路径下，可以使用常规的linux文件操作命令。 比如 `ls`、`cat` , `rm`, `mv`, `mkdir`, `du` 等。

示例：

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


# fuse支持程度
 :::tip
 在不同的发行版上，fuse驱动版本略有差异， curvine目前支持fuse2和fuse3大多数场景， 详情参见 [支持的发行版](../../2-Deploy/1-quick-start.md)
 :::

除了常规的文件读写操作，目前curvine fuse 已经支持完备的user/group文件权限所有权控制， 此外还支持扩展xattr、软连接symlink、硬链接link等能力， 

curvine fuse目前通过了绝大多数的ltp测试， 在ltp-full-20210524 测试集版本上，通过率已达到72%。
 
 测试结果如下

| 测试集            | 总测试 | 跳过(SKIP) | 失败(FAIL) | 通过(PASS) |
|-------------------|--------|------------|------------|------------|
| fs_perms_simple   | 18     | 0          | 0          | 18         |
| fsx               | 1      | 0          | 0          | 1          |
| fs_bind           | 1      | 0          | 0          | 1          |
| smoketest         | 13     | 0          | 1          | 12         |
| io                | 2      | 0          | 1          | 1          |
| fs                | 29     | 0          | 13         | 16         |
| syscall           | 1206   | 32         | 300        | 874        |
| **总计**          | 1270   | 32         | 315        | 923        |


目前测试case中多数问题由随机写、文件锁等能力导致失败，相关能力在持续迭代，欢迎一起！







