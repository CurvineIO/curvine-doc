# 命令行工具

本节介绍 Curvine 支持的命令行工具及使用方法。Curvine 提供：

- **原生命令行工具 `cv`**：基于 Rust 的主 CLI（推荐）。发行目录中通常以 `bin/cv` 调用（如 `build/dist/bin/cv`）。
- **HDFS 兼容命令行工具 `curvine`**：已弃用，新用法请使用 `cv`。
- **POSIX / FUSE**：通过 FUSE 挂载 Curvine 后，可在挂载点上使用标准 Linux 命令（`ls`、`cp`、`mv` 等）。

所有 `cv` 命令均支持以下可选全局参数：

| 全局参数 | 说明 |
|----------|------|
| `-c, --conf <路径>` | 配置文件路径（可选）。可通过环境变量 `CURVINE_CONF_FILE` 指定默认值。 |
| `--master-addrs <地址列表>` | Master 地址列表，例如 `m1:8995,m2:8995`。 |

---

## Rust 原生命令行工具：`cv`

查看总览：

```bash
cv --help
```

示例输出：

```
Usage: cv [OPTIONS] <COMMAND>

Commands:
  fs           文件系统操作
  report       集群状态与容量
  load         将 UFS 数据加载到 Curvine
  load-status  查询加载任务状态
  cancel-load  取消加载任务
  mount        将 UFS 挂载到 Curvine
  umount       从 Curvine 卸载 UFS
  node         管理 Worker 节点（列表、退役）
  version      显示 CLI 版本
  help         打印帮助
```

子命令的详细选项请使用 `cv <子命令> --help`。

**约定：** 本文中 CLI 以 `cv` 称呼（即发行包中的二进制名，如 `build/dist/bin/cv`）。通过 `cargo run -p curvine-cli` 运行时，帮助中程序名可能显示为 `curvine-cli`。尖括号中的参数（如 `<PATH>`、`<JOB_ID>`）为位置参数；方括号内为可选项。

---

### 1. `report` — 集群状态

**用法：** `cv report [json|all|capacity|used|available] [OPTIONS]`

查看集群概览与容量。完整选项请执行 `cv report --help`。

| 命令 | 说明 |
|------|------|
| `cv report` | 集群概要（默认，含 Worker 列表）。 |
| `cv report json` | 以 JSON 输出完整集群信息。 |
| `cv report all [--show-workers true\|false]` | 与默认相同；可控制是否列出 Worker。 |
| `cv report capacity [WORKER_ADDRESS]` | 容量汇总：集群总览或指定 Worker（按地址）。 |
| `cv report used` | 各 Worker 已用容量。 |
| `cv report available` | 各 Worker 可用容量。 |

示例：

```bash
bin/cv report
bin/cv report json
bin/cv report capacity
bin/cv report capacity 192.168.1.10
bin/cv report used
bin/cv report available
```

---

### 2. `node` — Worker 管理

**用法：** `cv node [OPTIONS] [-- <NODES>...]`

管理 Worker 节点（列表、加入/移出退役列表）。详情请执行 `cv node --help`。

| 选项 | 说明 |
|------|------|
| `-l, --list` | 列出所有 Worker 节点（存活与丢失）。 |
| `--add-decommission` | 将 Worker 加入退役列表（需附带一个或多个 NODES）。 |
| `--remove-decommission` | 将 Worker 从退役列表移除（需附带一个或多个 NODES）。 |

`<NODES>`：一个或多个 `hostname:port`。可写为多个空格分隔参数，或一个逗号分隔列表（如 `host1:9000,host2:9000`）。

示例：

```bash
bin/cv node -l
bin/cv node --add-decommission host1:9000 host2:9000
bin/cv node --add-decommission host1:9000,host2:9000
bin/cv node --remove-decommission host1:9000
```

---

### 3. `fs` — 文件系统操作

**用法：** `cv fs [OPTIONS] <COMMAND> [ARGS]`

对 Curvine 执行类 HDFS 的文件操作。完整选项请使用 `cv fs --help` 与 `cv fs <子命令> --help`。

`fs` 的全局标志：

| 标志 | 说明 |
|------|------|
| `--cache-only` | 仅查看/操作 Curvine 中已缓存的数据（关闭统一 UFS 视图）。仅对当前命令生效。 |

**子命令：**

