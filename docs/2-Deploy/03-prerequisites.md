---
sidebar_position: 2
---

# Environment Initialization

This chapter provides detailed environment initialization instructions for different common development environments, including `rocky9`, `centos8`, `ubuntu22.04+`, and `macOS`.

**Dependencies**
- **GCC**: version 10 or later ([GCC Installation](https://gcc.gnu.org/install/))
- **Rust**: version 1.86 or later ([Installation Guide](https://www.rust-lang.org/tools/install))
- **Protobuf**: version 3.x+ ([Install Guide](https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip))
- **Maven**: version 3.8 or later ([Install Guide](https://maven.apache.org/install.html))
- **LLVM**: version 12 or later ([Installation Guide](https://llvm.org/docs/GettingStarted.html))
- **FUSE**: libfuse2 or libfuse3 development packages
- **JDK**: version 1.8 or later (OpenJDK or Oracle JDK)
- **npm**: version 9 or later ([Node.js Installation](https://nodejs.org/))

In particular, the protoc compiler version and its supported protocol capabilities reference:
| protoc Version | proto2 Support | proto3 Support |
|----------------|----------------|----------------|
| 2.x.x          | ✅ Only supports | ❌ Not supported |
| 3.0.0-3.5.x    | ✅ Supports     | ✅ Supports     |
| 3.6.0+         | ✅ Supports     | ✅ Supports     |
| 21.0+          | ✅ Supports     | ✅ Supports     |

## Rocky9/CentOS8 Single Machine Environment Installation

### System Preparation

First, ensure your Rocky Linux 9 system is updated to the latest version:

```bash
# Update system
sudo dnf update -y

# Install EPEL repository (if additional packages are needed)
sudo dnf install -y epel-release
```

### Basic Development Tools Installation

⚠️ **Important: Ensure GCC version ≥ 10.0**

Install basic tools required for compilation and development:
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

### Rust Environment Installation

```bash
# Install Rust (recommended using rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify Rust installation
rustc --version
cargo --version

# Ensure Rust version is 1.86 or higher
rustup update
```

### Protobuf Installation

```bash
# Download and install Protobuf compiler
cd /tmp
wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip
unzip protoc-27.2-linux-x86_64.zip
sudo cp bin/protoc /usr/local/bin/
sudo cp -r include/* /usr/local/include/
sudo chmod +x /usr/local/bin/protoc

# Verify installation
protoc --version
```

### Maven Installation

```bash
# Download and install Maven 3.8+
cd /opt
sudo wget https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
sudo tar -xzf apache-maven-3.9.6-bin.tar.gz
sudo mv apache-maven-3.9.6 maven

# Configure environment variables
echo 'export MAVEN_HOME=/opt/maven' | sudo tee -a /etc/profile
echo 'export PATH=$MAVEN_HOME/bin:$PATH' | sudo tee -a /etc/profile
source /etc/profile

# Verify installation
mvn --version
```

### Environment Variables Configuration

Add the following content to your `~/.bashrc` or `~/.zshrc` file:

```bash
# Rust environment
export PATH="$HOME/.cargo/bin:$PATH"

# Maven environment
export MAVEN_HOME=/opt/maven
export PATH=$MAVEN_HOME/bin:$PATH

# LLVM environment
export LLVM_SYS_120_PREFIX=/usr

# Java environment
export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk
export PATH=$JAVA_HOME/bin:$PATH

# PKG_CONFIG path
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
```

Then reload the configuration:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Environment Verification

Verify that all dependencies are correctly installed:

```bash
# Verify basic tools
echo "=== Verifying Basic Tools ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# Verify compilation tools
echo "=== Verifying Compilation Tools ==="
gcc --version | head -1
clang --version | head -1
llvm-config --version
cmake --version | head -1

# Verify development dependencies
echo "=== Verifying Development Dependencies ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# Verify FUSE
echo "=== Verifying FUSE ==="
ls -la /usr/include/fuse3/
pkg-config --modversion fuse3

echo "=== Environment Configuration Complete ===" 
```

### Common Issue Troubleshooting

**Issue 1: protoc command not found**
```bash
# Ensure protoc is in PATH
which protoc
# If not found, check if it was correctly copied to /usr/local/bin/
ls -la /usr/local/bin/protoc
```

**Issue 2: Maven command not found**
```bash
# Check if environment variables are effective
echo $MAVEN_HOME
echo $PATH | grep maven
```

**Issue 3: Rust-related commands not found**
```bash
# Reload Rust environment
source ~/.cargo/env
# Or reinstall
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Issue 4: GCC version too low (< 10.0)**
```bash
# Check current GCC version
gcc --version | head -1

# If version is below 10.0, install newer toolset
sudo dnf install -y gcc-toolset-11
scl enable gcc-toolset-11 bash

# Verify updated version
gcc --version | head -1

# To enable permanently, add to ~/.bashrc
echo 'source /opt/rh/gcc-toolset-11/enable' >> ~/.bashrc
```

### Compilation Preparation

After completing the above installation, your Rocky Linux 9 system will have all the dependency environments required to compile the Curvine project.

## macOS Environment Installation

### System Preparation

First install Xcode Command Line Tools and Homebrew package manager:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Update Homebrew
brew update
```

### Basic Development Tools Installation

⚠️ **Important: Ensure GCC version ≥ 10.0 (if GCC is needed instead of Clang)**

Use Homebrew to install basic tools required for compilation and development:

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

# If the project explicitly requires GCC (instead of macOS default Clang), install GCC 11+
brew install gcc@11

# Verify versions
echo "Checking compiler versions:"
clang --version | head -1
gcc-11 --version | head -1  # if GCC is installed

# Note: On macOS, the 'gcc' command is usually an alias for Clang
# To use real GCC, use specific version commands like gcc-11, g++-11, etc.
```

### Rust Environment Installation

```bash
# Install Rust (recommended using rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify Rust installation
rustc --version
cargo --version

# Ensure Rust version is 1.86 or higher
rustup update
```

### Protobuf Installation

```bash
# Install Protobuf using Homebrew
brew install protobuf

# Verify installation
protoc --version

# If you need a specific version, you can also install manually
# cd /tmp
# wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-osx-x86_64.zip
# unzip protoc-27.2-osx-x86_64.zip
# sudo cp bin/protoc /usr/local/bin/
# sudo cp -r include/* /usr/local/include/
```

### Maven Installation

```bash
# Method 1: Install using Homebrew (recommended)
brew install maven

# Verify installation
mvn --version

# Method 2: Manual installation of specific version
# cd /opt
# sudo curl -O https://archive.apache.org/dist/maven/maven-3/3.9.11/binaries/apache-maven-3.9.11-bin.tar.gz
# sudo tar -xzf apache-maven-3.9.11-bin.tar.gz
# sudo mv apache-maven-3.9.11 maven
# sudo chown -R $(whoami):staff /opt/maven

# If you choose manual installation, configure environment variables
# echo 'export MAVEN_HOME=/opt/maven' >> ~/.zshrc
# echo 'export PATH=$MAVEN_HOME/bin:$PATH' >> ~/.zshrc
# source ~/.zshrc
```

### Environment Variables Configuration

Add the following content to your `~/.zshrc` or `~/.bash_profile` file:

```bash
# Rust environment
export PATH="$HOME/.cargo/bin:$PATH"

# Java environment
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
export PATH=$JAVA_HOME/bin:$PATH

# LLVM environment
export PATH="$(brew --prefix llvm)/bin:$PATH"
export LLVM_SYS_120_PREFIX="$(brew --prefix llvm)"

# PKG_CONFIG path
export PKG_CONFIG_PATH="$(brew --prefix)/lib/pkgconfig:$PKG_CONFIG_PATH"

# OpenSSL path (if needed)
export OPENSSL_ROOT_DIR="$(brew --prefix openssl)"
export OPENSSL_LIB_DIR="$(brew --prefix openssl)/lib"
export OPENSSL_INCLUDE_DIR="$(brew --prefix openssl)/include"
```

Then reload the configuration:

```bash
source ~/.zshrc  # or source ~/.bash_profile
```

### Environment Verification

Verify that all dependencies are correctly installed:

```bash
# Verify basic tools
echo "=== Verifying Basic Tools ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# Verify compilation tools
echo "=== Verifying Compilation Tools ==="
clang --version | head -1
llvm-config --version
cmake --version | head -1

# Verify development dependencies
echo "=== Verifying Development Dependencies ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# Verify FUSE (macFUSE)
echo "=== Verifying FUSE ==="
ls -la /usr/local/include/fuse/
pkg-config --modversion fuse

echo "=== Environment Configuration Complete ==="
```

### Common Issue Troubleshooting

**Issue 1: Permission issues**
```bash
# macOS may require disk access permissions
# System Preferences > Security & Privacy > Privacy > Full Disk Access
```

**Issue 2: macFUSE not properly installed**
```bash
# Reinstall macFUSE
brew uninstall macfuse
brew install --cask macfuse
# May need to restart the system
```

**Issue 3: Java version issues**
```bash
# Check Java versions
/usr/libexec/java_home -V
# Switch to Java 8
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
```

**Issue 4: GCC version**
```bash
# On macOS, 'gcc' is usually an alias for Clang
gcc --version  # Shows Clang

# If the project explicitly requires GCC 10+, install real GCC
brew install gcc@11
brew install gcc@12  # or newer version

# Use specific version GCC commands
gcc-11 --version
g++-11 --version

# To set GCC as default compiler (not recommended)
# export CC=gcc-11
# export CXX=g++-11
```

### Compilation Preparation

After completing the above installation, your macOS system will have all the dependency environments required to compile the Curvine project.

## Ubuntu 22.04+ Environment Installation

### System Preparation

First, ensure your Ubuntu system is updated to the latest version:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install necessary certificates and tools
sudo apt install -y ca-certificates curl gnupg lsb-release
```

### Basic Development Tools Installation

⚠️ **Important: Ensure GCC version ≥ 10.0**

Install basic tools required for compilation and development:

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

# Ubuntu 22.04+ provides GCC 11+ by default, if version is too low, install newer version:
# sudo apt install -y gcc-11 g++-11
# sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 60
# sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-11 60
```

### Rust Environment Installation

```bash
# Install Rust (recommended using rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify Rust installation
rustc --version
cargo --version

# Ensure Rust version is 1.86 or higher
rustup update
```

### Protobuf Installation

```bash
# Method 1: Install using package manager (recommended)
sudo apt install -y protobuf-compiler libprotobuf-dev

# Method 2: Manual installation of latest version
# cd /tmp
# wget https://github.com/protocolbuffers/protobuf/releases/download/v27.2/protoc-27.2-linux-x86_64.zip
# unzip protoc-27.2-linux-x86_64.zip
# sudo cp bin/protoc /usr/local/bin/
# sudo cp -r include/* /usr/local/include/
# sudo chmod +x /usr/local/bin/protoc

# Verify installation
protoc --version
```

### Maven Installation

```bash
# Method 1: Install using package manager
sudo apt install -y maven

# Method 2: Manual installation of latest version (recommended)
cd /opt
sudo wget https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
sudo tar -xzf apache-maven-3.9.6-bin.tar.gz
sudo mv apache-maven-3.9.6 maven
sudo chown -R root:root /opt/maven

# Configure environment variables
echo 'export MAVEN_HOME=/opt/maven' | sudo tee -a /etc/profile
echo 'export PATH=$MAVEN_HOME/bin:$PATH' | sudo tee -a /etc/profile
source /etc/profile

# Verify installation
mvn --version
```

### Environment Variables Configuration

Add the following content to your `~/.bashrc` or `~/.zshrc` file:

```bash
# Rust environment
export PATH="$HOME/.cargo/bin:$PATH"

# Maven environment (if manually installed)
export MAVEN_HOME=/opt/maven
export PATH=$MAVEN_HOME/bin:$PATH

# Java environment
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# LLVM environment
export LLVM_SYS_120_PREFIX=/usr

# PKG_CONFIG path
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH
```

Then reload the configuration:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Environment Verification

Verify that all dependencies are correctly installed:

```bash
# Verify basic tools
echo "=== Verifying Basic Tools ==="
git --version
wget --version | head -1
curl --version | head -1
node --version
npm --version

# Verify compilation tools
echo "=== Verifying Compilation Tools ==="
gcc --version | head -1
clang --version | head -1
llvm-config --version
cmake --version | head -1

# Verify development dependencies
echo "=== Verifying Development Dependencies ==="
rustc --version
cargo --version
protoc --version
mvn --version | head -1
java -version

# Verify FUSE
echo "=== Verifying FUSE ==="
ls -la /usr/include/fuse3/
pkg-config --modversion fuse3

echo "=== Environment Configuration Complete ==="
```

### Common Issue Troubleshooting

**Issue 1: Insufficient permissions**
```bash
# Ensure user is in the correct group
sudo usermod -a -G fuse $USER
# Re-login to take effect
```

**Issue 2: Node.js version too low**
```bash
# Use NodeSource repository to install latest version
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Issue 3: Java environment issues**
```bash
# Check installed Java versions
update-java-alternatives --list
# Switch Java version
sudo update-alternatives --config java
```

**Issue 4: FUSE module not loaded**
```bash
# Load FUSE module
sudo modprobe fuse
# Check if module is loaded
lsmod | grep fuse
```

**Issue 5: GCC version too low (< 10.0)**
```bash
# Check current GCC version
gcc --version | head -1

# Ubuntu 22.04+ provides GCC 11+ by default, if version is too low:
# Install newer GCC version
sudo apt install -y gcc-11 g++-11

# Set as default version
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 60
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-11 60

# Verify updated version
gcc --version | head -1
g++ --version | head -1

# If you need to install newer version (like GCC 12)
# sudo apt install -y gcc-12 g++-12
# sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 70
# sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 70
```

### Compilation Preparation

After completing the above installation, your Ubuntu 22.04+ system will have all the dependency environments required to compile the Curvine project.
