# 命令行工具
介绍 Curvine 支持的命令行工具和使用方法. Curvine提供了原生命令行工具`cv`,  以及hdfs兼容的命令行工具`curvine` (deprecated). 此外Curvine实现了POSIX标准的FUSE接口, 在系统中挂载Curvine后，可以直接通过Linux标准命令访问Curvine文件系统.

## Rust原生命令行工具`cv`
您可以直接执行 `cv` 命令获得帮助;
```bash
Usage: cv <COMMAND>

Commands:
  fs
  report
  load         Loading external files into Curvine
  load-status  Query loading task status
  cancel-load  Cancel loading task
  mount        mount ufs to curvine
  umount       unmount ufs
  version      show cli version
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

### 1. Report子命令

使用`cv report` 子命令来查看集群状态， `cv report -h` 查看可用参数。

| 命令格式                       | 功能描述                             |
|----------------------------|------------------------------------|
| bin/cv report         | 输出集群概要信息                    |
| bin/cv report capacity | 输出集群概要和每个worker的容量详细信息  |
| bin/cv report info    | 输出集群和worker节点信息          |

### 2. `fs` 子命令
使用`cv fs` 子命令来执行hdfs命令. `fs` 子命令提供了主流的文件操作功能, 命令格式和功能描述如下:

| 命令格式                       | 功能描述                             |
|----------------------------|------------------------------------|
| bin/cv fs ls /         | 列出指定目录下的文件和目录           |
| bin/cv fs mkdir /dir   | 创建目录                             |
| bin/cv fs rm /file     | 删除文件                             |
| bin/cv fs cat /file    | 显示文件内容                         |
| bin/cv fs put /local/file /hdfs/path | 上传本地文件到Curvine |
| bin/cv fs get /hdfs/path /local/file | 从Curvine下载文件到本地 |
| bin/cv fs stat /file | 查询文件或目录状态 |
| bin/cv fs count /path | 统计目录下文件数量 |
| bin/cv fs touchz /path | 创建文件 |
| bin/cv fs df | 文件系统可用空间 |
| bin/cv fs du /path | 统计目录占用空间大小 |

### 3. `mount` 子命令
使用`cv mount` 子命令来挂载底层存储到Curvine上.  目前支持 `s3`协议。

示例：将 `s3://testing` 挂载到 `/s3-testing`
```bash
bin/cv mount s3://s3/testing /s3-testing \
-c s3.endpoint_url=http://hostname.com \
-c s3.region_name=cn \
-c s3.credentials.access=access_key \
-c s3.credentials.secret=secret_key \
-c s3.path_style=true
```

检查挂载列表
```bash
bin/cv mount-list
```

:::warning
一个 UFS 路径只能挂载到一个 Curvine 目录。 不支持挂载到curvine的根路径； 不支持嵌套挂载。 如果curvine://a/b 已经挂载，则curvine://a或者curvine://a/b/c等均无法挂载其他UFS。
:::

卸载底层存储：
```
bin/cv umount /s3-testing/
```

### 4. `load` 子命令
使用`cv load` 子命令来加载UFS数据到Curvine.

:::warning
加载数据之前，需要先将底层存储挂载到curvine
:::

```bash
bin/curvine load s3://my-bucket/test.data
```

成功时，load命令输出将显示jobid。您可以使用 $jobid 来检查加载状态，请参阅以下 load-status 命令：
```bash
bin/cv load-status $jobid
```

## hdfs兼容的命令行(deprecated)
Curvine 兼容hdfs访问协议，通过命令`bin/curvine fs`执行`hdfs fs`命令语法完全兼容的操作，如下示例：

示例：
```
# 查看文件、目录
bin/curvine fs -ls /

# 创建目录
bin/curvine fs -mkdir -p /dir/a
```

目前 Curvine 和 Hadoop 并非100%完全兼容，某些命令可能无法执行或者没有效果。如下命令已经通过严格的测试：

| 命令  | 功能描述                     |
|-------|----------------------------|
| ls    | 查看目录列表                 |
| mkdir | 创建目录                     |
| cat   | 查看文件内容                 |
| put   | 上传文件                     |
| get   | 下载文件                     |
| count | 统计文件、目录数量           |
| du    | 统计目录占用空间大小         |
| df    | 文件系统可用空间             |
| mv    | 重命名                       |
| stat  | 查询文件、目录状态           |
| rm    | 删除文件或者目录             |

:::tip
不在列表中的命令不代表不支持，而是未经过完整测试。 `curvine` 命令行工具依赖jvm环境，推荐您使用`cv` 原生命令。 如果有常见命令需求，欢迎提交Issue.
:::

## POSIX令行
Curvine 实现了符合 POSIX 标准的 FUSE(Filesystem in Userspace) 文件系统接口，
因此在 Linux 系统中挂载 Curvine 后，用户可以通过标准的 Linux 文件操作命令集进行交互。这一实现具有以下技术特性：

系统兼容性： 
1. 遵循 FUSE 3.0接口规范、兼容 FUSE 2.0。 
2. 兼容 ext4/xfs 等主流文件系统的操作语义 
3. 支持 Linux kernel 3.10+ 版本

功能特性：
1. 提供完整的 POSIX 文件操作接口 
2. 支持原子性操作保证

命令行操作支持：
用户可通过以下 Linux 核心命令进行操作：
```
# 基础文件操作
ls, cp, mv, rm, mkdir

# 文件内容操作
cat, grep, sed, awk

# 文件系统管理
df -h, du -sh, stat
```

Curvine 目前未实现权限管理，当执行以下权限相关命令时：
```
chmod  # 命令可执行但不会实际修改权限位
chown  # 用户/组变更操作不会生效
getfacl  # 无法获取有效的 ACL 信息
```
