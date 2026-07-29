# 命令行工具

本节基于当前仓库源码中的 `curvine-cli`、`build/cv` 和 `build/bin/dfs` 整理 Curvine 的命令行入口。当前主要有三类：

- **原生 Rust CLI `cv`**：推荐入口，功能最完整，命令树来自 `curvine-cli`。
- **兼容包装器 `dfs`**：发行包自带的兼容入口，`fs` / `report` 走 Java `CurvineShell`，保留 Hadoop `FsShell` 风格。
- **POSIX / FUSE**：通过 FUSE 挂载后，直接在挂载点使用标准 Linux 命令。

---

## 原生 CLI：`cv`

查看总览：

```bash
cv --help
```

当前源码对应的顶层命令为：

```text
Usage: cv [OPTIONS] <COMMAND>

Commands:
  fs
  report
  load
  export
  load-status
  cancel-load
  transfer
  mount
  umount
  node
  version
```

所有 `cv` 命令都支持以下全局参数：

| 全局参数 | 说明 |
|----------|------|
| `-c, --conf <PATH>` | 仅覆盖本次调用的集群配置文件。未指定时 CLI 使用正常配置路径或 `CURVINE_CONF_FILE`。 |
| `--master-addrs <ADDRS>` | 直接覆盖客户端配置里的 Master 地址列表，例如 `m1:8995,m2:8995`。 |

:::tip
生产环境通常直接使用 `cv`，因为集群配置已安装，或已通过 `CURVINE_CONF_FILE` 选择。仅在迁移或诊断时使用 `--conf` 指向非默认配置。`cv mount --config key=value` 仍表示 UFS 配置项。
:::

**约定：**

- 生产环境将发行包的 `bin/` 加入 `PATH` 后，直接使用 `cv`。
- 通过 `cargo run -p curvine-cli -- ...` 运行时，帮助中的程序名会显示为 `curvine-cli`。
- 本文中的 `<PATH>`、`<JOB_ID>` 等为位置参数；`[OPTION]` 表示可选项。

---

### 1. `report`：查看集群状态

**用法：** `cv report [json|all|capacity|used|available]`

| 命令 | 说明 |
|------|------|
| `cv report` | 默认概览，包含 active master、容量、inode/block 数和 worker 列表。 |
| `cv report json` | 以 JSON 输出完整 `MasterInfo`。 |
| `cv report all --show-workers false` | 文本概览，可关闭 worker 明细。 |
| `cv report capacity [WORKER_ADDRESS]` | 查看集群容量，或查看单个 worker 的容量详情。 |
| `cv report used` | 输出每个 live worker 的已用容量。 |
| `cv report available` | 输出每个 live worker 的可用容量。 |

示例：

```bash
cv report
cv report json
cv report all --show-workers false
cv report capacity
cv report capacity 192.168.1.10
cv report used
cv report available
```

:::note
当前实现里 `cv report capacity <WORKER_ADDRESS>` 按 worker 的 IP 地址匹配，不是按 `hostname:port` 匹配。
:::

---

### 2. `node`：管理 Worker 节点

**用法：** `cv node [OPTIONS] [-- <NODES>...]`

| 选项 | 说明 |
|------|------|
| `-l, --list` | 列出 live / lost worker。 |
| `--add-decommission <NODES>...` | 将一个或多个 worker 加入退役列表。 |
| `--remove-decommission <NODES>...` | 将一个或多个 worker 从退役列表移除。 |

`<NODES>` 支持两种形式：

- 多个空格分隔参数：`host1:8997 host2:8997`
- 单个逗号分隔参数：`host1:8997,host2:8997`

示例：

```bash
cv node -l
cv node --add-decommission host1:8997 host2:8997
cv node --add-decommission host1:8997,host2:8997
cv node --remove-decommission host1:8997
```

:::note
当前实现会在退役 API 调用前把 `hostname:port` 截断为 `hostname`。也就是说，端口主要用于人类可读和输入格式统一。
:::

---

### 3. `fs`：文件系统操作

**用法：** `cv fs [OPTIONS] <COMMAND> [ARGS]`

`fs` 自身额外支持一个全局开关：

| 选项 | 说明 |
|------|------|
| `--cache-only` | 仅查询 / 操作 Curvine 已缓存的数据，关闭统一 UFS 视图。 |

