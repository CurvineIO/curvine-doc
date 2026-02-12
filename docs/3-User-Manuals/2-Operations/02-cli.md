# Command Line Tools

This section describes the command-line tools supported by Curvine and how to use them. Curvine provides:

- **Native CLI `cv`**: The main Rust-based CLI (recommended). The binary is typically invoked as `bin/cv` from the distribution directory (e.g. `build/dist/bin/cv`).
- **HDFS-compatible CLI `curvine`**: Deprecated; prefer `cv` for new usage.
- **POSIX / FUSE**: After mounting Curvine via FUSE, you can use standard Linux commands (`ls`, `cp`, `mv`, etc.) on the mount point.

All `cv` commands accept optional global options:

| Global option | Description |
|---------------|-------------|
| `-c, --conf <PATH>` | Configuration file path (optional). Default can be set via `CURVINE_CONF_FILE`. |
| `--master-addrs <ADDRS>` | Master address list, e.g. `m1:8995,m2:8995`. |

---

## Rust native CLI: `cv`

Get a quick overview with:

```bash
cv --help
```

Example output:

```
Usage: cv [OPTIONS] <COMMAND>

Commands:
  fs           File system operations
  report       Cluster status and capacity
  load         Load data from UFS into Curvine
  load-status  Query load job status
  cancel-load  Cancel a load job
  mount        Mount UFS path to Curvine
  umount       Unmount UFS from Curvine
  node         Manage worker nodes (list, decommission)
  version      Show CLI version
  help         Print help
```

Use `cv <command> --help` for subcommand-specific options.

**Conventions:** In this doc the CLI is referred to as `cv` (the name of the binary in the distribution, e.g. `build/dist/bin/cv`). When run via `cargo run -p curvine-cli`, the program name in help may appear as `curvine-cli`. Arguments in angle brackets (e.g. `<PATH>`, `<JOB_ID>`) are positional; optional parts are in square brackets.

---

### 1. `report` — Cluster status

**Usage:** `cv report [json|all|capacity|used|available] [OPTIONS]`

View cluster summary and capacity. Run `cv report --help` for full options.

| Command | Description |
|---------|-------------|
| `cv report` | Cluster summary (default; includes worker list). |
| `cv report json` | Full cluster info in JSON. |
| `cv report all [--show-workers true\|false]` | Same as default; control whether to list workers. |
| `cv report capacity [WORKER_ADDRESS]` | Capacity summary: cluster-wide, or for one worker (by address). |
| `cv report used` | Used capacity per worker. |
| `cv report available` | Available capacity per worker. |

Examples:

```bash
bin/cv report
bin/cv report json
bin/cv report capacity
bin/cv report capacity 192.168.1.10
bin/cv report used
bin/cv report available
```

---

### 2. `node` — Worker management

**Usage:** `cv node [OPTIONS] [-- <NODES>...]`

Manage workers (list, add/remove decommission list). Run `cv node --help` for details.

| Option | Description |
|--------|-------------|
| `-l, --list` | List all worker nodes (live and lost). |
| `--add-decommission` | Add workers to decommission list (requires one or more NODES). |
| `--remove-decommission` | Remove workers from decommission list (requires one or more NODES). |

`<NODES>`: one or more `hostname:port`. You can pass multiple nodes as space-separated arguments or as a single comma-separated list (e.g. `host1:9000,host2:9000`).

Examples:

```bash
bin/cv node -l
bin/cv node --add-decommission host1:9000 host2:9000
bin/cv node --add-decommission host1:9000,host2:9000
bin/cv node --remove-decommission host1:9000
```

---

### 3. `fs` — File system operations

**Usage:** `cv fs [OPTIONS] <COMMAND> [ARGS]`

Run HDFS-style file operations against Curvine. Use `cv fs --help` and `cv fs <subcommand> --help` for full options.

Global flag for `fs`:

| Flag | Description |
|------|-------------|
| `--cache-only` | Only show/operate on data cached in Curvine (disable unified UFS view). Applies to the current command only. |

**Commands:**

