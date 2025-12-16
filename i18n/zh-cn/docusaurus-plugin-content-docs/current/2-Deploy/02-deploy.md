---
sidebar_position: 1
---

# 部署集群
Curvine有良好的跨平台能力，
支持在几乎所有主流架构的各类操作系统上运行，包括且不限于 Linux、macOS、Windows 等；支持不同的cpu架构arm64、x86_64等。

如下一个建议的操作系统版本：
- Linux, `Rocky` >= 9 、`Centos` >= 7, `Ubuntu` > 22.04
- MacOS
- Windows


**已支持的发行版**
| 操作系统 | 内核要求 | 测试版本 | 依赖 |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |


### 资源需求
curvine没有最小资源要求，使用很小的资源就支撑极高的并发和流量。这里提供一个参考值：
- cpu 2核 
- 内存 4G
- 网络 10G
- SSD磁盘 1个 
  
根据这个参考值, 用其中一个资源值反推其他硬件的资源需求。  
假设有2个SSD磁盘，那么需要cpu 4核、内存8G、带宽20G；内存用4G也可以，这取决于业务并发，如果并发不高，内存不用增加。

:::warning
仅供参考，以实际业务为准。
:::


## 部署

编译软件安装包，如何编译可以参考[快速开始](01-quick-start.md)。

执行如下命令，创建一个安装包：
``` 
make dist
```
编译成功后，会在项目根目录生成一个tar.gz包，这个文件就是curvine的安装包。
可以用这个安装包部署或者构建镜像。

### 配置文件修改
环境变量配置文件在config/env.sh，这个文件是一个bash脚本，用于配置curvine的环境变量。
需要修改的环境变量为 LOCAL_HOSTNAME，该环境变量非常重要，用于指定curvine的主机名，curvine集群需要依靠它识别集群成员。
建议修改为本机hostname：
```
export LOCAL_HOSTNAME=$(hostname)
```

curvine的配置文件在config/curvine.toml，这个文件是一个toml格式的配置文件，配置文件中包含了curvine的各种配置，通常需要修改的配置如下：
1. 配置master节点地址
2. 配置worker存储目录。

如下是一个示例配置：
``` 
format_master = false
format_worker = false

[master]
# 配置元数据保存目录
meta_dir = "data/meta" 

# 配置master日志目录
log = { level = "info", log_dir = "logs", file_name = "master.log" } 

[journal]
# 配置raft主节点列表。hostname需要和LOCAL_HOSTNAME环境变量一致，否则无法识别主节点。
# id为整数，不能重复。port为master raft端口，默认为8996
journal_addrs = [
    {id = 1, hostname = "master1", port = 8996}
    {id = 2, hostname = "master2", port = 8996}
    {id = 3, hostname = "master3", port = 8996}
]

# 配置raft 日志存储目录
journal_dir = "testing/journal"  

[worker]
# 预留空间，默认为0
dir_reserved = "0"

# 配置worker存储目录
data_dir = [
    "[SSD]/data/data1",
    "[SSD]/data/data2"
]

# 配置worker日志
log = { level = "info", log_dir = "logss", file_name = "worker.log" }

[client]
# 配置master地址，端口为master rpc端口，默认为8995
master_addrs = [
    { hostname = "master1", port = 8995 },
    { hostname = "master2", port = 8995 },
    { hostname = "master3", port = 8995 },
]


# 客户端日志配置
[log]
level = "info"
log_dir = "logs"
file_name = "curvine.log"

```

:::danger
journal配置的master_addrs的hostname，一定要和master启动的hostname保持一致， 否则会无法启动
:::

如果需要使用java hadoop 客户端，修改curvine-site.xml中fs.cv.master_addrs值，示例如下：
```
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```

### 非镜像部署
非镜像部署需要手动启动curvine master和worker，启动命令如下：
```
# 启动master
bin/curvine-master.sh start

# 启动worker
bin/curvine-worker.sh start

# fuse挂载
bin/curvine-fuse.sh start
```

### k8s部署
在 Kubernetes 上部署 Curvine 分布式存储集群的生产级 Helm Chart。

#### 特性

* **一键部署**：使用单个 Helm 命令部署完整的 Curvine 集群

* **动态配置**：自动生成 journal_addrs 和 master_addrs

* **灵活存储**：支持 PVC、hostPath 和 emptyDir 存储模式

* **高可用性**：支持奇数个 Master 副本与 Raft 共识机制

* **热配置更新**：ConfigMap 变更自动触发 Pod 滚动更新

* **生产就绪**：内置资源限制、健康检查和 RBAC

