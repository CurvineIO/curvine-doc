# Command Line Tools

This section introduces the command-line tools supported by Curvine and their usage methods. Curvine provides native command-line tool `cv`, as well as hdfs-compatible command-line tool `curvine` (deprecated). Additionally, Curvine implements POSIX-standard FUSE interface, allowing direct access to Curvine filesystem through standard Linux commands after mounting Curvine in the system.

## Rust Native Command Line Tool `cv`
You can directly execute `cv` command to get help:
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

### 1. `report` Subcommand

Use `cv report` subcommand to view cluster status, `cv report -h` to view available parameters.

| Command Format                 | Description                                    |
|-------------------------------|------------------------------------------------|
| bin/cv report            | Output cluster summary information             |
| bin/cv report capacity   | Output cluster summary and detailed capacity information for each worker |
| bin/cv report info       | Output cluster and worker node information     |

### 2. `fs` Subcommand
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
| bin/cv fs touchz /path | Create file |
| bin/cv fs df | File system available space |
| bin/cv fs du /path | Calculate directory space usage |

### 3. `mount` Subcommand
Use `cv mount` subcommand to mount underlying storage to Curvine. Currently supports `s3` protocol.

Example: Mount `s3://testing` to `/s3-testing`
```bash
bin/cv mount s3://s3/testing /s3-testing \
-c s3.endpoint_url=http://hostname.com \
-c s3.region_name=cn \
-c s3.credentials.access=access_key \
-c s3.credentials.secret=secret_key \
-c s3.path_style=true
```

Check mount list
```bash
bin/cv mount-list
```

:::warning
A UFS path can only be mounted to one Curvine directory. Mounting to curvine root path is not supported; nested mounting is not supported. If curvine://a/b is already mounted, then curvine://a or curvine://a/b/c etc. cannot mount other UFS.
:::

Unmount underlying storage:
```
bin/cv umount /s3-testing/
```

### 4. load Subcommand
Use `cv load` subcommand to load UFS data into Curvine.

:::warning
Before loading data, you need to mount the underlying storage to curvine first
:::

```bash
bin/curvine load s3://my-bucket/test.data
```

When successful, the load command output will show jobid. You can use $jobid to check load status, see the following load-status command:
```bash
bin/cv load-status $jobid
```

## HDFS-Compatible Commands (deprecated)

Curvine is compatible with the HDFS access protocol. You can execute operations that are fully compatible with the `hdfs fs` command syntax through the `bin/curvine fs` command, as shown in the following examples:

Examples:
```bash
# List files and directories
bin/curvine fs -ls /

# Create directories
bin/curvine fs -mkdir -p /dir/a
```

Currently, Curvine and Hadoop are not 100% fully compatible. Some commands may not execute or have no effect. The following commands have passed rigorous testing:

| Command | Description                           |
|---------|---------------------------------------|
| ls      | List directory contents               |
| mkdir   | Create directories                    |
| cat     | View file contents                    |
| put     | Upload files                          |
| get     | Download files                        |
| count   | Count files and directories           |
| du      | Calculate directory space usage       |
| df      | Show file system available space     |
| mv      | Rename/move files                     |
| stat    | Query file/directory status           |
| rm      | Delete files or directories           |

:::tip
Commands not listed in the table do not necessarily mean they are unsupported, but rather that they have not undergone complete testing. The `curvine` command-line tool depends on JVM environment, we recommend using the native `cv` command. If you have common command requirements, please submit an Issue.
:::

## POSIX Commands

Curvine implements a POSIX-compliant FUSE (Filesystem in Userspace) interface. After mounting Curvine in Linux systems, users can interact through standard Linux file operation commands. This implementation has the following technical characteristics:

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
```

Curvine currently does not implement permission management. When executing the following permission-related commands:
```bash
chmod   # Command executes but does not actually modify permission bits
chown   # User/group change operations have no effect
getfacl # Cannot obtain valid ACL information
```