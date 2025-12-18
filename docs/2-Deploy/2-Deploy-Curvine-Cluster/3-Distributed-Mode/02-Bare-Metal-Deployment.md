---
sidebar_position: 1
---
# Bare Metal Deployment
Before deployment, you need to [create installation packages and modify configuration files](../1-Preparation/03-deployment-setup.md#create-installation-package).

:::warning
Each worker needs to have its own determined IP. In multi-network interface environments, it is recommended to explicitly specify the IP through environment variables to avoid automatically reading unexpected network interface addresses.
:::

Bare Metal deployment requires manually starting Curvine master and worker. The startup commands are:
```bash
# Start master
bin/curvine-master.sh start

# Start worker
bin/curvine-worker.sh start

# FUSE mount
bin/curvine-fuse.sh start
```