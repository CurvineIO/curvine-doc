---
sidebar_position: 1
---

# 裸机部署

部署前需要[创建安装包与修改配置文件](../1-Preparation/03-deployment-setup.md#创建安装包)

裸机部署需要手动启动curvine master和worker，启动命令如下：
```
# 启动master
bin/curvine-master.sh start

# 启动worker
bin/curvine-worker.sh start

# fuse挂载
bin/curvine-fuse.sh start
```