* **Master 副本保护**：防止升级期间意外修改 Master 副本数

#### 前置条件

* Kubernetes 1.20+

* Helm 3.0+

* PV 供应器（如果使用 PVC 存储） m

#### 快速开始

##### 1. 添加 Helm 仓库（可选）

```bash
# 如果 Chart 已发布到仓库
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update
```
##### 2. 安装 Chart

###### 选项 A：从 Helm 仓库安装（推荐）

>**提示**：当前helm提供的版本基于main分支版本，仅在预发模式下使用，如需安装需要指定--devel 
```bash
# 使用默认配置安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel

# 使用自定义副本数安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10

# 使用自定义 values 文件安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  -f https://curvineio.github.io/helm/charts/examples/values-prod.yaml
```
###### 选项 B：从本地 Chart 安装

>**注意**：从 `helm-charts` 目录（`curvine-runtime` 文件夹的父目录）运行这些命令 
```bash
# 使用默认配置安装
helm install curvine ./curvine-runtime -n curvine --create-namespace

# 使用自定义副本数安装
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set master.replicas=5 \
  --set worker.replicas=10

# 使用自定义 values 文件安装
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f ./curvine-runtime/examples/values-prod.yaml
```
##### 3. 验证部署

```bash
# 检查 Pod 状态
kubectl get pods -n curvine

# 查看 Services
kubectl get svc -n curvine

# 查看 PersistentVolumeClaims
kubectl get pvc -n curvine

# 运行 Helm 测试
helm test curvine -n curvine
```
##### 4. 访问集群

```bash
# 端口转发访问 Master Web UI
kubectl port-forward -n curvine svc/curvine-master 9000:9000

# 访问 http://localhost:9000
```
#### 配置

##### 全局参数

|参数|说明|默认值|
|:----|:----|:----|
|global.clusterDomain|Kubernetes 集群域|cluster.local|

##### 集群参数

|参数|说明|默认值|
|:----|:----|:----|
|cluster.id|集群标识符|curvine|
|cluster.formatMaster|启动时格式化 Master 数据|false|
|cluster.formatWorker|启动时格式化 Worker 数据|false|
|cluster.formatJournal|启动时格式化日志数据|false|

##### 镜像配置

|参数|说明|默认值|
|:----|:----|:----|
|image.repository|容器镜像仓库|docker.io/curvine|
|image.tag|容器镜像标签|latest|
|image.pullPolicy|镜像拉取策略|IfNotPresent|
|image.pullSecrets|镜像拉取密钥|[]|

##### Master 配置

|参数|说明|默认值|
|:----|:----|:----|
|master.replicas|Master 副本数（必须为奇数：1, 3, 5, 7…）|3|
|master.rpcPort|RPC 端口|8995|
|master.journalPort|日志/Raft 端口|8996|
|master.webPort|Web UI 端口|9000|
|master.web1Port|额外 Web 端口|9001|
|master.storage.meta.enabled|启用元数据存储|true|
|master.storage.meta.storageClass|元数据存储类|"" (默认)|
|master.storage.meta.size|元数据存储大小|10Gi|
|master.storage.meta.hostPath|元数据主机路径（无 storageClass 时使用）|""|
|master.storage.meta.mountPath|元数据挂载路径|/opt/curvine/data/meta|
|master.storage.journal.enabled|启用日志存储|true|
|master.storage.journal.storageClass|日志存储类|"" (默认)|
|master.storage.journal.size|日志存储大小|50Gi|
|master.storage.journal.hostPath|日志主机路径（无 storageClass 时使用）|""|
|master.storage.journal.mountPath|日志挂载路径|/opt/curvine/data/journal|
|master.resources.requests.cpu|CPU 请求|1000m|
|master.resources.requests.memory|内存请求|2Gi|
|master.resources.limits.cpu|CPU 限制|2000m|
|master.resources.limits.memory|内存限制|4Gi|
|master.nodeSelector|节点选择器标签|{}|
|master.tolerations|Pod 容忍度|[]|
|master.affinity|Pod 亲和性规则|{}|
|master.labels|额外标签|{}|
|master.annotations|额外注解|{}|
|master.extraEnv|额外环境变量|[]|
|master.extraVolumes|额外卷|[]|
|master.extraVolumeMounts|额外卷挂载|[]|

##### Worker 配置

