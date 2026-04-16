---
sidebar_position: 1
---

# 下载和编译curvine

本章节将介绍如何下载和编译curvine。

## 支持的linux发行版
| OS Distribution     | Kernel Requirement | Tested Version | Dependencies |
|---------------------|--------------------|----------------|--------------|
| ​**CentOS 7**​      | ≥3.10.0            | 7.6            | fuse2-2.9.2  |
| ​**CentOS 8**​      | ≥4.18.0            | 8.5            | fuse3-3.9.1  |
| ​**Rocky Linux 9**​ | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| ​**RHEL 9**​        | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| ​**Ubuntu 22**​      | ≥5.15.0            | 22.4           | fuse3-3.10.5 |


下载代码
```
git clone https://github.com/CurvineIO/curvine.git ./
```

## 本地编译

:::warning
请确保前置依赖环境已经安装好，并配置到环境变量中。 相关环境依赖的安装过程，您也可以参考
[环境的初始化教程](./01-prerequisites.md)

或者
[Docker环境初始化](https://github.com/CurvineIO/curvine/blob/main/curvine-docker/compile/Dockerfile_rocky9)
:::

可选：先检查构建环境：

```bash
make check-env
```

然后使用 `make` 进行全量编译，输出位于 `build/dist`：

```bash
make all
```

也可以直接调用构建脚本：

```bash
sh build/build.sh          # 全量编译（release）
sh build/build.sh -h       # 查看帮助和 package/ufs 选项
sh build/build.sh -p core  # 只编译 server、client、cli
```


:::note
更多 make 目标可运行 `make` 或 `make help` 查看。简要说明（以仓库为准）：
- **环境**：`make check-env` — 检查构建依赖
- **构建**：`make build` / `make all` — 编译（输出在 `build/dist`）；`make dist` — 编译并打 tar.gz 到项目根目录；`make dist-only` — 仅对已有 `build/dist` 打包
- **部分构建**：`make build ARGS='-p core'`（server+client+cli）、`make build ARGS='-p core -p fuse'`、`make build ARGS='-p object'`（S3 网关）、`make build ARGS='-d'`（debug）；`make build-hdfs` 用于 HDFS 支持；`make build ARGS='--skip-java-sdk'` 可跳过 Java SDK
- **Docker**：`make docker-build` — 构建**运行时**镜像；`make docker-build-compile` — 构建编译用镜像（交互）；`make docker-compile` — 在容器内编译，输出到本地 `build/dist`
- **CSI**：`make curvine-csi` — 构建 curvine-csi 镜像
- **示例**：`make build ARGS='-p core'`、`make build ARGS='-p server -p client'`、`make build ARGS='-p object'`（S3 网关）、`RELEASE_VERSION=v1.0.0 make dist`
:::


## docker编译

:::tip
如果您的系统环境是macos 或者 windows，或者linux版本不在 [支持列表](#支持的linux发行版) 中， 则建议使用docker编译，这样您可以在隔离环境中安全操作，而不会影响您的系统环境。
:::


### 1. 使用 Curvine 提供的编译镜像

Docker Hub 提供编译镜像：`curvine/curvine-compile:latest`（另有 `curvine/curvine-compile:build-cached` 含缓存依赖）。

:::tip
可将该镜像作为沙箱：在容器内编译（及运行），仓库挂载到 `/workspace`。
:::

**方式 A — 在容器内编译，输出到本地 `build/dist`：**
```bash
make docker-compile
```
（使用镜像 `curvine/curvine-compile:build-cached`，结果在 `build/dist`。）

**方式 B — 常驻开发容器：**
```bash
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v $(pwd):/workspace -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

docker exec -it curvine-compile /bin/bash
# 容器内执行：make all
```


### 2. 进阶：自建编译镜像

:::tip
若因网络等原因无法使用官方镜像，可在本地基于仓库中的 Dockerfile 构建编译镜像。
:::

`curvine-docker/compile/` 下可用的 Dockerfile：

- **Dockerfile_rocky9** — Rocky Linux 9（推荐基线）
- **Dockerfile_rocky9_cached** — Rocky 9，带依赖缓存（重编更快）
- **Dockerfile_ubuntu22** — Ubuntu 22.04
- **Dockerfile_ubuntu24** — Ubuntu 24.04
- **Dockerfile_amzn2** — Amazon Linux 2

在**项目根目录**执行：

```bash
# 构建编译镜像（任选一个 Dockerfile）
docker build -f curvine-docker/compile/Dockerfile_rocky9 -t curvine-compile:rocky9 curvine-docker/compile

# 启动容器并编译
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v $(pwd):/workspace -w /workspace \
  --network host \
  curvine-compile:rocky9 /bin/bash

docker exec -it curvine-compile /bin/bash
# 容器内：make all
```

编译结果在容器内（及若挂载了仓库则在主机）的 `build/dist`。

:::warning
如果您的编译镜像的os版本和宿主机os版本有较大差异或者不是相同的发行版，则可能因为libc或者abi等不兼容导致docker编译出来产物无法直接在宿主机运行。

因此， 对于docker编译出来的产物，强烈建议在相同的os版本或者docker容器中运行！
:::


## 拓展模块支持
Curvine 底层存储支持对接 OSS、HDFS、S3、MinIO 等多种后端。默认情况下以 OpenDAL 后端为主；对于 OSS 与 HDFS，也可以构建特定实现。

常见的 `--ufs` 参数包括：
| 参数            | 说明                                |
|-----------------|-------------------------------------|
| `oss-hdfs` | 对接阿里 JindoSDK / OSS-HDFS |
| `opendal-oss` | 通过 OpenDAL 对接 OSS 对象存储 |
| `opendal-hdfs` | 通过 OpenDAL 对接原生 HDFS |
| `opendal-webhdfs` | 通过 OpenDAL 对接 WebHDFS |
| `opendal-s3` | 通过 OpenDAL 对接 S3 |
| `opendal-azblob` | 通过 OpenDAL 对接 Azure Blob |


:::warning
编译 `oss-hdfs` 模块时，需要准备 JindoSDK 运行时环境。例如：
```bash
export JINDOSDK_HOME=/opt/jindosdk-6.10.3
export LD_LIBRARY_PATH="${JINDOSDK_HOME}/lib/native:${LD_LIBRARY_PATH}"

# 直接调用 build.sh
sh build/build.sh --ufs oss-hdfs

# 或通过 make 透传参数
make build ARGS='--ufs oss-hdfs'
```
:::

如果需要同时编译多个扩展模块，可以多次指定 `--ufs`，例如：

```bash
sh build/build.sh --ufs oss-hdfs --ufs opendal-oss
make build ARGS='--ufs oss-hdfs --ufs opendal-oss'
```

需要注意的是，OSS 加速桶与普通 OSS 对象存储在 URI 上都可能表现为 `oss://bucket`。因此在挂载 OSS 时，建议结合 CLI 的 `--provider` 明确指定具体实现。详细挂载方式见 CLI 文档中的 `mount` 章节。
