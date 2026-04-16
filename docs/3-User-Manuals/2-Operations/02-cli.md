# Command Line Tools

This section is based on the current repository source in `curvine-cli`, `build/bin/cv`, and `build/bin/dfs`. Curvine currently exposes three CLI entry styles:

- **Native Rust CLI `cv`**: the recommended entry point, with the full command tree from `curvine-cli`.
- **Compatibility wrapper `dfs`**: bundled in the distribution; `fs` / `report` go through Java `CurvineShell` and keep Hadoop `FsShell` style.
- **POSIX / FUSE**: after mounting with FUSE, use standard Linux commands directly on the mount point.

---

## Native CLI: `cv`

Get a quick overview:

```bash
cv --help
```

The current top-level commands in source are:

```text
Usage: cv [OPTIONS] <COMMAND>

Commands:
  fs
  report
  load
  load-status
  cancel-load
  mount
  umount
  node
  version
```

All `cv` commands accept these global options:

| Global option | Description |
|---------------|-------------|
| `-c, --conf <PATH>` | Cluster config file path. If omitted, the CLI also checks `CURVINE_CONF_FILE`. |
| `--master-addrs <ADDRS>` | Override the client-side master address list directly, for example `m1:8995,m2:8995`. |

:::tip
To avoid ambiguity, this doc always uses `--conf` for the CLI config file and `--config key=value` for UFS mount properties. Do not rely on short `-c` inside `mount`.
:::

**Conventions:**

- In the distribution, the CLI is usually invoked as `build/dist/bin/cv`.
- When run via `cargo run -p curvine-cli -- ...`, the help output shows the binary name as `curvine-cli`.
- Items such as `<PATH>` and `<JOB_ID>` are positional arguments; `[OPTION]` means optional.

---

### 1. `report`: cluster status

**Usage:** `cv report [json|all|capacity|used|available]`

| Command | Description |
|---------|-------------|
| `cv report` | Default summary, including active master, capacity, inode/block counts, and worker lists. |
| `cv report json` | Emit the full `MasterInfo` as JSON. |
| `cv report all --show-workers false` | Text summary, with optional worker detail suppression. |
| `cv report capacity [WORKER_ADDRESS]` | Show cluster-wide capacity, or detailed capacity for one worker. |
| `cv report used` | Show used capacity for each live worker. |
| `cv report available` | Show available capacity for each live worker. |

Examples:

```bash
bin/cv report
bin/cv report json
bin/cv report all --show-workers false
bin/cv report capacity
bin/cv report capacity 192.168.1.10
bin/cv report used
bin/cv report available
```

:::note
In the current implementation, `cv report capacity <WORKER_ADDRESS>` matches by worker IP address, not by `hostname:port`.
:::

---

### 2. `node`: worker management

**Usage:** `cv node [OPTIONS] [-- <NODES>...]`

| Option | Description |
|--------|-------------|
| `-l, --list` | List live and lost workers. |
| `--add-decommission <NODES>...` | Add one or more workers to the decommission list. |
| `--remove-decommission <NODES>...` | Remove one or more workers from the decommission list. |

`<NODES>` supports two forms:

- Space-separated arguments: `host1:8997 host2:8997`
- A single comma-separated argument: `host1:8997,host2:8997`

Examples:

```bash
bin/cv node -l
bin/cv node --add-decommission host1:8997 host2:8997
bin/cv node --add-decommission host1:8997,host2:8997
bin/cv node --remove-decommission host1:8997
```

:::note
The current implementation strips `hostname:port` down to `hostname` before calling the decommission API. The port is mainly for readability and consistent input format.
:::

---

### 3. `fs`: file system operations

**Usage:** `cv fs [OPTIONS] <COMMAND> [ARGS]`

`fs` adds one command-level global switch:

| Option | Description |
|--------|-------------|
| `--cache-only` | Query / operate only on data already cached in Curvine, disabling the unified UFS view. |

The current source exposes these `fs` subcommands:

