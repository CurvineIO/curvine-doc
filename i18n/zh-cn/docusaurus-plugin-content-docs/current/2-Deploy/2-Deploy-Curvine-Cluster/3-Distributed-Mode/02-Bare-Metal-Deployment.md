---
sidebar_position: 1
---

# 裸机部署

部署前需要[创建安装包与修改配置文件](../1-Preparation/03-deployment-setup.md#创建安装包)

:::warning
每台worker需要有自己确定的IP。多网卡环境下，建议通过环境变量显式指定IP，避免自动读取到预期外的网卡地址。
:::

裸机部署需要手动启动curvine master和worker，启动命令如下：
```
# 启动master
bin/curvine-master.sh start

# 启动worker
bin/curvine-worker.sh start

# fuse挂载
bin/curvine-fuse.sh start
```