| 命令 | 说明 |
|------|------|
| `cv fs ls [path]` | 列出目录（默认路径 `/`）。 |
| `cv fs mkdir <path> [-p\|--parents]` | 创建目录；`-p` 可递归创建父目录。 |
| `cv fs put <本地路径> <远程路径>` | 上传本地文件到 Curvine。 |
| `cv fs get <path> <本地路径>` | 从 Curvine 下载文件到本地。 |
| `cv fs cat <path>` | 输出文件内容。 |
| `cv fs touch <path>` | 创建空文件或更新时间戳。 |
| `cv fs rm <path> [-r\|--recursive]` | 删除文件或目录；`-r` 递归删除。 |
| `cv fs stat <path>` | 查看文件或目录状态。 |
| `cv fs count <path>` | 统计路径下文件/目录数量。 |
| `cv fs mv <源路径> <目标路径>` | 移动或重命名。 |
| `cv fs du <path> [-h\|--human-readable] [-v\|--verbose]` | 目录空间占用。 |
| `cv fs df [-h\|--human-readable]` | 文件系统空间（容量/已用/可用）。 |
| `cv fs chmod <mode> <path> [--recursive]` | 设置权限（如 `755`）。 |
| `cv fs chown <owner:group> <path> [--recursive]` | 设置属主与属组。 |
| `cv fs blocks <path> [--format table\|json]` | 显示文件的块位置信息（默认：table）。 |

示例：

```bash
bin/cv fs ls /
bin/cv fs ls / --cache-only
bin/cv fs mkdir /data
bin/cv fs mkdir -p /data/a/b
bin/cv fs put ./local.txt /data/remote.txt
bin/cv fs get /data/remote.txt ./local.txt
bin/cv fs cat /data/remote.txt
bin/cv fs rm /data/old.txt
bin/cv fs rm -r /data/dir
bin/cv fs stat /data
bin/cv fs count /data
bin/cv fs mv /data/a /data/b
bin/cv fs du -h /data
bin/cv fs df -h
bin/cv fs chmod 755 /data/script.sh
bin/cv fs chown user:group /data
bin/cv fs blocks /data/file.txt --format json
```

**`cv fs ls` 选项（类 HDFS）：**

| 选项 | 说明 |
|------|------|
| `-C, --path-only` | 仅输出路径。 |
| `-d, --directory` | 将目录当作普通文件列出。 |
| `-H, --human-readable` | 人类可读的文件大小。 |
| `-q, --hide-non-printable` | 将不可打印字符显示为 `?`。 |
| `-R, --recursive` | 递归列出。 |
| `-r, --reverse` | 反向排序。 |
| `-t, --mtime` | 按修改时间排序（最新在前）。 |
| `-S, --size` | 按大小排序。 |
| `-u, --atime` | 使用最后访问时间显示与排序。 |
| `-l, --long-format` | 长格式列表。 |

---

### 4. `mount` — 将 UFS 挂载到 Curvine

**用法：** `cv mount [UFS_PATH CV_PATH] [OPTIONS]` — 不传参数时列出所有挂载点。

将底层存储路径（UFS）挂载到 Curvine 路径。支持的协议包括 **S3** 与 **HDFS**。完整选项请执行 `cv mount --help`。全局选项（如配置文件 `-c, --conf`）同样适用；在 mount 上下文中，`-c` 是 `--config`（UFS key=value）的简写，不是配置文件。

**列出挂载点（不传参数）：**

```bash
bin/cv mount
```

**列出挂载点并检查有效性：**

```bash
bin/cv mount --check
```

**挂载时的选项（在指定 UFS 路径与 Curvine 路径时）：**

| 选项 | 说明 |
|------|------|
| `-c, --config <key=value>` | UFS 配置键值对（可多次）。 |
| `--update` | 更新已存在挂载点的配置。 |
| `--mnt-type <TYPE>` | 挂载类型（默认：`cst`）。 |
| `--consistency-strategy <STRATEGY>` | 一致性策略（默认：`none`）。 |
| `--ttl-ms <DURATION>` | TTL，支持时长形式，如 `7d`（默认：`7d`）。 |
| `--ttl-action <ACTION>` | TTL 过期后的动作：`none`、`delete`、`persist`、`evict`、`flush`（默认：`delete`）。 |
| `--replicas <N>` | 副本数。 |
| `--block-size <SIZE>` | 块大小（如 `128MB`）。 |
| `-s, --storage-type <TYPE>` | 存储类型。 |
| `--write-type <TYPE>` | 写类型：`cache`、`through`、`async_through`、`cache_through`（默认：`async_through`）。 |
| `--provider <PROVIDER>` | UFS 提供方：`auto`、`oss-hdfs`、`opendal`。详见下文。 |
| `--check` | 列出时检查每个挂载点并显示 Valid/Invalid。 |