| Command | Description |
|---------|-------------|
| `cv fs ls [PATH]` | List a directory, default path `/`. |
| `cv fs mkdir <PATH> [-p\|--parents]` | Create a directory. |
| `cv fs put <LOCAL_PATH> <REMOTE_PATH>` | Upload a local file into Curvine. |
| `cv fs get <PATH> <LOCAL_PATH>` | Download a Curvine file to local disk. |
| `cv fs cat <PATH>` | Print file contents. |
| `cv fs touch <PATH>` | Create an empty file or update timestamps. |
| `cv fs rm <PATH> [-r\|--recursive]` | Remove a file or directory. |
| `cv fs stat <PATH>` | Show file or directory status. |
| `cv fs count <PATH>` | Count files / directories under a path. |
| `cv fs mv <SRC_PATH> <DST_PATH>` | Move or rename. |
| `cv fs du <PATH> [-h] [-v]` | Show directory space usage. |
| `cv fs df [-h]` | Show capacity / used / available space. |
| `cv fs chmod <MODE> <PATH> [RECURSIVE]` | Change permissions. |
| `cv fs chown <OWNER:GROUP> <PATH> [RECURSIVE]` | Change owner / group. |
| `cv fs blocks <PATH> [--format table\|json]` | Show file block location details. |
| `cv fs free <PATH> [-r\|--recursive]` | Release Curvine cache space for UFS-synced data. |

Common examples:

```bash
bin/cv fs ls /
bin/cv fs ls / --cache-only
bin/cv fs mkdir -p /data/a/b
bin/cv fs put ./local.txt /data/remote.txt
bin/cv fs get /data/remote.txt ./local.txt
bin/cv fs cat /data/remote.txt
bin/cv fs stat /data
bin/cv fs count /data
bin/cv fs mv /data/a /data/b
bin/cv fs du -h /data
bin/cv fs df -h
bin/cv fs chmod 755 /data/script.sh
bin/cv fs chown user:group /data
bin/cv fs blocks /data/file.txt --format json
bin/cv fs free /data --recursive
```

`cv fs ls` also supports HDFS-style listing flags:

| Option | Description |
|--------|-------------|
| `-C, --path-only` | Print paths only. |
| `-d, --directory` | List directories as plain files. |
| `-H, --human-readable` | Print human-readable sizes. |
| `-q, --hide-non-printable` | Replace non-printable characters with `?`. |
| `-R, --recursive` | List recursively. |
| `-r, --reverse` | Reverse sort order. |
| `-t, --mtime` | Sort by modification time. |
| `-S, --size` | Sort by size. |
| `-u, --atime` | Use access time for display and sorting. |
| `-l, --long-format` | Long listing format. |

:::note
In the current source, recursive mode for `chmod` / `chown` is exposed as the third positional argument `[RECURSIVE]`, not as a `--recursive` flag. Permission strings support octal values such as `755` / `0o755` and symbolic forms such as `u=rwx,g=rx,o=rx`. `chown` supports `user:group`, `user:`, and `:group`.
:::

---

### 4. `mount`: mount UFS into Curvine

The current implementation uses `mount` for three related workflows:

- `cv mount`: list all mount points
- `cv mount --check`: list mount points and validate UFS reachability
- `cv mount <UFS_PATH> <CV_PATH> [OPTIONS]`: create or update a mount
- `cv mount resync <CV_PATH> [OPTIONS]`: run metadata resync for an `fs_mode` mount

Common options:

| Option | Description |
|--------|-------------|
| `--config <key=value>` | UFS configuration entry. Can be repeated. |
| `--update` | Update an existing mount configuration. |
| `--check-path-consist <true\|false>` | Whether to enforce path consistency between `UFS_PATH` and `CV_PATH`. Default `true`. |
| `--read-verify-ufs` | Validate cached reads against UFS using `mtime` / `len`. |
| `--ttl-ms <DURATION>` | TTL, default `7d`. Supports durations such as `1h` and `7d`. |
| `--replicas <N>` | Override replica count. |
| `--block-size <SIZE>` | Override block size, for example `128MB`. |
| `-s, --storage-type <TYPE>` | Override storage type. |
| `--write-type <cache_mode\|fs_mode>` | The current source only distinguishes these two modes. Default `fs_mode`. |
| `--provider <auto\|oss-hdfs\|opendal>` | Select the UFS provider implementation. |
| `--check` | Only meaningful when listing mounts; also validates each entry. |
| `--dry-run` | During `resync`, scan and print differences without delete / create changes. |
| `--verbose` | During `resync`, print detailed per-file logs. |

