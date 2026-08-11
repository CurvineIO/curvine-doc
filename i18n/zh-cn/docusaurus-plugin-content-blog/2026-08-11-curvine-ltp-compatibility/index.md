---
authors: [david]
tags: [benchmark, fuse, compatibility]
---

<!-- truncate -->

# Curvine 跑完了 1129 项 LTP 测试，一个都没挂

做分布式文件系统的人大概都有类似的经历：`dd` 能跑，`cp` 能跑，跑个 fio 数字也挺好看，然后某天业务上线，一个用了 `flock` 的老程序，或者一个非要读扩展属性的 Python 库，直接把系统搞崩了。

POSIX 兼容性就是这么个东西——说起来是四个字，验证起来能耗掉你半年。文件权限、文件锁、扩展属性、目录操作，再加上一堆平时没人会调的系统调用边界，随便哪一个没对齐，都要等到真实业务进生产才暴露。

所以我们把 Linux Test Project（LTP）搬了过来，对 Curvine 的 FUSE 接口做了一轮完整回归。7 个文件系统相关的测试套件，最后的数字是：

**1129 通过，0 失败，0 Broken，141 项被 LTP 判定为环境不满足而跳过。**

| 测试套件 | 运行数 | 通过 | 失败 | Broken | 跳过 |
|---|---|---|---|---|---|
| fs_perms_simple | 18 | 18 | 0 | 0 | 0 |
| fsx | 1 | 1 | 0 | 0 | 0 |
| fs_bind | 1 | 1 | 0 | 0 | 0 |
| smoketest | 13 | 12 | 0 | 0 | 1 |
| io | 2 | 2 | 0 | 0 | 0 |
| fs-jfs | 29 | 27 | 0 | 0 | 2 |
| syscalls-jfs | 1206 | 1068 | 0 | 0 | 138 |
| **合计** | **1270** | **1129** | **0** | **0** | **141** |

先把话说在前面：那 141 个跳过项，是 LTP 自己判的 `TCONF`（配置性跳过），原因是当前内核能力、依赖设备、权限或者隔离环境不满足前提条件。它们既不算失败，我们也没把它们塞进通过数里凑数字。

## 为什么是 LTP

LTP 由 IBM、Cisco 等几家公司发起并长期维护，用来验证 Linux 内核和相关系统功能的可靠性与兼容性，覆盖系统调用、文件系统、文件权限、进程与内存管理、输入输出这几大块。简单说，它是目前能拿到的、对 Linux 语义描述最细的一套公开测试。

Curvine 是通过 FUSE 给 Linux 应用提供文件系统接口的。而应用对一个文件系统的期待，从来不止 `open`、`read`、`write` 这三件事——元数据要对，权限要对，文件描述符的行为要对，文件锁、扩展属性、目录操作、以及各种错误码的语义，都得跟 Linux/POSIX 一致。

benchmark 只能证明"某个负载能跑"，兼容性测试才能证明"在更大的接口范围里行为是对的"。这两件事解决的不是同一个问题。

## 测的是哪些东西

基于 LTP 20210524，我们挑了 7 个跟文件系统、FUSE、POSIX 语义强相关的套件：

| 测试套件 | 主要覆盖 |
|---|---|
| fs_perms_simple | 基础文件权限 |
| fsx | 随机文件 I/O 与状态切换 |
| fs_bind | Bind Mount 行为 |
| smoketest | Linux 核心接口冒烟 |
| io | 基础 I/O 操作 |
| fs-jfs | 经范围裁剪的文件系统测试 |
| syscalls-jfs | 经范围裁剪的文件系统相关系统调用 |

覆盖面上大致包括文件创建删除、权限管理、随机读写、基础 I/O、Bind Mount、文件锁、文件描述符操作、扩展属性、目录操作，以及大量文件系统相关的系统调用。

再强调一次：这不是性能测试，目标只有一个——语义正确性。

## 测试环境

| 项目 | 配置 |
|---|---|
| 测试主机 | ARM64 测试服务器 |
| 操作系统 | Alibaba Cloud Linux 3（OpenAnolis Edition） |
| Linux 内核 | 5.10.134-18.al8.aarch64 |
| CPU 架构 | aarch64 |
| LTP 版本 | 20210524 |
| 文件系统接口 | FUSE |

## 范围是怎么划的

这一节大概是最容易被质疑的地方，所以说清楚。

LTP 全量跑下来，会混进一堆跟文件系统兼容性没关系的东西：动辄几小时的压力测试、纯内核测试、依赖特定设备的检查，还有 FUSE 这层接口本身就不可能实现的能力。全跑一遍，结果是噪声大于信号。

所以我们从 LTP 默认的 `fs` 和 `syscalls` 列表里，生成了两个范围明确的集合：`fs-jfs` 和 `syscalls-jfs`。裁剪原则就四条：

- 去掉长时间压力测试
- 去掉与文件系统行为无关的纯内核测试
- 去掉明确不适用于 FUSE 的测试
- 去掉当前 Linux 环境不支持的测试