当前源码里 `fs` 支持的子命令如下：

| 命令 | 说明 |
|------|------|
| `cv fs ls [PATH]` | 列目录，默认路径 `/`。 |
| `cv fs mkdir <PATH> [-p\|--parents]` | 创建目录。 |
| `cv fs put <LOCAL_PATH> <REMOTE_PATH>` | 上传本地文件到 Curvine。 |
| `cv fs get <PATH> <LOCAL_PATH>` | 下载 Curvine 文件到本地。 |
| `cv fs cat <PATH>` | 输出文件内容。 |
| `cv fs touch <PATH>` | 创建空文件或更新时间戳。 |
| `cv fs rm <PATH> [-r\|--recursive]` | 删除文件或目录。 |
| `cv fs stat <PATH>` | 查看路径状态。 |
| `cv fs count <PATH>` | 统计目录下文件 / 目录数量。 |
| `cv fs mv <SRC_PATH> <DST_PATH>` | 移动或重命名。 |
| `cv fs du <PATH> [-h] [-v]` | 查看目录空间占用。 |
| `cv fs df [-h]` | 查看文件系统容量 / 已用 / 可用。 |
| `cv fs chmod <MODE> <PATH> [RECURSIVE]` | 修改权限。 |
| `cv fs chown <OWNER:GROUP> <PATH> [RECURSIVE]` | 修改属主 / 属组。 |
| `cv fs blocks <PATH> [--format table\|json]` | 查看文件块位置信息。 |
| `cv fs free <PATH> [-r\|--recursive]` | 释放已同步到 UFS 的 Curvine 缓存空间。 |

常用示例：

```bash
cv fs ls /
cv fs ls / --cache-only
cv fs mkdir -p /data/a/b
cv fs put ./local.txt /data/remote.txt
cv fs get /data/remote.txt ./local.txt
cv fs cat /data/remote.txt
cv fs stat /data
cv fs count /data
cv fs mv /data/a /data/b
cv fs du -h /data
cv fs df -h
cv fs chmod 755 /data/script.sh
cv fs chown user:group /data
cv fs blocks /data/file.txt --format json
cv fs free /data --recursive
```

`cv fs ls` 额外支持类 HDFS 的选项：

| 选项 | 说明 |
|------|------|
| `-C, --path-only` | 仅输出路径。 |
| `-d, --directory` | 将目录当作普通文件列出。 |
| `-H, --human-readable` | 以人类可读方式显示大小。 |
| `-q, --hide-non-printable` | 将不可打印字符显示为 `?`。 |
| `-R, --recursive` | 递归列目录。 |
| `-r, --reverse` | 反向排序。 |
| `-t, --mtime` | 按修改时间排序。 |
| `-S, --size` | 按大小排序。 |
| `-u, --atime` | 使用访问时间显示和排序。 |
| `-l, --long-format` | 长列表格式。 |

:::note
当前源码里 `chmod` / `chown` 的递归参数暴露为第三个位置参数 `[RECURSIVE]`，不是 `--recursive` 旗标。权限字符串支持八进制（如 `755`、`0o755`）和符号形式（如 `u=rwx,g=rx,o=rx`）。`chown` 支持 `user:group`、`user:` 和 `:group`。
:::

---

### 4. `mount`：将 UFS 挂载到 Curvine

当前实现把 `mount` 同时用于三件事：

- `cv mount`：列出全部挂载点
- `cv mount --check`：列出挂载点并逐个校验 UFS 可达性
- `cv mount <UFS_PATH> <CV_PATH> [OPTIONS]`：创建或更新挂载
- `cv mount resync <CV_PATH> [OPTIONS]`：对 `fs_mode` 挂载执行元数据重同步

常用选项如下：

