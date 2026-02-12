---
sidebar_position: 1
---

# Download and Compile Curvine

This chapter introduces how to download and compile Curvine.

## Supported Linux Distributions
| OS Distribution     | Kernel Requirement | Tested Version | Dependencies |
|---------------------|--------------------|----------------|--------------|
| **CentOS 7**        | ≥3.10.0            | 7.6            | fuse2-2.9.2  |
| **CentOS 8**        | ≥4.18.0            | 8.5            | fuse3-3.9.1  |
| **Rocky Linux 9**   | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **RHEL 9**          | ≥5.14.0            | 9.5            | fuse3-3.10.2 |
| **Ubuntu 22**       | ≥5.15.0            | 22.4           | fuse3-3.10.5 |

Download the source code (clone into an empty directory, or use a new folder name in place of `./`):

```bash
git clone https://github.com/CurvineIO/curvine.git ./
```

## Local Compilation

:::warning
Please ensure that the prerequisite dependencies are installed and configured. See the [Environment Initialization Tutorial](./01-prerequisites.md) or the [Dockerfile for a reference environment](https://github.com/CurvineIO/curvine/blob/main/curvine-docker/compile/Dockerfile_rocky9).
:::

Optional: check that the build environment is ready:

```bash
make check-env
```

Then build. The compiled output is under `build/dist` (contains `bin/`, `conf/`, `lib/`, etc.—the same layout used for deployment):

```bash
make all
```

You can also call the build script directly (e.g. to see all options):

```bash
sh build/build.sh          # build all (release)
sh build/build.sh -h       # show help and package/ufs options
sh build/build.sh -p core  # build only server, client, cli
```

To create a distribution archive for deployment, see [Deployment Preparation](./03-deployment-setup.md#create-installation-package) (`make dist`).

:::note
More make targets: run `make` or `make help`. Summary:

- **Environment:** `make check-env` — Check build dependencies (also run automatically by `make build`).
- **Building:** `make build` / `make all` — Build; output in `build/dist`. `make dist` — Build and create tar.gz in project root. `make dist-only` — Package existing `build/dist` only.
- **Partial builds:** `make build ARGS='-p core'` (server+client+cli), `make build ARGS='-p core -p fuse'`, `make build ARGS='-p object'` (S3 gateway), `make build ARGS='-d'` (debug). Use `make build-hdfs` for HDFS support (native + WebHDFS); `make build ARGS='--skip-java-sdk'` to skip Java SDK.
- **Docker:** `make docker-build` — Build **runtime** image from source. `make docker-build-compile` — Build compilation image (interactive). `make docker-compile` — Compile in container, output to local `build/dist`.
- **CSI:** `make curvine-csi` — Build curvine-csi Docker image.
- **Example:** `RELEASE_VERSION=v1.0.0 make dist` — Build and package with a version tag.
:::

## Docker Compilation

:::tip
If your system environment is macOS or Windows, or your Linux version is not in the [supported list](#supported-linux-distributions), we recommend using Docker compilation. This allows you to operate safely in an isolated environment without affecting your system environment.
:::

### 1. Using Curvine-provided Compilation Images

Curvine provides compilation images on Docker Hub: `curvine/curvine-compile:latest` (and optionally `curvine/curvine-compile:build-cached` with cached dependencies).

:::tip
Use the compile image as a sandbox: run compilation (and optionally execution) inside the container, with the repo mounted at `/workspace`.
:::

**Option A — Compile in container, output to local `build/dist`:**
```bash
make docker-compile
```
(Uses image `curvine/curvine-compile:build-cached`; result appears in `build/dist`.)

**Option B — Persistent development container:**
```bash
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v $(pwd):/workspace -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

docker exec -it curvine-compile /bin/bash
# inside container: make all
```

### 2. Advanced: Build Your Own Compilation Image

:::tip
If you cannot use the official images (e.g. network restrictions), build the compilation image locally from the Dockerfiles in `curvine-docker/compile`.
:::

Available Dockerfiles under `curvine-docker/compile/`:

- **Dockerfile_rocky9** — Rocky Linux 9 (recommended baseline)
- **Dockerfile_rocky9_cached** — Rocky 9 with dependency cache (faster rebuilds)
- **Dockerfile_ubuntu22** — Ubuntu 22.04
- **Dockerfile_ubuntu24** — Ubuntu 24.04
- **Dockerfile_amzn2** — Amazon Linux 2

From the **project root**:

```bash
# Build the compilation image (choose one Dockerfile)
docker build -f curvine-docker/compile/Dockerfile_rocky9 -t curvine-compile:rocky9 curvine-docker/compile

# Run container and compile
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v $(pwd):/workspace -w /workspace \
  --network host \
  curvine-compile:rocky9 /bin/bash

docker exec -it curvine-compile /bin/bash
# inside: make all
```

Compiled output is in `build/dist` inside the container (and on the host if you mounted the repo).

:::warning
If there are significant differences between your compilation image's OS version and the host machine's OS version, or they are not from the same distribution, the Docker-compiled artifacts may not run directly on the host machine due to libc or ABI incompatibilities.

Therefore, for Docker-compiled artifacts, we strongly recommend running them on the same OS version or within Docker containers!
:::


## UFS Module Support

Curvine supports multiple storage backends including OSS, HDFS, S3, MinIO, and more. By default, these are integrated via OpenDAL. Curvine also provides optimized implementations for OSS and HDFS. You can compile with specific modules using `make all --ufs oss-hdfs`.

Supported parameters:
| Parameter       | Description                                |
|-----------------|---------------------------------------------|
| oss-hdfs        | Use JindoSDK for Alibaba Cloud             |
| opendal-oss     | Use OpenDAL for OSS object storage         |
| opendal-hdfs    | Run in native mode                         |
| opendal-s3      | Use OpenDAL for S3 object storage          |
| opendal-azblob  | Use OpenDAL for Azure Blob                 |


:::warning
When compiling the `oss-hdfs` module, you need to set JindoSDK environment variables:
```bash
export JINDOSDK_HOME=/opt/jindosdk-6.10.3
export LD_LIBRARY_PATH="${JINDOSDK_HOME}/lib/native:${LD_LIBRARY_PATH}"
make all --ufs oss-hdfs
```
:::

To compile multiple UFS modules simultaneously, specify `--ufs` multiple times, e.g. `make all --ufs oss-hdfs --ufs opendal-oss`

Note that both OSS accelerated buckets and standard object storage buckets use the `oss://test-bucket` format. When mounting OSS storage, you need to specify the appropriate module. For detailed mount usage, see the CLI mount section.
