---
sidebar_position: 1
---

# Deploy Transfer on Bare Metal

This guide deploys one independent Transfer process next to an existing
Curvine cluster. Master and Worker processes must already be running and must
come from a version that supports Transfer tasks.

## Prepare the Service Configuration

Start with the cluster configuration that already contains the Master addresses
and create a Transfer-specific copy. The `[transfer]` section below is the only
new section required for a single-instance SQLite deployment.

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

Create the store directory with the same operating-system user that runs the
service. The SQLite database must live on persistent local or block storage.
Do not put it on a shared filesystem or run a second Transfer process against
it.

```bash
install -d -o curvine -g curvine /var/lib/curvine-transfer
```

## Start and Stop

The distribution includes a Transfer launcher. It sources `curvine-env.sh`,
writes `logs/transfer.out`, and manages `transfer.pid`.

```bash
export CURVINE_HOME=/opt/curvine
export CURVINE_CONF_FILE=$CURVINE_HOME/conf/curvine-transfer.toml

$CURVINE_HOME/bin/curvine-transfer.sh start
$CURVINE_HOME/bin/curvine-transfer.sh stop
```

## Run Under systemd

Use the bundled launcher so that the service receives the normal Curvine shell
environment. Save the following as `/etc/systemd/system/curvine-transfer.service`.

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

## Verify

```bash
curl --fail http://transfer-1.example.com:9011/readyz
curl --fail http://transfer-1.example.com:9011/healthz

export CURVINE_CONF_FILE=/opt/curvine/conf/curvine-transfer.toml
/opt/curvine/bin/cv transfer list
```

The client address must be reachable from every CLI user and from every Worker
that may execute a Transfer task.

## High Availability

For multiple Transfer processes, replace the SQLite URL with one shared MySQL
`store_url`. Give every process a unique reachable address and publish one
stable client endpoint through a load balancer or DNS name. Do not use multiple
independent SQLite databases as failover targets.