| 选项 | 说明 |
|------|------|
| `--config <key=value>` | UFS 配置项，可重复传入多个键值对。 |
| `--update` | 更新已存在的挂载配置。 |
| `--check-path-consist <true\|false>` | 是否检查 `UFS_PATH` 与 `CV_PATH` 的路径一致性，默认 `true`。 |
| `--read-verify-ufs` | 读缓存时按 `mtime` / `len` 校验 UFS。 |
| `--ttl-ms <DURATION>` | TTL，默认 `7d`。支持 `1h`、`7d` 之类的时长格式。 |
| `--replicas <N>` | 覆盖副本数。 |
| `--block-size <SIZE>` | 覆盖块大小，例如 `128MB`。 |
| `-s, --storage-type <TYPE>` | 覆盖存储类型。 |
| `--write-type <cache_mode\|fs_mode>` | 当前源码只区分这两种模式，默认 `fs_mode`。 |
| `--provider <auto\|oss-hdfs\|opendal>` | 指定 UFS provider。 |
| `--check` | 仅在列挂载点时生效，附带有效性检查。 |
| `--dry-run` | `resync` 时只扫描和打印差异，不执行删除 / 创建。 |
| `--verbose` | `resync` 时打印更详细的逐文件日志。 |

**关于 `--provider`**：同一种 URI scheme 可能映射到不同实现。例如 `oss://...` 既可能走 OSS-HDFS / JindoSDK，也可能走 OpenDAL，因此可以通过 `--provider` 强制指定实现。

| 取值 | 说明 | 常见协议 |
|------|------|----------|
| `auto` | 按 URI scheme 自动选择实现。 | 所有已支持 scheme |
| `oss-hdfs` | 使用 JindoSDK / OSS-HDFS 语义。 | `oss://` |
| `opendal` | 使用 OpenDAL 后端。 | `s3://`、`oss://`、`hdfs://`、`webhdfs://`、`cos://`、`gcs://`、`azblob://` 等 |

当前实现还有几个容易遗漏的行为：

- 对 `s3://...` 路径，如果没有显式传 `s3.bucket_name`，CLI 会自动从 URI 提取并补全。
- 对 `hdfs://...` 路径，如果没有显式传 `hdfs.namenode` / `hdfs.root`，CLI 会自动从 URI 推导。
- 如果配置里出现 `hdfs.kerberos.*`，但既没有 `hdfs.kerberos.ccache`，环境里也没有 `KRB5CCNAME`，CLI 会打印 Kerberos ticket cache 警告。
- `validate_path_and_configs` 当前只对 S3 路径做额外格式校验；其它 scheme 主要依赖后续 provider 初始化和连通性检查。

示例：

```bash
# 列出挂载点
cv mount

# 列出挂载点并检查 UFS 可达性
cv mount --check

# 创建 S3 挂载
cv mount s3://bucket/datasets /bucket/datasets \
  --config s3.endpoint_url=http://hostname.com \
  --config s3.region_name=cn \
  --config s3.credentials.access=access_key \
  --config s3.credentials.secret=secret_key \
  --config s3.path_style=true \
  --provider opendal

# 通过 JindoSDK / OSS-HDFS 创建 OSS 挂载
cv mount oss://my-bucket/prefix /oss-data --provider oss-hdfs \
  --config oss.endpoint=oss-cn-hangzhou.aliyuncs.com \
  --config oss.accessKeyId=xxx \
  --config oss.accessKeySecret=yyy

# 手动执行一次元数据 resync
cv mount resync /bucket/datasets --dry-run --verbose
```

