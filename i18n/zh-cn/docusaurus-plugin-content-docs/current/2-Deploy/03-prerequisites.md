---
sidebar_position: 2
---

# 环境初始化

本章节，为您详细介绍常见的不同开发环境下的环境初始化工作, 包括`rocky9`, `centos8`, `ubuntu22.04+`, `macOS`。 由于每个人的环境不尽相同，下述提供的依赖安装方式，仅供参考。如果安装过程中存在问题，欢迎提交[issue](https://github.com/CurvineIO/curvine-doc/issues) 帮助完善文档。 

不推荐使用windows作为开发环境，但是我们仍提供一个[windows环境初始化](#windows10)供您参考。

**依赖环境**
- ​**GCC**: version 10 or later ([GCC Installation](https://gcc.gnu.org/install/))
- ​**Rust**: version 1.86 or later ([Installation Guide](https://www.rust-lang.org/tools/install))
- ​**Protobuf**: version 3.x+ [(Install Guide)](ttps://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip )
- ​**Maven**: version 3.8 or later ([Install Guide](https://maven.apache.org/install.html))
- ​**LLVM**: version 12 or later ([Installation Guide](https://llvm.org/docs/GettingStarted.html))
- ​**FUSE**: libfuse2 or libfuse3 development packages
- ​**JDK**: version 1.8 or later (OpenJDK or Oracle JDK)
- ​**npm**: version 11.7.0 or later ([Node.js Installation](https://nodejs.org/))
- **Python**: version 3.7 or later


特别的， protoc编译器版本和其支持的protoc协议的能力参考
| protoc 版本    | proto2 支持  | proto3 支持  |
|---------------|-------------|-------------|
| 2.x.x         | ✅ 仅支持    | ❌ 不支持    |
| 3.0.0-3.5.x   | ✅ 支持      | ✅ 支持      |
| 3.6.0+        | ✅ 支持      | ✅ 支持      |
| 21.0+         | ✅ 支持      | ✅ 支持      |


## Rocky9/Centos8 单机环境安装

### 系统准备

首先，确保您的 Rocky Linux 9 系统已经更新到最新版本：

```bash
# 更新系统
sudo dnf update -y

# 安装 EPEL 源（如需要额外软件包）
sudo dnf install -y epel-release
```

### 基础开发工具安装

⚠️ **重要：确保 GCC 版本 ≥ 10.0**

安装编译和开发所需的基础工具：
```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
    fuse3 \
    fuse3-devel \
    clang \
    llvm \
    llvm-devel \
    git \
    wget \
    curl \
    zip \
    unzip \
    nodejs \
    npm \
    java-1.8.0-openjdk-devel \
    openssl-devel \
    pkg-config \
    cmake \
    autoconf \
    automake \
    libtool \
    gcc-c++ \
    && sudo dnf clean all
```

### Rust 环境安装

```bash
# 安装 Rust（推荐使用 rustup）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 验证 Rust 安装
rustc --version
cargo --version

# 确保 Rust 版本为 1.86 或更高
rustup update
```

### Protobuf 安装

```bash
# 下载并安装 Protobuf 编译器
cd /tmp
wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip
unzip protoc-27.2-linux-x86_64.zip
sudo cp bin/protoc /usr/local/bin/
sudo cp -r include/* /usr/local/include/
sudo chmod +x /usr/local/bin/protoc

# 验证安装
protoc --version
```

### Maven 安装

```bash
# 下载并安装 Maven 3.8+
cd /opt
sudo wget https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
sudo tar -xzf apache-maven-3.9.6-bin.tar.gz
sudo mv apache-maven-3.9.6 maven

# 配置环境变量
echo 'export MAVEN_HOME=/opt/maven' | sudo tee -a /etc/profile
echo 'export PATH=$MAVEN_HOME/bin:$PATH' | sudo tee -a /etc/profile
source /etc/profile

# 验证安装
mvn --version
```

### Python 环境安装

⚠️ **重要：确保 Python 版本 ≥ 3.7**

```bash
# Rocky Linux 9 默认提供 Python 3.9+，通常已满足要求
# 检查当前 Python 版本
python3 --version

# 如果系统没有 Python 3，安装 Python 3
sudo dnf install -y python3 python3-pip python3-devel

# 如果需要安装特定版本的 Python（如 3.8, 3.9, 3.10）
# 可以使用 EPEL 或编译安装

# 安装 pip 和常用工具
sudo dnf install -y python3-pip python3-setuptools python3-wheel

# 升级 pip 到最新版本
python3 -m pip install --upgrade pip

# 验证安装
python3 --version
pip3 --version

# 创建软链接（可选，便于使用 python 命令）
sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
```

### Python 环境安装(Centos7等低版本)

```bash
# CentOS 7 默认 Python 版本较低，需要手动安装 Python 3.9
# 下载 Python 3.9 源码包
wget https://www.python.org/ftp/python/3.9.16/Python-3.9.16.tgz

# 安装
sudo yum groupinstall "Development Tools" -y
sudo yum install openssl-devel libffi-devel bzip2-devel -y
tar xf Python-3.9.16.tgz
cd Python-3.9.16
./configure --enable-optimizations
sudo make altinstall

# 验证安装
python3.9 --version
# 预期输出：Python 3.9.16

# 升级 pip 到最新版本
/usr/local/bin/python3.9 -m pip install --upgrade pip

# 安装项目依赖库
pip3.9 install -r requirements.txt
```

### 环境变量配置

将以下内容添加到您的 `~/.bashrc` 或 `~/.zshrc` 文件中：

```bash
# Rust 环境
export PATH="$HOME/.cargo/bin:$PATH"

# Maven 环境
export MAVEN_HOME=/opt/maven
export PATH=$MAVEN_HOME/bin:$PATH

# LLVM 环境
export LLVM_SYS_120_PREFIX=/usr

# Java 环境
export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk
export PATH=$JAVA_HOME/bin:$PATH

# PKG_CONFIG 路径
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
```

然后重新加载配置：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

### 环境验证

验证所有依赖是否正确安装：

```bash
# 验证基础工具
echo "=== 验证基础工具 ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# 验证编译工具
echo "=== 验证编译工具 ==="
gcc --version | head -1
clang --version | head -1
llvm-config --version
cmake --version | head -1

# 验证开发依赖
echo "=== 验证开发依赖 ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# 验证 Python 环境
echo "=== 验证 Python 环境 ==="
python3 --version
pip3 --version
python3 -c "import sys; print(f'Python executable: {sys.executable}')"
python3 -c "import sys; print(f'Python version info: {sys.version_info}')"

# 验证 FUSE
echo "=== 验证 FUSE ==="
ls -la /usr/include/fuse3/
pkg-config --modversion fuse3

echo "=== 环境配置完成 ===" 
```

### 常见问题排查

**问题1：protoc 命令找不到**
```bash
# 确保 protoc 在 PATH 中
which protoc
# 如果没有找到，检查是否正确复制到 /usr/local/bin/
ls -la /usr/local/bin/protoc
```

**问题2：Maven 命令找不到**
```bash
# 检查环境变量是否生效
echo $MAVEN_HOME
echo $PATH | grep maven
```

**问题3：Rust 相关命令找不到**
```bash
# 重新加载 Rust 环境
source ~/.cargo/env
# 或重新安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**问题4：GCC 版本过低（< 10.0）**
```bash
# 检查当前 GCC 版本
gcc --version | head -1

# 如果版本低于 10.0，安装更新的工具集
sudo dnf install -y gcc-toolset-11
scl enable gcc-toolset-11 bash

# 验证更新后的版本
gcc --version | head -1

# 如需永久启用，可添加到 ~/.bashrc
echo 'source /opt/rh/gcc-toolset-11/enable' >> ~/.bashrc
```

**问题5：Python 版本过低（< 3.7）**
```bash
# 检查当前 Python 版本
python3 --version

# 如果版本低于 3.7，可以从源码编译安装更新版本
# 安装编译依赖
sudo dnf install -y gcc openssl-devel bzip2-devel libffi-devel sqlite-devel

# 下载并编译安装 Python 3.9
cd /tmp
wget https://www.python.org/ftp/python/3.9.18/Python-3.9.18.tgz
tar xzf Python-3.9.18.tgz
cd Python-3.9.18
./configure --enable-optimizations
make altinstall  # 使用 altinstall 避免覆盖系统 Python

# 验证安装
python3.9 --version

# 创建软链接
sudo ln -sf /usr/local/bin/python3.9 /usr/bin/python3
```

**问题6：pip 安装失败或版本过旧**
```bash
# 重新安装 pip
python3 -m ensurepip --upgrade

# 或者使用 get-pip.py 脚本
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py

# 升级到最新版本
python3 -m pip install --upgrade pip

# 验证 pip 版本
pip3 --version
```

### 编译准备

完成上述安装后，您的 Rocky Linux 9 系统就具备了编译 Curvine 项目所需的所有依赖环境。

## macOS 环境安装

### 系统准备

首先安装 Xcode Command Line Tools 和 Homebrew 包管理器：

```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 更新 Homebrew
brew update
```

### 基础开发工具安装

⚠️ **重要：确保 GCC 版本 ≥ 10.0（如果需要 GCC 而非 Clang）**

使用 Homebrew 安装编译和开发所需的基础工具：

```bash
brew install \
    git \
    wget \
    curl \
    zip \
    unzip \
    node \
    npm \
    openjdk@8 \
    openssl \
    pkg-config \
    cmake \
    autoconf \
    automake \
    libtool \
    llvm \
    macfuse

# 如果项目明确需要 GCC（而非 macOS 默认的 Clang），安装 GCC 11+
brew install gcc@11

# 验证版本
echo "检查编译器版本："
clang --version | head -1
gcc-11 --version | head -1  # 如果安装了 GCC

# 注意：macOS 上 'gcc' 命令通常是 Clang 的别名
# 如需使用真正的 GCC，请使用 gcc-11, g++-11 等具体版本命令
```

### Rust 环境安装

```bash
# 安装 Rust（推荐使用 rustup）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 验证 Rust 安装
rustc --version
cargo --version

# 确保 Rust 版本为 1.86 或更高
rustup update
```

### Protobuf 安装

```bash
# 使用 Homebrew 安装 Protobuf
brew install protobuf

# 验证安装
protoc --version

# 如果需要特定版本，也可以手动安装
# cd /tmp
# wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-osx-x86_64.zip
# unzip protoc-27.2-osx-x86_64.zip
# sudo cp bin/protoc /usr/local/bin/
# sudo cp -r include/* /usr/local/include/
```

### Maven 安装

```bash
# 方法1：使用 Homebrew 安装（推荐）
brew install maven

# 验证安装
mvn --version

# 方法2：手动安装特定版本
# cd /opt
# sudo curl -O https://archive.apache.org/dist/maven/maven-3/3.9.11/binaries/apache-maven-3.9.11-bin.tar.gz
# sudo tar -xzf apache-maven-3.9.11-bin.tar.gz
# sudo mv apache-maven-3.9.11 maven
# sudo chown -R $(whoami):staff /opt/maven

# 如果选择手动安装，需要配置环境变量
# echo 'export MAVEN_HOME=/opt/maven' >> ~/.zshrc
# echo 'export PATH=$MAVEN_HOME/bin:$PATH' >> ~/.zshrc
# source ~/.zshrc
```

### Python 环境安装

⚠️ **重要：确保 Python 版本 ≥ 3.7**

```bash
# 方法1：使用 Homebrew 安装（推荐）
# macOS 可能预装了 Python，但版本可能较旧
python3 --version  # 检查当前版本

# 安装最新 Python 3
brew install python

# 验证安装
python3 --version
pip3 --version

# 方法2：使用 pyenv 管理多个 Python 版本（推荐用于开发）
brew install pyenv

# 安装特定 Python 版本（如 3.9.18）
pyenv install 3.9.18
pyenv global 3.9.18  # 设置为全局默认版本

# 配置 pyenv 环境变量（添加到 ~/.zshrc）
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# 重新加载配置
source ~/.zshrc

# 方法3：从 python.org 下载官方安装包
# 访问 https://www.python.org/downloads/macos/ 下载 .pkg 文件安装

# 升级 pip 到最新版本
python3 -m pip install --upgrade pip

# 验证最终安装
python3 --version
pip3 --version

# 创建软链接（可选，便于使用 python 命令）
# 注意：macOS 可能已有 python 命令指向系统 Python 2
# 建议使用 python3 命令以避免冲突
```

### 环境变量配置

将以下内容添加到您的 `~/.zshrc` 或 `~/.bash_profile` 文件中：

```bash
# Rust 环境
export PATH="$HOME/.cargo/bin:$PATH"

# Java 环境
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
export PATH=$JAVA_HOME/bin:$PATH

# LLVM 环境
export PATH="$(brew --prefix llvm)/bin:$PATH"
export LLVM_SYS_120_PREFIX="$(brew --prefix llvm)"

# PKG_CONFIG 路径
export PKG_CONFIG_PATH="$(brew --prefix)/lib/pkgconfig:$PKG_CONFIG_PATH"

# OpenSSL 路径（如果需要）
export OPENSSL_ROOT_DIR="$(brew --prefix openssl)"
export OPENSSL_LIB_DIR="$(brew --prefix openssl)/lib"
export OPENSSL_INCLUDE_DIR="$(brew --prefix openssl)/include"
```

然后重新加载配置：

```bash
source ~/.zshrc  # 或 source ~/.bash_profile
```

### 环境验证

验证所有依赖是否正确安装：

```bash
# 验证基础工具
echo "=== 验证基础工具 ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# 验证编译工具
echo "=== 验证编译工具 ==="
clang --version | head -1
llvm-config --version
cmake --version | head -1

# 验证开发依赖
echo "=== 验证开发依赖 ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# 验证 Python 环境
echo "=== 验证 Python 环境 ==="
python3 --version
pip3 --version
python3 -c "import sys; print(f'Python executable: {sys.executable}')"
python3 -c "import sys; print(f'Python version info: {sys.version_info}')"

# 验证 FUSE（macFUSE）
echo "=== 验证 FUSE ==="
ls -la /usr/local/include/fuse/
pkg-config --modversion fuse

echo "=== 环境配置完成 ==="
```

### 常见问题排查

**问题1：权限问题**
```bash
# macOS 可能需要授予磁盘访问权限
# 系统偏好设置 > 安全性与隐私 > 隐私 > 完全磁盘访问权限
```

**问题2：macFUSE 未正确安装**
```bash
# 重新安装 macFUSE
brew uninstall macfuse
brew install --cask macfuse
# 可能需要重启系统
```

**问题3：Java 版本问题**
```bash
# 检查 Java 版本
/usr/libexec/java_home -V
# 切换到 Java 8
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
```

**问题4：GCC 版本**
```bash
# macOS 上 'gcc' 通常是 Clang 的别名
gcc --version  # 显示的是 Clang

# 如果项目明确需要 GCC 10+，安装真正的 GCC
brew install gcc@11
brew install gcc@12  # 或更新版本

# 使用具体版本的 GCC 命令
gcc-11 --version
g++-11 --version

# 如需设置 GCC 为默认编译器（不推荐）
# export CC=gcc-11
# export CXX=g++-11
```

**问题5：Python 版本问题**
```bash
# 检查当前 Python 版本
python3 --version

# 如果使用 pyenv 管理版本，检查可用版本
pyenv versions

# 切换到合适的 Python 版本
pyenv global 3.9.18

# 如果 pyenv 未生效，检查环境变量
echo $PYENV_ROOT
echo $PATH | grep pyenv

# 重新加载 pyenv 配置
source ~/.zshrc
```

**问题6：pip 相关问题**
```bash
# 如果 pip3 命令不存在
python3 -m ensurepip --upgrade

# 升级 pip
python3 -m pip install --upgrade pip

# 如果遇到权限问题，使用 --user 标志
python3 -m pip install --user --upgrade pip

# 验证 pip 安装
pip3 --version
python3 -m pip --version
```

### 编译准备

完成上述安装后，您的 macOS 系统就具备了编译 Curvine 项目所需的所有依赖环境。


## Ubuntu 22.04+ 环境安装

### 系统准备

首先，确保您的 Ubuntu 系统已经更新到最新版本：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要的证书和工具
sudo apt install -y ca-certificates curl gnupg lsb-release
```

### 基础开发工具安装

⚠️ **重要：确保 GCC 版本 ≥ 10.0**

安装编译和开发所需的基础工具：

```bash
sudo apt install -y \
    build-essential \
    libfuse3-dev \
    fuse3 \
    clang \
    llvm \
    llvm-dev \
    git \
    wget \
    curl \
    zip \
    unzip \
    nodejs \
    npm \
    openjdk-8-jdk \
    libssl-dev \
    pkg-config \
    cmake \
    autoconf \
    automake \
    libtool \
    gcc \
    g++


# Ubuntu 22.04+ 默认提供 GCC 11+，如果版本过低，可以安装更新版本：
# sudo apt install -y gcc-11 g++-11
# sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 60
# sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-11 60
```

### Rust 环境安装

```bash
# 安装 Rust（推荐使用 rustup）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 验证 Rust 安装
rustc --version
cargo --version

# 确保 Rust 版本为 1.86 或更高
rustup update
```

### Protobuf 安装

```bash
# 方法1：使用包管理器安装（推荐）
sudo apt install -y protobuf-compiler libprotobuf-dev

# 方法2：手动安装最新版本
# cd /tmp
# wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip
# unzip protoc-27.2-linux-x86_64.zip
# sudo cp bin/protoc /usr/local/bin/
# sudo cp -r include/* /usr/local/include/
# sudo chmod +x /usr/local/bin/protoc

# 验证安装
protoc --version
```

### Maven 安装

```bash
# 方法1：使用包管理器安装
sudo apt install -y maven

# 方法2：手动安装最新版本（推荐）
cd /opt
sudo wget https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
sudo tar -xzf apache-maven-3.9.6-bin.tar.gz
sudo mv apache-maven-3.9.6 maven
sudo chown -R root:root /opt/maven

# 配置环境变量
echo 'export MAVEN_HOME=/opt/maven' | sudo tee -a /etc/profile
echo 'export PATH=$MAVEN_HOME/bin:$PATH' | sudo tee -a /etc/profile
source /etc/profile

# 验证安装
mvn --version
```

### Python 环境安装

⚠️ **重要：确保 Python 版本 ≥ 3.7**

```bash
# Ubuntu 22.04+ 默认提供 Python 3.10+，通常已满足要求
# 检查当前 Python 版本
python3 --version

# 如果系统没有 Python 3，安装 Python 3 和相关工具
sudo apt update
sudo apt install -y python3 python3-pip python3-dev python3-venv

# 安装额外的 Python 开发工具
sudo apt install -y python3-setuptools python3-wheel build-essential

# 如果需要安装特定版本的 Python（如 Python 3.8, 3.9）
# 可以使用 deadsnakes PPA
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# 安装特定 Python 版本（示例：Python 3.9）
# sudo apt install -y python3.9 python3.9-dev python3.9-venv python3.9-pip

# 升级 pip 到最新版本
python3 -m pip install --upgrade pip

# 验证安装
python3 --version
pip3 --version

# 创建软链接（可选，便于使用 python 命令）
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3 1

# 如果安装了多个 Python 版本，可以配置 alternatives
# sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
# sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 2
# sudo update-alternatives --config python3  # 选择默认版本
```

### 环境变量配置

将以下内容添加到您的 `~/.bashrc` 或 `~/.zshrc` 文件中：

```bash
# Rust 环境
export PATH="$HOME/.cargo/bin:$PATH"

# Maven 环境（如果手动安装）
export MAVEN_HOME=/opt/maven
export PATH=$MAVEN_HOME/bin:$PATH

# Java 环境
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# LLVM 环境
export LLVM_SYS_120_PREFIX=/usr

# PKG_CONFIG 路径
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
```

然后重新加载配置：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

### 环境验证

验证所有依赖是否正确安装：

```bash
# 验证基础工具
echo "=== 验证基础工具 ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# 验证编译工具
echo "=== 验证编译工具 ==="
gcc --version | head -1
clang --version | head -1
llvm-config --version
cmake --version | head -1

# 验证开发依赖
echo "=== 验证开发依赖 ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# 验证 Python 环境
echo "=== 验证 Python 环境 ==="
python3 --version
pip3 --version
python3 -c "import sys; print(f'Python executable: {sys.executable}')"
python3 -c "import sys; print(f'Python version info: {sys.version_info}')"

# 验证 FUSE
echo "=== 验证 FUSE ==="
ls -la /usr/include/fuse3/
pkg-config --modversion fuse3

echo "=== 环境配置完成 ==="
```

### 常见问题排查

**问题1：权限不足**
```bash
# 确保用户在正确的组中
sudo usermod -a -G fuse $USER
# 重新登录生效
```

**问题2：Node.js 版本过低**
```bash
# 使用 NodeSource 仓库安装最新版本
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**问题3：Java 环境问题**
```bash
# 检查已安装的 Java 版本
update-java-alternatives --list
# 切换 Java 版本
sudo update-alternatives --config java
```

**问题4：FUSE 模块未加载**
```bash
# 加载 FUSE 模块
sudo modprobe fuse
# 检查模块是否加载
lsmod | grep fuse
```

**问题5：GCC 版本过低（< 10.0）**
```bash
# 检查当前 GCC 版本
gcc --version | head -1

# Ubuntu 22.04+ 默认提供 GCC 11+，如果版本过低：
# 安装更新的 GCC 版本
sudo apt install -y gcc-11 g++-11

# 设置为默认版本
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 60
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-11 60

# 验证更新后的版本
gcc --version | head -1
g++ --version | head -1

# 如果需要安装更新版本（如 GCC 12）
# sudo apt install -y gcc-12 g++-12
# sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 70
# sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 70
```

**问题6：Python 版本过低（< 3.7）**
```bash
# 检查当前 Python 版本
python3 --version

# Ubuntu 22.04+ 默认提供 Python 3.10+，通常已满足要求
# 如果需要安装特定版本，使用 deadsnakes PPA
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# 安装特定 Python 版本（如 Python 3.9）
sudo apt install -y python3.9 python3.9-dev python3.9-venv python3.9-pip

# 配置 alternatives 管理多个版本
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 2
sudo update-alternatives --config python3  # 选择默认版本

# 验证版本
python3 --version
```

**问题7：pip 相关问题**
```bash
# 如果 pip3 命令不存在
python3 -m ensurepip --upgrade

# 升级 pip 到最新版本
python3 -m pip install --upgrade pip

# 如果遇到权限问题，使用 --user 标志
python3 -m pip install --user --upgrade pip

# 验证 pip 安装
pip3 --version
python3 -m pip --version

# 如果需要为特定 Python 版本安装 pip
python3.9 -m ensurepip --upgrade
python3.9 -m pip install --upgrade pip
```

### 编译准备

完成上述安装后，您的 Ubuntu 22.04+ 系统就具备了编译 Curvine 项目所需的所有依赖环境。

## Windows10+
在支持window WSL的环境下，进行编译和部署。 WSL（Windows Subsystem for Linux）是 Windows 10 及以上版本提供的一项功能，允许用户在 Windows 系统中直接运行 Linux 环境，无需使用虚拟机或双系统。

在terminal 或者  powsershell中执行
```
wsl --install
```

这个命令会自动：
- 启用必要的 Windows 功能
- 下载并安装 WSL 2
- 安装默认的 Linux 发行版（通常是 Ubuntu）

重启电脑安装完成后，系统会提示重启，重启后 WSL 即安装完成, 首次启动重启后，在开始菜单找到并启动已安装的 Linux 发行版（如 Ubuntu），首次启动会完成初始化并要求设置用户名和密码.

windows下建议的git环境配置
```bash
git config core.autocrlf false
git config core.eol lf
git config core.ignorecase false
git config core.symlinks true
```
完成上述配置后，你可以和使用ubuntu一样的方式进行环境配置， 参考 [Ubuntu 22.04环境配置](#ubuntu-2204-环境安装)