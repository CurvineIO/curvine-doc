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

Download the source code:
```bash
git clone https://github.com/CurvineIO/curvine.git ./
```

## Local Compilation

:::warning
Please ensure that the prerequisite dependencies are installed and configured in the environment variables. For the installation process of related environment dependencies, you can refer to the [Environment Initialization Tutorial](./01-prerequisites.md)

or

[Docker Environment Initialization](https://github.com/CurvineIO/curvine/blob/main/curvine-docker/compile/Dockerfile_rocky9)
:::

Then, use the make command for full compilation. The compiled results are located in `build/dist`:
```bash
make all
```

:::note
For more make parameters, you can type `make` or `make help` to view, as shown below:
```bash
Environment:
  make check-env                   - Check build environment dependencies

Building:
  make build ARGS='<args>'         - Build with specific arguments passed to build.sh
  make all                         - Same as 'make build'
  make format                      - Format code using pre-commit hooks

Docker:
  make docker-build                - Build using Docker compilation image
  make docker-build-cached         - Build using cached Docker compilation image
  make docker-build-img            - Build compilation Docker image (interactive)

CSI (Container Storage Interface):
  make csi-build                   - Build curvine-csi Go binary
  make csi-run                     - Run curvine-csi from source
  make csi-docker-build            - Build curvine-csi Docker image
  make csi-docker-push             - Push curvine-csi Docker image
  make csi-docker                  - Build and push curvine-csi Docker image
  make csi-docker-fast             - Build curvine-csi Docker image quickly (no push)
  make csi-fmt                     - Format curvine-csi Go code
  make csi-vet                     - Run go vet on curvine-csi code

Other:
  make cargo ARGS='<args>'         - Run arbitrary cargo commands
  make help                        - Show this help message

Parameters:
  ARGS='<args>'  - Additional arguments to pass to build.sh

Examples:
  make build                                  - Build entire project in release mode
  make build ARGS='-d'                       - Build entire project in debug mode
  make build ARGS='-p server -p client'       - Build only server and client components
  make build ARGS='-p object'                  - Build S3 object gateway
  make build ARGS='--package core --ufs s3'   - Build core packages with S3 native SDK
  make cargo ARGS='test --verbose'            - Run cargo test with verbose output
  make csi-docker-fast                        - Build curvine-csi Docker image quickly
```
:::

## Docker Compilation

:::tip
If your system environment is macOS or Windows, or your Linux version is not in the [supported list](#supported-linux-distributions), we recommend using Docker compilation. This allows you to operate safely in an isolated environment without affecting your system environment.
:::

### 1. Using Curvine-provided Compilation Images

Curvine provides compilation images based on `rocky9` on DockerHub: `curvine/curvine-compile:latest`

:::tip
We recommend using the curvine-compile image as a sandbox development environment, where both compilation and execution run within Docker containers.
:::

For a quick try, you only need to execute:
```bash
make docker-build 
```

**Persistent Development Container**
```bash
cd curvine
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

# The container runs in the background, you can attach directly later
docker exec -it curvine-compile /bin/bash
```

### 2. Advanced: Build Your Own Compilation Image

:::tip
If you encounter network environment issues or cannot conveniently use the official Docker images, you can choose to build your own compilation image locally.
:::

The downloaded code includes various Dockerfiles for building compilation images in the `curvine-docker/compile` directory. You can choose the appropriate file to build a compilation image. Here's an example using Rocky9 to build a compilation image and start a container for compilation:

```bash
cd curvine/curvine-docker/compile

docker build -f curvine-docker/compile/Dockerfile_rocky9 -t curvine-compile:rocky9 .

cd ../..

docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine-compile:rock9:latest /bin/bash

# After entering the container
make all

# The container runs in the background, you can attach directly later
# docker exec -it curvine-compile /bin/bash
```

:::warning
If there are significant differences between your compilation image's OS version and the host machine's OS version, or they are not from the same distribution, the Docker-compiled artifacts may not run directly on the host machine due to libc or ABI incompatibilities.

Therefore, for Docker-compiled artifacts, we strongly recommend running them on the same OS version or within Docker containers!
:::