各 UFS 类型（S3、OSS、HDFS、WebHDFS）的常见参数列表见文末 [附录：UFS 挂载参数](#附录ufs-挂载参数)。

:::warning
默认开启 `--check-path-consist=true`。因此像 `s3://bucket/datasets` 这样的 UFS 路径，通常需要挂载到 `/bucket/datasets`。如果确实需要不一致映射，请显式传 `--check-path-consist=false`。
:::

:::tip
当前源码里首次创建 `fs_mode` 挂载时会自动触发一次 `resync`。手动 `cv mount resync ...` 只适用于 `fs_mode` 挂载点。
:::

---

### 5. `umount`：卸载挂载点

**用法：** `cv umount <CURVINE_PATH>`

示例：

```bash
cv umount /bucket/datasets
```

---

### 6. `load`：提交加载任务

**用法：** `cv load [OPTIONS] <PATH>`

| 选项 / 参数 | 说明 |
|-------------|------|
| `<PATH>` | 要加载的源路径。通常是已经建立挂载关系的 UFS 路径。 |
| `-w, --watch` | 提交后立即持续观察任务状态。 |
| `--conf <PATH>` | 可选的单次配置覆盖；日常使用不需要。 |

示例：

```bash
cv load s3://bucket/datasets/train/part-0001.parquet
cv load s3://bucket/datasets/train/part-0001.parquet --watch
```

成功时命令会输出 `job_id` 和 `target_path`，后续可交给 `load-status` 或 `cancel-load`。

#### Transfer 路由

启用独立 Transfer 后，命令行不变：

| 集群配置 | `cv load` / `cv export` 路由 |
| --- | --- |
| `[transfer] enabled = false` | 为兼容已有集群，调用旧 Master Load API。 |
| `[transfer] enabled = true` | CLI 直接调用 Transfer 服务 RPC。 |

Master 不会将旧请求代理到 Transfer。切换时，必须保证 CLI 与集群使用相同的 `[transfer]` 配置；过期的 CLI 配置会被拒绝，避免产生第二个任务所有者。

---

### 7. `export`：将 Curvine 路径导出到 UFS

**用法：** `cv export [OPTIONS] <PATH>`

`<PATH>` 必须是一个挂载路径下的 Curvine 路径。Curvine 会根据挂载自动推导 UFS 目标路径。

| 选项 / 参数 | 说明 |
|-------------|------|
| `<PATH>` | 要导出的 Curvine 源路径。 |
| `-w, --watch` | 提交后立即持续观察任务状态。 |
| `--no-overwrite` | UFS 目标已存在时失败。 |

示例：

```bash
cv export /bucket/datasets/train/part-0001.parquet --watch
```

---

### 8. `load-status`：查询加载任务状态

**用法：** `cv load-status [OPTIONS] <JOB_ID>`

| 选项 / 参数 | 说明 |
|-------------|------|
| `<JOB_ID>` | 加载任务 ID。 |
| `-v, --verbose` | 详细输出。 |
| `-w, --watch <INTERVAL>` | 轮询间隔，默认 `5s`。支持 `1s`、`1m`、`1h` 等格式。 |
| `--conf <PATH>` | 可选的单次配置覆盖；日常使用不需要。 |

示例：

```bash
cv load-status <job_id>
cv load-status <job_id> -w 1s
```

:::note
当前实现里 `load-status` 默认就会进入轮询模式，默认刷新间隔为 `5s`；源码暂未暴露“只查询一次然后退出”的独立开关。
:::

---

### 9. `cancel-load`：取消加载任务

**用法：** `cv cancel-load [OPTIONS] <JOB_ID>`

| 选项 / 参数 | 说明 |
|-------------|------|
| `<JOB_ID>` | 要取消的任务 ID。 |
| `--conf <PATH>` | 可选的单次配置覆盖；日常使用不需要。 |

示例：

```bash
cv cancel-load <job_id>
```

---

### 10. `transfer`：运维 Transfer 任务

`cv transfer` 仅在 `[transfer] enabled = true` 时可用。它用于列举、查看、重试和分页查询 Transfer 任务；日常提交仍使用 `cv load` 或 `cv export`。

| 命令 | 说明 |
| --- | --- |
| `cv transfer list` | 列出任务。可使用 `--kind load\|export`、`--state`、`--tenant`、`--submitter` 过滤。 |
| `cv transfer status <JOB_ID>` | 查看单个任务。使用 `--verbose` 查看任务明细，或用 `--watch --interval 1s` 轮询。 |
| `cv transfer tasks <JOB_ID>` | 查看单个任务的 task 分页。 |
| `cv transfer cancel <JOB_ID>` | 取消一个 Transfer 任务。 |
| `cv transfer retry <JOB_ID>` | 将失败、取消或部分成功任务重试为一个新任务。 |
| `cv transfer tenants` | 按 tenant 汇总任务。 |

示例：

```bash
cv transfer list --kind load --state running
cv transfer status <job_id> --watch --interval 2s
cv transfer retry <job_id>
```

`load-status` 与 `cancel-load` 仍保留为兼容命令。启用 Transfer 时它们调用 Transfer；关闭时调用旧 Master 实现。

---

### 11. `version`：查看版本

**用法：** `cv version`

示例：

```bash
cv version
```

当前实现会输出 `curvine-cli <version>`，并带上 commit / branch 信息。

---

## 兼容 CLI：`dfs`

发行包里的 `bin/dfs` 是一个兼容包装器：

- 当第一个子命令是 `fs` 或 `report` 时，它会调用 Java `io.curvine.CurvineShell`。
- `dfs fs` 保留 Hadoop `FsShell` 风格，因此子命令写法是 `-ls`、`-mkdir`、`-rm -r` 这种单短横线形式。
- 其它子命令最终仍会转发到 Rust `curvine-cli`，但日常运维建议直接使用 `cv`。

示例：

```bash
bin/dfs fs -ls /
bin/dfs fs -mkdir -p /data
bin/dfs fs -rm -r /data/tmp
bin/dfs report
bin/dfs report info
bin/dfs report json
bin/dfs report capacity
bin/dfs report used
bin/dfs report available
```

其中 `dfs report info` 对应 Java 兼容入口的完整文本概览；语义上接近 `cv report all`，但命令名并不相同。

如果你需要 HDFS Shell 兼容语义或依赖 Hadoop 配置文件（如 `core-site.xml` / `hdfs-site.xml`），使用 `dfs` 更合适；如果你需要 Curvine 当前源码里的完整命令集，优先使用 `cv`。

---

## POSIX / FUSE

Curvine 提供 FUSE 文件系统接口。挂载后（例如通过 `bin/curvine-fuse.sh start`），可以在挂载点直接使用标准 Linux 命令：

```bash
ls /curvine-fuse
cp data.txt /curvine-fuse/data.txt
du -sh /curvine-fuse
stat /curvine-fuse/data.txt
```

常见场景包括：

- 基础文件操作：`ls`、`cp`、`mv`、`rm`、`mkdir`
- 内容查看：`cat`、`grep`、`sed`
- 文件系统信息：`df -h`、`du -sh`、`stat`
- 权限相关：`chmod`、`chown`

如果你的目标是兼容现有 POSIX 工具链，优先走 FUSE；如果需要 Curvine 原生的挂载、加载、节点管理等能力，使用 `cv`。

---

## 附录：UFS 挂载参数

以下为 `cv mount` 时通过 `--config key=value` 传入的常见参数说明。`必填` 表示通常需要提供；`可选` 表示可以依赖默认值，或由 CLI 从挂载 URI 自动推导。

### S3（`s3://`、`s3a://`）

通过 `--provider opendal` 或自动选择时使用。

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `s3.endpoint_url` | 必填 | S3 服务地址，须以 `http://` 或 `https://` 开头。 |
| `s3.credentials.access` | 必填 | Access Key ID。 |
| `s3.credentials.secret` | 必填 | Secret Access Key。 |
| `s3.region_name` | 可选 | 区域名。 |
| `s3.path_style` | 可选 | 是否使用路径风格访问，常见于 MinIO 兼容端点。 |

### OSS（`oss://`）

用于阿里云 OSS / OSS-HDFS 语义访问。

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `oss.endpoint` | 必填 | OSS 端点地址。 |
| `oss.accessKeyId` | 必填 | 阿里云 AccessKey ID。 |
| `oss.accessKeySecret` | 必填 | 阿里云 AccessKey Secret。 |
| `oss.region` | 可选 | 区域。 |

### HDFS（`hdfs://`）

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `hdfs.namenode` | 可选 | NameNode 地址；不填时从挂载 URI 的 authority 推导。 |
| `hdfs.root` | 可选 | 根路径；不填时从挂载 URI 的 path 推导。 |
| `hdfs.user` | 可选 | HDFS 用户名。 |
| `hdfs.atomic_write_dir` | 可选 | 是否启用原子写目录。 |
| `hdfs.kerberos.ccache` | 可选 | Kerberos ticket cache 路径；也可由 `KRB5CCNAME` 提供。 |
| `hdfs.kerberos.krb5_conf` | 可选 | `krb5.conf` 文件路径。 |
| `hdfs.kerberos.keytab` | 可选 | keytab 文件路径。 |

### WebHDFS（`webhdfs://`）

| 参数 | 必填/可选 | 描述 |
|------|-----------|------|
| `webhdfs.endpoint` | 可选 | WebHDFS HTTP 服务地址；不填时从 URI 的 authority 推导。 |
| `webhdfs.root` | 可选 | 根路径。 |
| `webhdfs.delegation` | 可选 | delegation token。 |