**--provider参数的特别说明**,  以oss场景为例，同样是oss://test-bucket， 可能是普通对象存储桶，也可能是oss-hdfs加速桶。
`--provider` 可以指定挂载该 UFS 时使用的底层实现（见 [附录：UFS 挂载参数](#附录ufs-挂载参数)）。

| 取值 | 说明 | 适用协议 |
|------|------|----------|
| `auto` | 由系统根据 URI 协议自动选择（默认）。OSS 默认优先 JindoSDK（oss-hdfs）；S3、HDFS、WebHDFS、COS、GCS、Azure 等使用 OpenDAL。 | 全部 |
| `oss-hdfs` | 使用 JindoSDK 访问 OSS，适合阿里云 OSS / OSS-HDFS 湖仓场景。 | 仅 `oss://` |
| `opendal` | 使用 OpenDAL 访问对象存储或 HDFS，无 JVM 依赖，支持 S3/OSS/COS/GCS/Azure/HDFS/WebHDFS。 | `s3://`、`oss://`、`hdfs://`、`webhdfs://`、`cos://`、`gcs://`、`azblob://` 等 |

示例

OSS（JindoSDK，适合湖仓）
```bash
bin/cv mount oss://my-bucket/prefix /oss-data --provider oss-hdfs \
  -c oss.endpoint=oss-cn-hangzhou.aliyuncs.com \
  -c oss.accessKeyId=xxx \
  -c oss.accessKeySecret=yyy
```

将 S3 桶挂载到 `/s3-testing`（不指定 provider 时 S3 使用 auto → opendal）：

```bash
bin/cv mount s3://bucket/prefix /s3-testing \
  -c s3.endpoint_url=http://hostname.com \
  -c s3.region_name=cn \
  -c s3.credentials.access=access_key \
  -c s3.credentials.secret=secret_key \
  -c s3.force.path.style=true
```

各 UFS 类型（S3、OSS、HDFS、WebHDFS）的详细参数列表见文末 [附录：UFS 挂载参数](#附录ufs-挂载参数)。

:::warning
执行挂载时会对 UFS 做基本可用性与配置检查。若 UFS 不可达或配置错误，可能挂载失败并提示 `service error`。请确保 UFS 可访问且凭证正确。
:::

:::warning
一个 UFS 路径只能挂载到一个 Curvine 路径。不支持挂载到 Curvine 根路径；不支持嵌套挂载。若已挂载 `curvine://a/b`，则不能在 `curvine://a` 或 `curvine://a/b/c` 再挂载其他 UFS。
:::

---

### 5. `umount` — 卸载 UFS

**用法：** `cv umount <CURVINE_PATH>`

卸载已挂载的 Curvine 路径：

```bash
bin/cv umount /s3-testing
```

---

### 6. `load` — 将 UFS 数据加载到 Curvine

**用法：** `cv load [OPTIONS] <PATH>`

提交从 UFS 加载数据到 Curvine 的任务。UFS 路径需已通过 `mount` 挂载。

| 参数/选项 | 说明 |
|----------|------|
| `<PATH>` | 要加载的 UFS 路径（位置参数，必填）。 |
| `-w, --watch` | 提交后持续查看加载任务状态直至完成或失败。 |
| `-c, --conf <path>` | 配置文件（默认使用 `CURVINE_CONF_FILE`）。 |

示例：

```bash
bin/cv load s3://my-bucket/path/to/data
bin/cv load s3://my-bucket/path/to/data --watch
```

成功时会输出 **job ID**，可用于 `load-status` 或 `cancel-load`。

:::warning
加载前需先将底层存储挂载到 Curvine（参见 `cv mount`）。
:::

---

### 7. `load-status` — 查询加载任务状态

**用法：** `cv load-status [OPTIONS] <JOB_ID>`

按 job ID 查询（并可轮询）加载任务状态。

| 参数/选项 | 说明 |
|----------|------|
| `<JOB_ID>` | 加载任务 ID（位置参数，必填）。 |
| `-v, --verbose` | 详细输出。 |
| `-w, --watch <INTERVAL>` | 按间隔轮询状态，默认 `5s`。支持如 `5s`、`1m`。 |
| `-c, --conf <path>` | 配置文件（默认使用 `CURVINE_CONF_FILE`）。 |

示例：

```bash
bin/cv load-status <job_id>
bin/cv load-status <job_id> --watch
bin/cv load-status <job_id> -w 1s
```

按 Ctrl+C 可停止轮询。

---

### 8. `cancel-load` — 取消加载任务

**用法：** `cv cancel-load [OPTIONS] <JOB_ID>`

按 job ID 取消加载任务。

| 参数/选项 | 说明 |
|----------|------|
| `<JOB_ID>` | 加载任务 ID（位置参数，必填）。 |
| `-c, --conf <path>` | 配置文件（默认使用 `CURVINE_CONF_FILE`）。 |

示例：

```bash
bin/cv cancel-load <job_id>
```

---

### 9. `version` — CLI 版本

**用法：** `cv version`

输出 CLI 版本：

```bash
bin/cv version
```

---

## POSIX 命令（FUSE 挂载）

Curvine 提供符合 POSIX 的 FUSE 接口。在挂载 Curvine FUSE 文件系统后（例如通过 `bin/curvine-fuse.sh start`），可在挂载点上使用标准 Linux 命令。

**特性：**

- 符合 FUSE 3.0，并兼容 FUSE 2.0。
- 语义与常见文件系统（如 ext4、xfs）一致。
- 支持 Linux 内核 3.10+。
- 提供 POSIX 文件操作及相应的原子性保证。

**常用命令示例：**

```bash
# 基础文件操作
ls, cp, mv, rm, mkdir

# 内容操作
cat, grep, sed, awk

# 文件系统信息
df -h, du -sh, stat

# 权限
chmod, chown, getfacl

# 符号链接
ln -s, readlink

# 扩展属性
getfattr, setfattr, listxattr
```

---

## 附录：UFS 挂载参数

以下为 `cv mount` 时通过 `-c key=value` 传入的各 UFS 类型参数说明。**必填**表示必须提供；**可选**表示可不提供（有默认值或可从挂载 URI 自动推导）。

### S3（`s3://`、`s3a://`）

通过 `--provider opendal` 或自动选择时使用。

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `s3.endpoint_url` | 必填 | S3 服务地址，须以 `http://` 或 `https://` 开头。 |
| `s3.credentials.access` | 必填 | Access Key ID。 |
| `s3.credentials.secret` | 必填 | Secret Access Key。 |
| `s3.region_name` | 可选 | 区域名；AWS 端点建议填写，其他可选（默认 `undefined`）。 |
| `s3.force.path.style` | 可选 | 是否使用路径风格访问（如 MinIO），`true`/`false`，默认 `false`。 |
| `s3.retry_times` | 可选 | 请求重试次数，默认 `3`。 |
| `s3.connect_timeout` | 可选 | 连接超时，如 `30s`，默认 `30s`。 |
| `s3.read_timeout` | 可选 | 读超时，如 `120s`，默认 `120s`。 |

### OSS（`oss://`）

用于阿里云 OSS / OSS-HDFS（JindoSDK 或 OpenDAL OSS）。

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `oss.endpoint` | 必填 | OSS 端点地址（如 `oss-cn-hangzhou.aliyuncs.com` 或完整 URL）。 |
| `oss.accessKeyId` | 必填 | 阿里云 AccessKey ID。 |
| `oss.accessKeySecret` | 必填 | 阿里云 AccessKey Secret。 |
| `oss.region` | 可选 | 区域。 |
| `oss.data.endpoint` | 可选 | 数据访问端点。 |
| `oss.second.level.domain.enable` | 可选 | 是否启用二级域名，`true`/`false`，默认 `true`。 |
| `oss.data.lake.storage.enable` | 可选 | 是否启用湖仓存储，`true`/`false`，默认 `true`。 |

### HDFS（`hdfs://`）

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `hdfs.namenode` | 可选 | NameNode 地址，如 `hdfs://namenode:9000/`。不填时从挂载 URI 的 authority 推导。 |
| `hdfs.root` | 可选 | 根路径，默认 `/`。不填时可从挂载路径自动推导。 |
| `hdfs.user` | 可选 | HDFS 用户名；未设置时使用环境变量 `HADOOP_USER_NAME` 或 `USER`。 |
| `hdfs.atomic_write_dir` | 可选 | 设为 `true` 时在 root 下使用 `atomic_write_dir` 目录做原子写。 |
| `hdfs.kerberos.ccache` | 可选 | Kerberos 凭据缓存路径；也可通过环境变量 `KRB5CCNAME` 指定。 |
| `hdfs.kerberos.krb5_conf` | 可选 | `krb5.conf` 文件路径；会设置环境变量 `KRB5_CONFIG`。 |
| `hdfs.kerberos.keytab` | 可选 | Keytab 文件路径；会设置环境变量 `KRB5_KTNAME`。 |

### WebHDFS（`webhdfs://`）

基于 HTTP 的 HDFS 接口。

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `webhdfs.endpoint` | 可选 | WebHDFS 服务地址，如 `http://namenode:9870`。不填时从 URI 的 authority 推导。 |
| `webhdfs.root` | 可选 | 根路径，默认 `/`。 |
| `webhdfs.delegation` | 可选 | Delegation token，用于认证。 |
