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

然后，使用make命令即可全量编译， 编译结果位于 `build/dist` 中
```
make all
```


:::note
更多make支持的参数，可以敲击`make` 或者 `make help`查看， 如下
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


## docker编译

:::tip
如果您的系统环境是macos 或者 windows，或者linux版本不在 [支持列表](#支持的linux发行版) 中， 则建议使用docker编译，这样您可以在隔离环境中安全操作，而不会影响您的系统环境。
:::


### 1.使用curvine提供的编译镜像
curinve在dockerhub上提供了 基于`rocky9` 的编译镜像 `curvine/curvine-compile:latest`

:::tip
推荐使用curvine-compile镜像作为一个沙箱开发环境， 编译和运行都在docker容器中运行。
:::

快速尝鲜，您只需执行
```bash
make docker-build 
```

**常驻开发容器**
```bash
cd curvine
docker run -itd --name curvine-compile \
  -u root --privileged=true \
  -v .:/workspace \
  -w /workspace \
  --network host \
  curvine/curvine-compile:latest /bin/bash

# 容器在后台运行，后续可以直接attach
docker exec -it curvine-compile /bin/bash
```


### 2.进阶版：构建自己的编译镜像

:::tip
如果您遇到网络环境等问题，不方便使用官方提供的docker镜像，可以选择自己本地构建编译镜像。
:::

下载的代码中，`curvine-docker/compile`，包含了各种构建编译镜像的Dockerfile， 可以根据需要选择文件，构建一个编译镜像，
如下以rocky9为例，构建一个编译镜像，并且启动一个容器，进行编译：

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

# 进入容器后
make all

# 容器在后台运行，后续可以直接attach
# docker exec -it curvine-compile /bin/bash
```

:::warning
如果您的编译镜像的os版本和宿主机os版本有较大差异或者不是相同的发行版，则可能因为libc或者abi等不兼容导致docker编译出来产物无法直接在宿主机运行。

因此， 对于docker编译出来的产物，强烈建议在相同的os版本或者docker容器中运行！
:::