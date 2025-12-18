---
sidebar_position: 1
---
# Bare Metal Deployment
Before deployment, you need to [create installation packages and modify configuration files](../1-Preparation/03-deployment-setup.md#create-installation-package).

Bare Metal deployment requires manually starting Curvine master and worker. The startup commands are:
```bash
# Start master
bin/curvine-master.sh start

# Start worker
bin/curvine-worker.sh start

# FUSE mount
bin/curvine-fuse.sh start
```