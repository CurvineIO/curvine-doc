---
sidebar_position: 0
---

# 部署总览

本章区分集群安装与可选服务。先部署并验证 Curvine Master 和 Worker；只有在希望
Load 或 Export 任务脱离 Master 进程运行时，才部署 Transfer 服务。

## 部署顺序

1. 选择集群形态。
   - 本地体验使用[快速开始](./1-quick-start.md)。
   - 单机集群使用[单机模式](./2-Deploy-Curvine-Cluster/2-Standalone-Mode.md)。
   - 分布式集群使用[物理机](./2-Deploy-Curvine-Cluster/3-Distributed-Mode/02-Bare-Metal-Deployment.md)
     或 [Kubernetes](./2-Deploy-Curvine-Cluster/3-Distributed-Mode/01-k8s-Deployment.md)。
2. 确认 Master 和 Worker 健康，并使用 `cv mount --check` 验证必需的 UFS 挂载。
3. 如需独立调度 Load 和 Export，部署 [Transfer 服务](./3-Transfer-Service/0-Overview.md)。
4. 逐步在需要切换的客户端启用 Transfer。未启用的客户端在灰度期间仍可使用旧的
   Master Job 路径。

## 文档边界

- 集群部署页面说明 Master、Worker、存储和网络。
- Transfer 页面说明独立调度器、状态存储和客户端路由。
- [配置参考](./2-Deploy-Curvine-Cluster/3-Distributed-Mode/03-conf.md)
  是默认值的唯一来源；部署页面只展示对应拓扑的必填项。

## 生产变更

升级应作为独立操作执行。修改线上集群前，先在非生产环境验证版本兼容性和配置变更。
如果需要运行多个 Transfer 实例，必须使用共享的 MySQL Store。