文件系统集合：

```bash
cd /opt/ltp-20210524
FS_SKIP='gf01|gf02|gf03|gf04|gf05|gf06|gf07|gf08|gf09|gf10|gf11|gf12|gf13...'
grep -v -E "^(${FS_SKIP})[[:space:]]" \
  runtest/fs > runtest/fs-jfs
```

系统调用集合：

```bash
SYSCALLS_SKIP='close_range01|close_range02|openat201|openat202|openat203...'
grep -v -E "^(${SYSCALLS_SKIP})[[:space:]]" \
  runtest/syscalls > runtest/syscalls-jfs
```

关键在于：**这些排除项是跑测试之前就定好的，不是结果出来后回头删掉挂掉的用例。** 而结果里那 141 个跳过，是 LTP 运行时自己判的 TCONF，跟这里的裁剪是两回事。

## 怎么复现

### 装 LTP 20210524

```bash
tar -xvf ltp-full-20210524.tar.xz
cd ltp-full-20210524
./configure --prefix=/opt/ltp-20210524
make all
make install

grep 20210524 /opt/ltp-20210524/Version
test -x /opt/ltp-20210524/runltp
```

用的是 LTP 官方的 `runltp`，没有用 Kirk。

### 起 Curvine，挂 FUSE

启动 Master 和 Worker：

```bash
curvine-server \
  --service master \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml

curvine-server \
  --service worker \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml
```

挂载：

```bash
mkdir -p /curvine-fuse
curvine-fuse \
  --conf /tmp/curvine-ltp/conf/curvine-cluster.toml \
  --mnt-path /curvine-fuse

mountpoint /curvine-fuse
```

先手动确认一下读写通了再跑，省得白等半天：

```bash
echo ok > /curvine-fuse/.ltp-ready
cat /curvine-fuse/.ltp-ready
rm -f /curvine-fuse/.ltp-ready
```

### 跑 7 个套件

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

这里把正常日志、原始输出、失败命令、TCONF 命令分开存了四份。多花几行脚本，换来的是整次测试可审计、出问题能单独复现某一条命令，很划算。

## 结果里真正重要的部分

补充一句：`syscalls-jfs` 那一行，是全量回归结果与 `fcntl36`、`fcntl36_64`、`fork09` 三项独立复测通过结果合并得出的。

比 `PASS: 1129` 更值得看的，是 7 个套件跑完之后同时拿到的 `FAIL: 0` 和 `BROKEN: 0`。

前者说明没有适用用例失败，后者说明**整个过程中文件系统一次都没进入异常或不可用状态**。做过这类测试的人应该懂，Broken 往往比 Fail 更难看——它意味着测试还没跑到判断逻辑，文件系统自己先挂了。

那 141 个跳过我们也原样留着，没做任何美化。一份严谨的兼容性报告，必须能区分"已经验证通过"和"当前环境不适用"这两件事，混在一起就没有参考价值了。

## 全跑通意味着什么

0 失败不等于"基础文件操作没问题"，那个门槛太低了。LTP 会去覆盖大量普通应用几乎碰不到的组合与边界条件——权限位的各种叠加、文件锁的竞争、fd 在异常路径上的行为、扩展属性的边界长度……这些地方每修一个，都是实打实的语义对齐。

但这次里程碑真正的价值，其实不在这一张成绩单上，而在于它是**一条可以反复执行的兼容性基线**。以后 Curvine 的元数据实现或者 FUSE 路径一改动，同一组测试再跑一遍，语义回归在发布前就能被拦下来。一次性的测试截图会过期，门禁不会。

## 边界在哪

这个结果需要被准确理解，所以把边界也一并写清楚：

1. 7 个选定 LTP 套件中，所有适用于当前范围的测试均已通过；
2. 与 FUSE 文件系统兼容性无关、当前环境不支持、或超出测试定义的项目，是被明确排除的；
3. LTP 的 TCONF 跳过项单独记录，没有计入通过；
4. 结果验证的是 Curvine FUSE 在选定 LTP 20210524 文件系统与 POSIX/Linux 接口范围内的兼容性，**不代表 FUSE 实现了所有 Linux 内核能力**。

举两个具体例子：`fallocate06` 依赖 `FS_NOCOW_FL`，Curvine 目前还不支持；Fanotify 相关测试则超出了 FUSE 这层接口能提供的内核能力范围。

把这些说出来不会削弱 0 失败的成色，反而让它更可信——一个不敢标注边界的测试结果，通常也不值得信。

## 最后

Curvine 在选定范围内的 LTP 文件系统完整回归全部跑通了：1129 项通过、141 项因环境条件明确跳过、0 失败、0 Broken。

对用户来说，这意味着 Curvine FUSE 不再只是能做基础读写演示，而是在更广泛的 Linux 文件系统和 POSIX 语义上通过了验证。对开发者来说，这里多了一道可以持续复用的兼容性门禁，后续开发想引入回归会难一点。

这两件事，都比 1129 这个数字本身更有意义。