|参数|说明|默认值|
|:----|:----|:----|
|worker.replicas|Worker 副本数|3|
|worker.rpcPort|RPC 端口|8997|
|worker.webPort|Web UI 端口|9001|
|worker.hostNetwork|使用主机网络|false|
|worker.dnsPolicy|DNS 策略|ClusterFirst|
|worker.privileged|特权模式（FUSE 需要）|true|
|worker.storage.dataDirs[0].name|数据目录名称|data1|
|worker.storage.dataDirs[0].type|存储类型（SSD/HDD）|SSD|
|worker.storage.dataDirs[0].enabled|启用数据目录|true|
|worker.storage.dataDirs[0].size|数据目录大小|10Gi|
|worker.storage.dataDirs[0].storageClass|存储类|"" (默认)|
|worker.storage.dataDirs[0].hostPath|主机路径（无 storageClass 时使用）|""|
|worker.storage.dataDirs[0].mountPath|挂载路径|/data/data1|
|worker.resources.requests.cpu|CPU 请求|2000m|
|worker.resources.requests.memory|内存请求|4Gi|
|worker.resources.limits.cpu|CPU 限制|4000m|
|worker.resources.limits.memory|内存限制|8Gi|
|worker.nodeSelector|节点选择器标签|{}|
|worker.tolerations|Pod 容忍度|[]|
|worker.antiAffinity.enabled|启用 Pod 反亲和性|true|
|worker.antiAffinity.type|反亲和性类型（required/preferred）|preferred|
|worker.labels|额外标签|{}|
|worker.annotations|额外注解|{}|
|worker.extraEnv|额外环境变量|[]|
|worker.extraVolumes|额外卷|[]|
|worker.extraVolumeMounts|额外卷挂载|[]|

##### Service 配置

|参数|说明|默认值|
|:----|:----|:----|
|service.master.type|Master Service 类型|ClusterIP|
|service.master.annotations|Master Service 注解|{}|
|service.masterExternal.enabled|启用外部 Master Service|false|
|service.masterExternal.type|外部 Service 类型|ClusterIP|
|service.masterExternal.annotations|外部 Service 注解|{}|
|service.masterExternal.nodePort|NodePort 配置|{}|
|service.masterExternal.loadBalancerIP|LoadBalancer IP|""|
|service.masterExternal.loadBalancerSourceRanges|LoadBalancer 源范围|[]|

##### Service Account & RBAC

|参数|说明|默认值|
|:----|:----|:----|
|serviceAccount.create|创建 Service Account|true|
|serviceAccount.name|Service Account 名称|"" (自动生成)|
|serviceAccount.annotations|Service Account 注解|{}|
|rbac.create|创建 RBAC 资源|true|

##### Curvine 配置

|参数|说明|默认值|
|:----|:----|:----|
|config.master.metaDir|Master 元数据目录|/opt/curvine/data/meta|
|config.journal.enable|启用日志|true|
|config.journal.journalDir|日志目录|/opt/curvine/data/journal|
|config.client.blockSizeStr|客户端块大小|64MB|
|config.log.level|日志级别（INFO/DEBUG/WARN/ERROR）|INFO|
|config.log.logDir|日志目录|/opt/curvine/logs|
|configOverrides.master|Master 配置覆盖|{}|
|configOverrides.journal|日志配置覆盖|{}|
|configOverrides.worker|Worker 配置覆盖|{}|
|configOverrides.client|客户端配置覆盖|{}|
|configOverrides.log|日志配置覆盖|{}|

完整的参数列表请参考 `values.yaml`。

##### 查看当前配置

```bash
# 查看所有当前值
helm get values curvine -n curvine

# 以 YAML 格式查看特定版本的值
helm get values curvine -n curvine -o yaml

# 查看渲染后的清单
helm get manifest curvine -n curvine

# 查看 Chart 的 values.yaml
cat ./curvine-runtime/values.yaml

# 查看特定参数
helm get values curvine -n curvine | grep master.replicas
```
##### 常见参数使用示例

###### 调整资源限制

```bash
# 为高负载场景增加 Master 资源
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set master.resources.requests.cpu=2000m \
  --set master.resources.requests.memory=4Gi \
  --set master.resources.limits.cpu=4000m \
  --set master.resources.limits.memory=8Gi
```
###### 配置节点亲和性

```bash
# 在特定节点上运行 Master
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set 'master.nodeSelector.node-type=master' \
  --set 'worker.nodeSelector.node-type=worker'
```
###### 启用 Worker 特权模式

```bash
# 默认已启用，但可根据需要禁用
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set worker.privileged=false
```
###### 为 Worker 配置多个数据目录

```bash
# 创建 values-multi-data.yaml，内容如下：
# worker:
#   storage:
#     dataDirs:
#       - name: "data1"
#         type: "SSD"
#         enabled: true
#         size: "100Gi"
#         storageClass: "fast-ssd"
#         mountPath: "/data/data1"
#       - name: "data2"
#         type: "HDD"
#         enabled: true
#         size: "500Gi"
#         storageClass: "slow-hdd"
#         mountPath: "/data/data2"

helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f values-multi-data.yaml
```
###### 调整日志级别