**About `--provider`**: some URI schemes can map to multiple implementations. For example, `oss://...` may be handled either by OSS-HDFS / JindoSDK or by OpenDAL, so `--provider` lets you force the implementation.

| Value | Description | Typical protocols |
|-------|-------------|-------------------|
| `auto` | Auto-select implementation based on the URI scheme. | All supported schemes |
| `oss-hdfs` | Use JindoSDK / OSS-HDFS path handling. | `oss://` |
| `opendal` | Use OpenDAL-based backends. | `s3://`, `oss://`, `hdfs://`, `webhdfs://`, `cos://`, `gcs://`, `azblob://`, etc. |

There are also a few implementation details worth calling out:

- For `s3://...` paths, if `s3.bucket_name` is not provided explicitly, the CLI auto-fills it from the URI.
- For `hdfs://...` paths, if `hdfs.namenode` / `hdfs.root` are not provided explicitly, the CLI derives them from the URI.
- If the config contains `hdfs.kerberos.*` keys but neither `hdfs.kerberos.ccache` nor the `KRB5CCNAME` environment variable is present, the CLI prints a Kerberos ticket-cache warning.
- `validate_path_and_configs` currently applies extra path validation only to S3 paths; other schemes mostly rely on later provider initialization and connectivity checks.

Examples:

```bash
# List mount points
bin/cv mount

# List mount points and validate UFS availability
bin/cv mount --check

# Create an S3 mount
bin/cv mount s3://bucket/datasets /bucket/datasets \
  --config s3.endpoint_url=http://hostname.com \
  --config s3.region_name=cn \
  --config s3.credentials.access=access_key \
  --config s3.credentials.secret=secret_key \
  --config s3.path_style=true \
  --provider opendal

# Create an OSS mount through JindoSDK / OSS-HDFS
bin/cv mount oss://my-bucket/prefix /oss-data --provider oss-hdfs \
  --config oss.endpoint=oss-cn-hangzhou.aliyuncs.com \
  --config oss.accessKeyId=xxx \
  --config oss.accessKeySecret=yyy

# Run a metadata resync manually
bin/cv mount resync /bucket/datasets --dry-run --verbose
```

