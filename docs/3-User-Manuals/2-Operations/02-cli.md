# Command Line Tools

This section introduces the command-line tools supported by Curvine and their usage methods. Curvine provides native command-line tool `cv`, as well as hdfs-compatible command-line tool `curvine` (deprecated). Additionally, Curvine implements POSIX-standard FUSE interface, allowing direct access to Curvine filesystem through standard Linux commands after mounting Curvine in the system.

## Rust Native Command Line Tool `cv`
You can directly execute `cv` command to get help:
```bash
Usage: curvine-cli <COMMAND>

Commands:
  fs
  report
  load         Loading external files into Curvine
  load-status  Query loading task status
  cancel-load  Cancel loading task
  mount        mount ufs to curvine
  umount       unmount ufs
  node         Node command
  version      show cli version
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

### 1. `report` Subcommand

Use `cv report` subcommand to view cluster status, `cv report -h` to view available parameters.

| Command Format                 | Description                                    |
|-------------------------------|------------------------------------------------|
| bin/cv report            | Output cluster summary information             |
| bin/cv json         | Output detailed cluster information in JSON format                    |
| bin/cv report capacity | Output cluster summary and detailed capacity information for each worker |
| bin/cv report used    | Output used capacity information for each worker          |
| bin/cv report available    | Output available capacity information for each worker          |

### 2. `node` Subcommand

Use `cv node` subcommand to manage workers in the cluster, `cv node -h` to view available parameters.

| Parameter                     | Description                             |
|-------------------------------|-----------------------------------------|
| -l, --list                    | List all worker nodes                   |
| --add-decommission            | Add decommission nodes                  |
| --remove-decommission         | Remove decommission nodes               |

### 3. `fs` Subcommand
Use `cv fs` subcommand to execute hdfs commands. The `fs` subcommand provides mainstream file operation functionality, command formats and descriptions are as follows:

| Command Format                 | Description                                    |
|-------------------------------|------------------------------------------------|
| bin/cv fs ls /         | List files and directories in specified directory           |
| bin/cv fs mkdir /dir   | Create directory                             |
| bin/cv fs rm /file     | Delete file                             |
| bin/cv fs cat /file    | Display file content                         |
| bin/cv fs put /local/file /hdfs/path | Upload local file to Curvine |
| bin/cv fs get /hdfs/path /local/file | Download file from Curvine to local |
| bin/cv fs stat /file | Query file or directory status |
| bin/cv fs count /path | Count files in directory |
| bin/cv fs touch /path | Create file |
| bin/cv fs df | File system available space |
| bin/cv fs du /path | Calculate directory space usage |
| bin/cv fs mv src/path dst/path | Rename file or move file to target path |
| bin/cv fs blocks /file | Display file block information |

:::tip
The `--cache-only` parameter can be used with all cv fs subcommands to view files only cached in curvine. This parameter only affects the current command execution.
:::

Specifically, the `cv fs ls` subcommand supports `hdfs`-like parameters, including:

| Parameter | Description |
|-----------|-------------|
| -C, --path-only | Display only the paths of files and directories |
| -d, --directory | List directories as regular files |
| -H, --human-readable | Display file sizes in human-readable format |
| -q, --hide-non-printable | Replace non-printable characters with ? |
| -R, --recursive | Recursively list directory contents |
| -r, --reverse | Reverse sort order |
| -t, --mtime | Sort by modification time (newest first) |
| -S, --size | Sort by file size |
| -u, --atime | Use last access time instead of modification time for display and sorting |
| -l, --long-format | Display detailed information of files and directories |
| -h, --help | Show help information |

### 4. `mount` Subcommand
Use `cv mount` subcommand to mount underlying storage to Curvine. Currently supports `s3` protocol.

`cv mount` subcommand supports the following configuration parameters:

| Parameter | Description |
|-----------|-------------|
| --config key=value | Set key-value configuration parameters |
| --conf /path | Specify configuration file path |
| --update | Update existing mount point configuration |
| --mnt-type TYPE | Set mount type |
| --consistency-strategy STRATEGY | Set consistency strategy |
| --ttl-ms DURATION | Set data TTL time, in milliseconds |
| --ttl-action ACTION | Set action after TTL expiration |
| --replicas N | Set replica count |
| --block-size SIZE | Set block size |
| --storage-type TYPE | Set storage type |

Example: Mount `s3://testing` to `/s3-testing`
```bash
bin/cv mount s3://s3/testing /s3-testing \
-c s3.endpoint_url=http://hostname.com \
-c s3.region_name=cn \
-c s3.credentials.access=access_key \
-c s3.credentials.secret=secret_key \
-c s3.path_style=true
```

:::warning
When mount executes mounting, it will check the availability of the UFS storage to be mounted and configuration, otherwise mounting will fail with `service error` prompt. Please ensure UFS is in normal state.
:::

Check mount list, mount command without parameters.
```bash
bin/cv mount
```

:::warning
A UFS path can only be mounted to one Curvine directory. Mounting to curvine root path is not supported; nested mounting is not supported. If curvine://a/b is already mounted, then curvine://a or curvine://a/b/c etc. cannot mount other UFS.
:::

Unmount underlying storage:
```
bin/cv umount /s3-testing/
```

### 5. load Subcommand
Use `cv load` subcommand to load UFS data into Curvine.

:::warning
Before loading data, you need to mount the underlying storage to curvine first
:::

```bash
bin/cv load s3://my-bucket/test.data
```

When successful, the load command output will show jobid. You can use $jobid to check load status, see the following load-status command:
```bash
bin/cv load-status $jobid
```
You can use `-w,--watch` parameter to monitor the status of loading tasks

## POSIX Commands

Curvine implements a POSIX-compliant FUSE (Filesystem in Userspace) interface.
After mounting Curvine in Linux systems, users can interact through standard Linux file operation commands. This implementation has the following technical characteristics:

**System Compatibility:**
1. Complies with FUSE 3.0 interface specifications and is compatible with FUSE 2.0
2. Compatible with mainstream file system operation semantics like ext4/xfs
3. Supports Linux kernel 3.10+ versions

**Functional Features:**
1. Provides complete POSIX file operation interface
2. Supports atomic operation guarantees

**Command Line Operation Support:**
Users can operate through the following core Linux commands:
```bash
# Basic file operations
ls, cp, mv, rm, mkdir

# File content operations
cat, grep, sed, awk

# File system management
df -h, du -sh, stat

# Permission management
chmod, chown, getfacl

# Symbolic link operations
ln -s, readlink

# Extended attribute operations
getfattr, setfattr, listxattr
```