```bash
# 设置日志级别为 DEBUG 用于故障排查
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set config.log.level=DEBUG
```
###### 配置外部 Master Service

```bash
# 通过 LoadBalancer 暴露 Master Service
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set service.masterExternal.enabled=true \
  --set service.masterExternal.type=LoadBalancer
```
#### 配置示例

##### 开发环境（最小化）

```bash
# 从 Helm 仓库安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=1 \
  --set worker.replicas=1

# 从本地 Chart 安装（在 helm-charts 目录运行）
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f ./curvine-runtime/examples/values-dev.yaml
```
##### 生产环境（高可用）

```bash
# 从 Helm 仓库安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set master.storage.journal.storageClass=fast-ssd

# 从本地 Chart 安装（在 helm-charts 目录运行）
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f ./curvine-runtime/examples/values-prod.yaml
```
##### 裸机环境（使用 hostPath）

```bash
# 从本地 Chart 安装（在 helm-charts 目录运行）
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f ./curvine-runtime/examples/values-baremetal.yaml
```
##### 自定义配置

```bash
# 从 Helm 仓库安装
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].size=500Gi

# 从本地 Chart 安装（在 helm-charts 目录运行）
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].size=500Gi
```
#### 存储配置

##### 使用 PVC（推荐用于云环境）

```yaml
master:
  storage:
    meta:
      storageClass: "fast-ssd"
      size: "20Gi"
    journal:
      storageClass: "fast-ssd"
      size: "100Gi"

worker:
  storage:
    dataDirs:
      - name: "data1"
        type: "SSD"
        enabled: true
        size: "100Gi"
        storageClass: "fast-ssd"
        mountPath: "/data/data1"
```
##### 使用 hostPath（推荐用于裸机）

```yaml
master:
  storage:
    meta:
      storageClass: ""
      hostPath: "/mnt/curvine/master/meta"
    journal:
      storageClass: ""
      hostPath: "/mnt/curvine/master/journal"

worker:
  storage:
    dataDirs:
      - name: "data1"
        type: "SSD"
        enabled: true
        size: "100Gi"
        storageClass: ""
        hostPath: "/mnt/nvme0n1/curvine"
        mountPath: "/data/data1"
```
##### 使用 emptyDir（用于测试）

```yaml
master:
  storage:
    meta:
      storageClass: ""
      hostPath: ""
    journal:
      storageClass: ""
      hostPath: ""

worker:
  storage:
    dataDirs:
      - name: "data1"
        storageClass: ""
        hostPath: ""
```
##### 存储配置示例

###### 使用默认 PVC 快速启动

```bash
# 使用默认存储类（最快的启动方式）
helm install curvine ./curvine-runtime -n curvine --create-namespace
```
###### 云环境配置快速 SSD

```bash
# AWS/GCP/Azure 快速 SSD 存储
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set master.storage.meta.storageClass=fast-ssd \
  --set master.storage.journal.storageClass=fast-ssd \
  --set 'worker.storage.dataDirs[0].storageClass=fast-ssd' \
  --set 'worker.storage.dataDirs[0].size=500Gi'
```
###### 裸机多存储类型配置

```bash
# 创建 values-baremetal-multi.yaml：
# master:
#   storage:
#     meta:
#       storageClass: ""
#       hostPath: "/mnt/nvme/master/meta"
#     journal:
#       storageClass: ""
#       hostPath: "/mnt/nvme/master/journal"
# 
# worker:
#   storage:
#     dataDirs:
#       - name: "nvme"
#         type: "SSD"
#         enabled: true
#         size: "200Gi"
#         storageClass: ""
#         hostPath: "/mnt/nvme/worker"
#         mountPath: "/data/nvme"
#       - name: "ssd"
#         type: "SSD"
#         enabled: true
#         size: "500Gi"
#         storageClass: ""
#         hostPath: "/mnt/ssd/worker"
#         mountPath: "/data/ssd"
#       - name: "hdd"
#         type: "HDD"
#         enabled: true
#         size: "2000Gi"
#         storageClass: ""
#         hostPath: "/mnt/hdd/worker"
#         mountPath: "/data/hdd"

helm install curvine ./curvine-runtime -n curvine --create-namespace \
  -f values-baremetal-multi.yaml
```
###### 混合云和本地存储