For detailed parameter lists of each UFS type (S3, OSS, HDFS, WebHDFS), see [Appendix: UFS Mount Parameters](#appendix-ufs-mount-parameters) at the end.

:::warning
`--check-path-consist=true` is enabled by default. That means a path such as `s3://bucket/datasets` is normally expected to mount to `/bucket/datasets`. If you really need a different mapping, pass `--check-path-consist=false` explicitly.
:::

:::tip
In the current source, the first creation of an `fs_mode` mount automatically triggers a `resync`. Manual `cv mount resync ...` only works for `fs_mode` mount points.
:::

---

### 5. `umount`: remove a mount

**Usage:** `cv umount <CURVINE_PATH>`

Example:

```bash
bin/cv umount /bucket/datasets
```

---

### 6. `load`: submit a load job

**Usage:** `cv load [OPTIONS] <PATH>`

| Option / Argument | Description |
|-------------------|-------------|
| `<PATH>` | Source path to load. In practice this is usually a UFS path that already belongs to a mount. |
| `-w, --watch` | Watch job status immediately after submission. |
| `--conf <PATH>` | CLI config file. |

Examples:

```bash
bin/cv load s3://bucket/datasets/train/part-0001.parquet
bin/cv load s3://bucket/datasets/train/part-0001.parquet --watch
```

On success, the command prints `job_id` and `target_path`, which can then be used with `load-status` or `cancel-load`.

---

### 7. `load-status`: query job status

**Usage:** `cv load-status [OPTIONS] <JOB_ID>`

| Option / Argument | Description |
|-------------------|-------------|
| `<JOB_ID>` | Load job identifier. |
| `-v, --verbose` | Verbose output. |
| `-w, --watch <INTERVAL>` | Poll interval, default `5s`. Supports formats such as `1s`, `1m`, and `1h`. |
| `--conf <PATH>` | CLI config file. |

Examples:

```bash
bin/cv load-status <job_id>
bin/cv load-status <job_id> -w 1s
```

:::note
In the current implementation, `load-status` enters watch mode by default with a `5s` refresh interval. The source does not currently expose a dedicated one-shot status-only switch.
:::

---

### 8. `cancel-load`: cancel a load job

**Usage:** `cv cancel-load [OPTIONS] <JOB_ID>`

| Option / Argument | Description |
|-------------------|-------------|
| `<JOB_ID>` | Job identifier to cancel. |
| `--conf <PATH>` | CLI config file. |

Example:

```bash
bin/cv cancel-load <job_id>
```

---

### 9. `version`: show version

**Usage:** `cv version`

Example:

```bash
bin/cv version
```

The current implementation prints `curvine-cli <version>` together with commit / branch information.

---

## Compatibility CLI: `dfs`

`bin/dfs` in the distribution is a compatibility wrapper:

- When the first subcommand is `fs` or `report`, it calls Java `io.curvine.CurvineShell`.
- `dfs fs` keeps Hadoop `FsShell` syntax, so subcommands look like `-ls`, `-mkdir`, `-rm -r` with single-dash command names.
- Other subcommands are eventually forwarded to the Rust `curvine-cli`, but for normal operations `cv` is still the recommended entry point.

Examples:

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

`dfs report info` is the Java-compat text-summary variant; conceptually it is close to `cv report all`, but the command name is different.

Use `dfs` when you need Hadoop shell compatibility or rely on Hadoop configuration files such as `core-site.xml` / `hdfs-site.xml`. Use `cv` when you want the full Curvine-native command set from current source.

---

## POSIX / FUSE

Curvine also exposes a FUSE file system interface. After mounting it, for example via `bin/curvine-fuse.sh start`, you can operate on the mount point with normal Linux tools:

```bash
ls /curvine-fuse
cp data.txt /curvine-fuse/data.txt
du -sh /curvine-fuse
stat /curvine-fuse/data.txt
```

Typical categories:

- Basic file operations: `ls`, `cp`, `mv`, `rm`, `mkdir`
- Content inspection: `cat`, `grep`, `sed`
- File system information: `df -h`, `du -sh`, `stat`
- Permissions: `chmod`, `chown`

If your goal is POSIX compatibility with existing tools, prefer FUSE. If you need Curvine-native mount, load, or node-management features, use `cv`.

---

## Appendix: UFS Mount Parameters

The following are common parameters passed through `--config key=value` when using `cv mount`. `Required` means it normally must be provided; `Optional` means it can be omitted if a default exists or if the CLI can infer it from the mount URI.

### S3 (`s3://`, `s3a://`)

Used with `--provider opendal` or auto-selection.

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `s3.endpoint_url` | Required | S3 service endpoint URL; must start with `http://` or `https://`. |
| `s3.credentials.access` | Required | Access Key ID. |
| `s3.credentials.secret` | Required | Secret Access Key. |
| `s3.region_name` | Optional | Region name. |
| `s3.path_style` | Optional | Whether to use path-style access, commonly needed for MinIO-compatible endpoints. |

### OSS (`oss://`)

For Alibaba Cloud OSS / OSS-HDFS style access.

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `oss.endpoint` | Required | OSS endpoint address. |
| `oss.accessKeyId` | Required | Alibaba Cloud AccessKey ID. |
| `oss.accessKeySecret` | Required | Alibaba Cloud AccessKey Secret. |
| `oss.region` | Optional | Region. |

### HDFS (`hdfs://`)

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `hdfs.namenode` | Optional | NameNode address; if omitted, inferred from the mount URI authority. |
| `hdfs.root` | Optional | Root path; if omitted, inferred from the mount URI path. |
| `hdfs.user` | Optional | HDFS username. |
| `hdfs.atomic_write_dir` | Optional | Enable atomic write directory behavior. |
| `hdfs.kerberos.ccache` | Optional | Kerberos credential cache path; can also come from `KRB5CCNAME`. |
| `hdfs.kerberos.krb5_conf` | Optional | `krb5.conf` path. |
| `hdfs.kerberos.keytab` | Optional | Keytab path. |

### WebHDFS (`webhdfs://`)

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `webhdfs.endpoint` | Optional | WebHDFS HTTP endpoint; if omitted, inferred from the URI authority. |
| `webhdfs.root` | Optional | Root path. |
| `webhdfs.delegation` | Optional | Delegation token. |