| Command | Description |
|---------|-------------|
| `cv fs ls [path]` | List directory (default path `/`). |
| `cv fs mkdir <path> [-p\|--parents]` | Create directory; `-p` creates parents as needed. |
| `cv fs put <local_path> <remote_path>` | Upload local file to Curvine. |
| `cv fs get <path> <local_path>` | Download file from Curvine to local. |
| `cv fs cat <path>` | Print file contents. |
| `cv fs touch <path>` | Create empty file or update timestamp. |
| `cv fs rm <path> [-r\|--recursive]` | Remove file or directory; `-r` for recursive. |
| `cv fs stat <path>` | Show file or directory status. |
| `cv fs count <path>` | Count files/directories under path. |
| `cv fs mv <src_path> <dst_path>` | Move or rename. |
| `cv fs du <path> [-h\|--human-readable] [-v\|--verbose]` | Directory space usage. |
| `cv fs df [-h\|--human-readable]` | File system space (capacity/used/available). |
| `cv fs chmod <mode> <path> [--recursive]` | Set permissions (e.g. `755`). |
| `cv fs chown <owner:group> <path> [--recursive]` | Set owner and group. |
| `cv fs blocks <path> [--format table\|json]` | Show block locations for a file (default: table). |

Examples:

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

**`cv fs ls` options (HDFS-style):**

| Option | Description |
|--------|-------------|
| `-C, --path-only` | Print paths only. |
| `-d, --directory` | List directories as plain files. |
| `-H, --human-readable` | Human-readable sizes. |
| `-q, --hide-non-printable` | Replace non-printable chars with `?`. |
| `-R, --recursive` | List recursively. |
| `-r, --reverse` | Reverse sort order. |
| `-t, --mtime` | Sort by modification time (newest first). |
| `-S, --size` | Sort by size. |
| `-u, --atime` | Use last access time for display/sort. |
| `-l, --long-format` | Long listing format. |

---

### 4. `mount` — Mount UFS to Curvine

**Usage:** `cv mount [UFS_PATH CV_PATH] [OPTIONS]` — with no arguments, lists all mount points.

Mount an underlying storage path (UFS) to a Curvine path. Supported protocols include **S3** and **HDFS**. Run `cv mount --help` for full options. Global options (e.g. `-c, --conf` for config file) also apply; in the mount context, `-c` is short for `--config` (UFS key=value), not the config file.

**List mount points (no arguments):**

```bash
bin/cv mount
```

**List mount points with validity check:**

```bash
bin/cv mount --check
```

**Mount options (when providing UFS path and Curvine path):**

| Option | Description |
|--------|-------------|
| `-c, --config <key=value>` | UFS config key=value (can be repeated). |
| `--update` | Update existing mount config. |
| `--mnt-type <TYPE>` | Mount type (default: `cst`). |
| `--consistency-strategy <STRATEGY>` | Consistency strategy (default: `none`). |
| `--ttl-ms <DURATION>` | TTL in duration form, e.g. `7d` (default: `7d`). |
| `--ttl-action <ACTION>` | Action when TTL expires: `none`, `delete`, `persist`, `evict`, `flush` (default: `delete`). |
| `--replicas <N>` | Replica count. |
| `--block-size <SIZE>` | Block size (e.g. `128MB`). |
| `-s, --storage-type <TYPE>` | Storage type. |
| `--write-type <TYPE>` | Write type: `cache`, `through`, `async_through`, `cache_through` (default: `async_through`). |
| `--provider <PROVIDER>` | UFS provider: `auto`, `oss-hdfs`, `opendal`. See details below. |
| `--check` | When listing, check each mount and show Valid/Invalid. |


