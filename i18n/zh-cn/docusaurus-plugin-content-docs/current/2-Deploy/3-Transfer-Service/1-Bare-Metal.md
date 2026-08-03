---
sidebar_position: 1
---

# 物理机部署 Transfer

本指南在现有 Curvine 集群旁部署一个独立的 Transfer 进程。Master 和 Worker 必须已经
运行，并且使用支持 Transfer task 的版本。

## 准备服务配置

以已包含 Master 地址的集群配置为基础，创建一份仅供 Transfer 使用的副本。下面的
`[transfer]` 是单实例 SQLite 部署唯一需要新增的配置段。

```toml
# conf/curvine-transfer.toml
[transfer]
enabled = true
store_url = "sqlite:///var/lib/curvine-transfer/transfer.db"
hostname = "transfer-1.example.com"
rpc_port = 9010
web_port = 9011
endpoints = ["transfer-1.example.com:9010"]
```

使用运行服务的同一个操作系统用户创建 Store 目录。SQLite 数据库必须位于持久化本地盘
或块存储上；不要放在共享文件系统上，也不要再启动第二个进程访问该数据库。

```bash
install -d -o curvine -g curvine /var/lib/curvine-transfer
```

## 启动与停止

发行包包含 Transfer 启动脚本。它会加载 `curvine-env.sh`，写入
`logs/transfer.out`，并维护 `transfer.pid`。

```bash
export CURVINE_HOME=/opt/curvine
export CURVINE_CONF_FILE=$CURVINE_HOME/conf/curvine-transfer.toml

$CURVINE_HOME/bin/curvine-transfer.sh start
$CURVINE_HOME/bin/curvine-transfer.sh stop
```

## 使用 systemd 运行

使用发行包内置脚本，以便服务拥有正常的 Curvine shell 环境。将下列内容保存为
`/etc/systemd/system/curvine-transfer.service`。

```ini
[Unit]
Description=Curvine Transfer Service
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
User=curvine
Group=curvine
WorkingDirectory=/opt/curvine
Environment=CURVINE_CONF_FILE=/opt/curvine/conf/curvine-transfer.toml
PIDFile=/opt/curvine/transfer.pid
ExecStart=/opt/curvine/bin/curvine-transfer.sh start
ExecStop=/opt/curvine/bin/curvine-transfer.sh stop
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now curvine-transfer
systemctl status curvine-transfer
```

## 验证

```bash
curl --fail http://transfer-1.example.com:9011/readyz
curl --fail http://transfer-1.example.com:9011/healthz

export CURVINE_CONF_FILE=/opt/curvine/conf/curvine-transfer.toml
/opt/curvine/bin/cv transfer list
```

客户端地址必须可被所有 CLI 使用者和可能执行 Transfer task 的 Worker 访问。

## 高可用

运行多个 Transfer 进程时，将 SQLite URL 改为一个共享的 MySQL `store_url`。每个进程
必须具有唯一且可访问的地址，并通过负载均衡或 DNS 向客户端提供一个稳定地址。不要将
多个彼此独立的 SQLite 数据库作为故障切换目标。