```bash
# Master 使用云 PVC，Worker 使用本地 hostPath
helm install curvine ./curvine-runtime -n curvine --create-namespace \
  --set master.storage.meta.storageClass=cloud-ssd \
  --set master.storage.journal.storageClass=cloud-ssd \
  --set 'worker.storage.dataDirs[0].storageClass=""' \
  --set 'worker.storage.dataDirs[0].hostPath=/mnt/local/data'
```
#### 升级

##### 更新配置

```bash
# 扩展 Worker 副本数（从 Helm 仓库）
helm upgrade curvine curvine/curvine -n curvine --devel \
  --set worker.replicas=15

# 升级镜像版本（从 Helm 仓库）
helm upgrade curvine curvine/curvine -n curvine --devel \
  --set image.tag=v1.1.0

# 使用新 values 文件升级（从本地 Chart，在 helm-charts 目录运行）
helm upgrade curvine ./curvine-runtime -n curvine \
  -f ./curvine-runtime/values-new.yaml
```
>**注意**：
>1.升级期间无法修改 Master 副本数和日志存储类。要修改请删除并重新部署集群。
>2.升级期间没有修改的参数会被重设为默认配置。如果在安装时修改了 Master 副本数和日志存储类，需要在更新时带上这两个参数。
##### 常见升级场景

###### 扩展 Worker 节点

```bash
# 将 Worker 副本数从 3 增加到 10
helm upgrade curvine ./curvine-runtime -n curvine \
  --set worker.replicas=10
```
###### 增加资源限制

```bash
# 提升 Master 资源以获得更好的性能
helm upgrade curvine ./curvine-runtime -n curvine \
  --set master.resources.limits.cpu=4000m \
  --set master.resources.limits.memory=8Gi
```
###### 更新镜像版本

```bash
# 升级到新的 Curvine 版本
helm upgrade curvine ./curvine-runtime -n curvine \
  --set image.tag=v1.2.0
```
###### 启用调试日志

```bash
# 临时启用调试日志用于故障排查
helm upgrade curvine ./curvine-runtime -n curvine \
  --set config.log.level=DEBUG
```
###### 更改存储配置

```bash
# 迁移到更快的存储类
helm upgrade curvine ./curvine-runtime -n curvine \
  --set master.storage.meta.storageClass=ultra-ssd \
  --set master.storage.journal.storageClass=ultra-ssd
```
##### 查看发布历史

```bash
helm history curvine -n curvine
```
##### 回滚

```bash
# 回滚到上一个版本
helm rollback curvine -n curvine

# 回滚到特定版本
helm rollback curvine 2 -n curvine
```
#### 卸载

```bash
# 卸载 Chart（保留 PVC）
helm uninstall curvine -n curvine

# 删除 PersistentVolumeClaims
kubectl delete pvc -n curvine -l app.kubernetes.io/instance=curvine

# 删除命名空间
kubectl delete namespace curvine
```
#### 故障排查

##### 检查 Pod 状态

```bash
kubectl get pods -n curvine
kubectl describe pod <pod-name> -n curvine
kubectl logs <pod-name> -n curvine
```
##### 查看 ConfigMap

```bash
kubectl get configmap -n curvine
kubectl describe configmap curvine-config -n curvine
```
##### 查看事件

```bash
kubectl get events -n curvine --sort-by='.lastTimestamp'
```
##### 常见问题

1. **Master 副本验证失败**

   1. 错误：`master.replicas must be an odd number`

   2. 解决方案：确保 Master 副本数为奇数（1, 3, 5, 7…）

2. **PVC 无法绑定**

   1. 检查 StorageClass 是否存在

   2. 验证 PV 供应器是否正常工作

3. **Pod 启动失败**

   1. 验证容器镜像是否存在

   2. 检查资源配额是否充足

   3. 查看 Pod 日志了解详情

### 镜像部署
代码编译完成后，将编译好的zip包复制到`curvine-docker/deploy`目录下，执行如下命令构建镜像：
```
# 默认的镜像名称为：curinve:latest
sh build-img.sh 

#查看编译的镜像
docker images| curvine
```

启动服务：
```
# 启动一个测试master、worker
docker run -d \
--name curvine-cluster \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 -p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh all start 

# 启动master
docker run -d \
--name curvine-cluster \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 -p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh master start 

# 启动worker
docker run -d \
--name curvine-cluster \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 -p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh worker start 
```

### 指标收集
master、worker会通过http接口暴露监控指标，可以在prometheus采集这些指标，然后通过grafana可视化这些指标。

master指标：http://URL_ADDRESS:9000/metrics    
worker指标：http://URL_ADDRESS:9001/metrics