**About `--provider` parameter**: For example, with OSS, `oss://test-bucket` could be either a standard object storage bucket or an OSS-HDFS accelerated bucket.
`--provider` specifies the implementation to use (see [Appendix: UFS Mount Parameters](#appendix-ufs-mount-parameters)).

| Value | Description | Supported Protocols |
|-------|-------------|---------------------|
| `auto` | System auto-selects based on URI protocol (default). OSS defaults to JindoSDK (oss-hdfs) if available; S3, HDFS, WebHDFS, COS, GCS, Azure use OpenDAL. | All |
| `oss-hdfs` | Use JindoSDK for OSS access, suitable for Alibaba Cloud OSS / OSS-HDFS lakehouse scenarios. | `oss://` only |
| `opendal` | Use OpenDAL for object storage or HDFS, no JVM dependency, supports S3/OSS/COS/GCS/Azure/HDFS/WebHDFS. | `s3://`, `oss://`, `hdfs://`, `webhdfs://`, `cos://`, `gcs://`, `azblob://`, etc. |

Examples

OSS (JindoSDK, for lakehouse):
```bash
bin/cv mount oss://my-bucket/prefix /oss-data --provider oss-hdfs \
  -c oss.endpoint=oss-cn-hangzhou.aliyuncs.com \
  -c oss.accessKeyId=xxx \
  -c oss.accessKeySecret=yyy
```

Mount S3 bucket to `/s3-testing` (when provider not specified, S3 uses auto → opendal):

```bash
bin/cv mount s3://bucket/prefix /s3-testing \
  -c s3.endpoint_url=http://hostname.com \
  -c s3.region_name=cn \
  -c s3.credentials.access=access_key \
  -c s3.credentials.secret=secret_key \
  -c s3.force.path.style=true
```

For detailed parameter lists of each UFS type (S3, OSS, HDFS, WebHDFS), see [Appendix: UFS Mount Parameters](#appendix-ufs-mount-parameters) at the end.

:::warning
Mount performs basic availability and config checks on the UFS. If the UFS is unreachable or misconfigured, mount can fail with a `service error`. Ensure the UFS is reachable and credentials are correct.
:::

:::warning
A UFS path can be mounted to only one Curvine path. Mounting at the Curvine root is not supported; nested mounts are not supported. If `curvine://a/b` is already mounted, you cannot mount another UFS at `curvine://a` or `curvine://a/b/c`.
:::

---

### 5. `umount` — Unmount UFS

**Usage:** `cv umount <CURVINE_PATH>`

Unmount a previously mounted Curvine path:

```bash
bin/cv umount /s3-testing
```

---

### 6. `load` — Load UFS data into Curvine

**Usage:** `cv load [OPTIONS] <PATH>`

Submit a job to load data from UFS into Curvine. The UFS path must already be mounted (see `mount`).

| Argument / Option | Description |
|-------------------|-------------|
| `<PATH>` | UFS path to load (positional, required). |
| `-w, --watch` | After submit, watch load job status until completion/failure. |
| `-c, --conf <path>` | Config file (default from `CURVINE_CONF_FILE`). |

Example:

```bash
bin/cv load s3://my-bucket/path/to/data
bin/cv load s3://my-bucket/path/to/data --watch
```

On success, the command prints a **job ID**. Use it with `load-status` or `cancel-load`.

:::warning
The underlying storage must be mounted to Curvine before loading (see `cv mount`).
:::

---

### 7. `load-status` — Query load job status

**Usage:** `cv load-status [OPTIONS] <JOB_ID>`

Query (and optionally watch) a load job by job ID.

| Argument / Option | Description |
|-------------------|-------------|
| `<JOB_ID>` | Load job ID (positional, required). |
| `-v, --verbose` | Verbose output. |
| `-w, --watch <INTERVAL>` | Poll status periodically; default `5s`. Supports e.g. `5s`, `1m`. |
| `-c, --conf <path>` | Config file (default from `CURVINE_CONF_FILE`). |

Examples:

```bash
bin/cv load-status <job_id>
bin/cv load-status <job_id> --watch
bin/cv load-status <job_id> -w 1s
```

Use Ctrl+C to stop watching.

---

### 8. `cancel-load` — Cancel load job

**Usage:** `cv cancel-load [OPTIONS] <JOB_ID>`

Cancel a load job by job ID.

| Argument / Option | Description |
|-------------------|-------------|
| `<JOB_ID>` | Load job ID (positional, required). |
| `-c, --conf <path>` | Config file (default from `CURVINE_CONF_FILE`). |

Example:

```bash
bin/cv cancel-load <job_id>
```

---

### 9. `version` — CLI version

**Usage:** `cv version`

Print the CLI version:

```bash
bin/cv version
```

---

## POSIX commands (FUSE mount)

Curvine provides a POSIX-compliant FUSE interface. After mounting the Curvine FUSE filesystem (e.g. via `bin/curvine-fuse.sh start`), you can use standard Linux commands on the mount point.

**Characteristics:**

- FUSE 3.0–compatible (and compatible with FUSE 2.0).
- Semantics aligned with common filesystems (e.g. ext4, xfs).
- Supports Linux kernel 3.10+.
- POSIX file operations and atomic behavior where applicable.

**Typical commands:**

```bash
# Basic file operations
ls, cp, mv, rm, mkdir

# Content operations
cat, grep, sed, awk

# Filesystem info
df -h, du -sh, stat

# Permissions
chmod, chown, getfacl

# Symbolic links
ln -s, readlink

# Extended attributes
getfattr, setfattr, listxattr
```

---

## Appendix: UFS Mount Parameters

The following are the parameters for each UFS type passed via `-c key=value` when using `cv mount`. **Required** means it must be provided; **Optional** means it can be omitted (has a default or can be inferred from the mount URI).

### S3 (`s3://`, `s3a://`)

Used with `--provider opendal` or auto-selection.

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `s3.endpoint_url` | Required | S3 service endpoint URL; must start with `http://` or `https://`. |
| `s3.credentials.access` | Required | Access Key ID. |
| `s3.credentials.secret` | Required | Secret Access Key. |
| `s3.region_name` | Optional | Region name; recommended for AWS endpoints, optional for others (default: `undefined`). |
| `s3.force.path.style` | Optional | Whether to use path-style access (e.g. for MinIO), `true`/`false`, default `false`. |
| `s3.retry_times` | Optional | Request retry count, default `3`. |
| `s3.connect_timeout` | Optional | Connection timeout, e.g. `30s`, default `30s`. |
| `s3.read_timeout` | Optional | Read timeout, e.g. `120s`, default `120s`. |

### OSS (`oss://`)

For Alibaba Cloud OSS / OSS-HDFS (JindoSDK or OpenDAL OSS).

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `oss.endpoint` | Required | OSS endpoint address (e.g. `oss-cn-hangzhou.aliyuncs.com` or full URL). |
| `oss.accessKeyId` | Required | Alibaba Cloud AccessKey ID. |
| `oss.accessKeySecret` | Required | Alibaba Cloud AccessKey Secret. |
| `oss.region` | Optional | Region. |
| `oss.data.endpoint` | Optional | Data access endpoint. |
| `oss.second.level.domain.enable` | Optional | Enable second-level domain, `true`/`false`, default `true`. |
| `oss.data.lake.storage.enable` | Optional | Enable lakehouse storage, `true`/`false`, default `true`. |

### HDFS (`hdfs://`)

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `hdfs.namenode` | Optional | NameNode address, e.g. `hdfs://namenode:9000/`. If not provided, inferred from mount URI authority. |
| `hdfs.root` | Optional | Root path, default `/`. If not provided, inferred from mount path. |
| `hdfs.user` | Optional | HDFS username; if not set, uses environment variable `HADOOP_USER_NAME` or `USER`. |
| `hdfs.atomic_write_dir` | Optional | Set to `true` to use `atomic_write_dir` directory under root for atomic writes. |
| `hdfs.kerberos.ccache` | Optional | Kerberos credential cache path; can also be specified via environment variable `KRB5CCNAME`. |
| `hdfs.kerberos.krb5_conf` | Optional | `krb5.conf` file path; sets environment variable `KRB5_CONFIG`. |
| `hdfs.kerberos.keytab` | Optional | Keytab file path; sets environment variable `KRB5_KTNAME`. |

### WebHDFS (`webhdfs://`)

HTTP-based HDFS interface.

| Parameter | Required/Optional | Description |
|-----------|-------------------|-------------|
| `webhdfs.endpoint` | Optional | WebHDFS service address, e.g. `http://namenode:9870`. If not provided, inferred from URI authority. |
| `webhdfs.root` | Optional | Root path, default `/`. |
| `webhdfs.delegation` | Optional | Delegation token for authentication. |
