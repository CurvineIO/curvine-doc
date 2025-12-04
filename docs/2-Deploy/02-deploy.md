---
sidebar_position: 1
---

# Deploy Curvine Cluster

Curvine has excellent cross-platform capabilities and supports running on various operating systems across almost all mainstream architectures, including but not limited to Linux, macOS, Windows, etc. It supports different CPU architectures such as arm64, x86_64, etc.

Here are the recommended operating system versions:
- Linux: `Rocky` >= 9, `CentOS` >= 7, `Ubuntu` > 22.04
- macOS
- Windows

**Supported Distributions**
| Operating System | Kernel Requirement | Tested Version | Dependencies |
| --- | --- | --- | --- |
| CentOS 7 | ≥3.10.0 | 7.6 | fuse2-2.9.2 |
| CentOS 8 | ≥4.18.0 | 8.5 | fuse3-3.9.1 |
| Rocky Linux 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| RHEL 9 | ≥5.14.0 | 9.5 | fuse3-3.10.2 |
| Ubuntu 22 | ≥5.15.0 | 22.4 | fuse3-3.10.5 |

### Resource Requirements

Curvine has no minimum resource requirements and can support extremely high concurrency and traffic with very small resources. Here is a reference configuration:
- CPU: 2 cores
- Memory: 4GB
- Network: 10Gbps
- SSD disk: 1 unit

Based on this reference, you can extrapolate other hardware resource requirements from one resource value.
For example, if you have 2 SSD disks, you would need 4 CPU cores, 8GB memory, and 20Gbps bandwidth. 4GB memory is also acceptable, depending on business concurrency - if concurrency is not high, memory doesn't need to be increased.

:::warning
This is for reference only. Actual requirements depend on your specific business needs.
:::

## Deployment

### Build From Source

Compile the software installation package. For compilation instructions, refer to [Quick Start](01-quick-start.md).

Execute the following command to create an installation package:
```bash
sh build/build.sh -r zip
```
After successful compilation, a `curvine.zip` file will be generated in the `build/dist` directory. This file is the Curvine installation package that can be used for deployment or building images.

### Configuration File Modification

The environment variable configuration file is located at `config/env.sh`. This file is a bash script used to configure Curvine's environment variables.
The environment variable that needs to be modified is `LOCAL_HOSTNAME`, which is very important as it specifies the hostname for Curvine. The Curvine cluster relies on it to identify cluster members.
It's recommended to set it to the local hostname:
```bash
export LOCAL_HOSTNAME=$(hostname)
```

Curvine's configuration file is located at `config/curvine.toml`. This is a TOML format configuration file containing various Curvine configurations. The configurations that typically need modification are:
1. Configure master node addresses
2. Configure worker storage directories

Here's an example configuration:
```toml
format_master = false
format_worker = false

[master]
# Configure metadata storage directory
meta_dir = "data/meta"

# Configure master log directory
log = { level = "info", log_dir = "logs", file_name = "master.log" }

[journal]
# Configure raft master node list. hostname must match LOCAL_HOSTNAME environment variable, otherwise master nodes cannot be identified.
# id must be an integer and cannot be duplicated. port is the master raft port, default is 8996
journal_addrs = [
    {id = 1, hostname = "master1", port = 8996},
    {id = 2, hostname = "master2", port = 8996},
    {id = 3, hostname = "master3", port = 8996}
]

# Configure raft log storage directory
journal_dir = "testing/journal"

[worker]
# Reserved space, default is 0
dir_reserved = "0"

# Configure worker storage directories
data_dir = [
    "[SSD]/data/data1",
    "[SSD]/data/data2"
]

# Configure worker logs
log = { level = "info", log_dir = "logs", file_name = "worker.log" }

[client]
# Configure master addresses, port is master RPC port, default is 8995
master_addrs = [
    { hostname = "master1", port = 8995 },
    { hostname = "master2", port = 8995 },
    { hostname = "master3", port = 8995 },
]

# Client log configuration
[log]
level = "info"
log_dir = "logs"
file_name = "curvine.log"
```

If you need to use the Java Hadoop client, modify the `fs.cv.master_addrs` value in `curvine-site.xml`, example:
```xml
<property>
    <name>fs.cv.master_addrs</name>
    <value>master1:8995,master2:8995,master3:8995</value>
</property>
```

### Non-Container Deployment

Non-container deployment requires manually starting Curvine master and worker. The startup commands are:
```bash
# Start master
bin/curvine-master.sh start

# Start worker
bin/curvine-worker.sh start

# FUSE mount
bin/curvine-fuse.sh start
```

### k8s Deployment
Deploy Curvine distributed storage cluster on Kubernetes using production-grade Helm Chart.

#### Features

* **One-click Deployment**: Deploy complete Curvine cluster with single Helm command

* **Dynamic Configuration**: Automatically generate journal_addrs and master_addrs

* **Flexible Storage**: Support PVC, hostPath, and emptyDir storage modes

* **High Availability**: Support odd number of Master replicas with Raft consensus mechanism

* **Hot Configuration Updates**: ConfigMap changes automatically trigger Pod rolling updates

* **Production Ready**: Built-in resource limits, health checks, and RBAC

* **Master Replica Protection**: Prevent accidental modification of Master replica count during upgrades

#### Prerequisites

* Kubernetes 1.20+

* Helm 3.0+

* PV provisioner (if using PVC storage)

#### Quick Start

##### 1. Add Helm Repository (Optional)

```bash
# If Chart is published to repository
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update
```

##### 2. Install Chart

###### Option A: Install from Helm Repository (Recommended)

>**Note**: The current Helm version provided is based on the main branch and is intended for pre-release use only. To install, you must specify the --devel flag

```bash
# Install with default configuration
helm install curvine curvine/curvine -n curvine --create-namespace --devel

# Install with custom replica count
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10

# Install with custom values file
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  -f https://curvineio.github.io/helm/charts/examples/values-prod.yaml
```

###### Option B: Install from Local Chart

>**Note**: Run these commands from the `helm-charts` directory (parent directory of `helm` folder)

```bash
# Install with default configuration
helm install curvine ./helm -n curvine --create-namespace

# Install with custom replica count
helm install curvine ./helm -n curvine --create-namespace \
  --set master.replicas=5 \
  --set worker.replicas=10

# Install with custom values file
helm install curvine ./helm -n curvine --create-namespace \
  -f ./helm/examples/values-prod.yaml
```

##### 3. Verify Deployment

```bash
# Check Pod status
kubectl get pods -n curvine

# View Services
kubectl get svc -n curvine

# View PersistentVolumeClaims
kubectl get pvc -n curvine

# Run Helm tests
helm test curvine -n curvine
```

##### 4. Access Cluster

```bash
# Port forward to access Master Web UI
kubectl port-forward -n curvine svc/curvine-master 9000:9000

# Access http://localhost:9000
```

#### Configuration

##### Global Parameters

|Parameter|Description|Default Value|
|:----|:----|:----|
|global.clusterDomain|Kubernetes cluster domain|cluster.local|

##### Cluster Parameters

|Parameter|Description|Default Value|
|:----|:----|:----|
|cluster.id|Cluster identifier|curvine|
|cluster.formatMaster|Format Master data on startup|false|
|cluster.formatWorker|Format Worker data on startup|false|
|cluster.formatJournal|Format journal data on startup|false|

##### Image Configuration

|Parameter|Description|Default Value|
|:----|:----|:----|
|image.repository|Container image repository|docker.io/curvine|
|image.tag|Container image tag|latest|
|image.pullPolicy|Image pull policy|IfNotPresent|
|image.pullSecrets|Image pull secrets|[]|

##### Master Configuration

|Parameter|Description|Default Value|
|:----|:----|:----|
|master.replicas|Master replica count (must be odd: 1, 3, 5, 7...)|3|
|master.rpcPort|RPC port|8995|
|master.journalPort|Journal/Raft port|8996|
|master.webPort|Web UI port|9000|
|master.web1Port|Additional Web port|9001|
|master.storage.meta.enabled|Enable metadata storage|true|
|master.storage.meta.storageClass|Metadata storage class|"" (default)|
|master.storage.meta.size|Metadata storage size|10Gi|
|master.storage.meta.hostPath|Metadata host path (used when no storageClass)|""|
|master.storage.meta.mountPath|Metadata mount path|/opt/curvine/data/meta|
|master.storage.journal.enabled|Enable journal storage|true|
|master.storage.journal.storageClass|Journal storage class|"" (default)|
|master.storage.journal.size|Journal storage size|50Gi|
|master.storage.journal.hostPath|Journal host path (used when no storageClass)|""|
|master.storage.journal.mountPath|Journal mount path|/opt/curvine/data/journal|
|master.resources.requests.cpu|CPU request|1000m|
|master.resources.requests.memory|Memory request|2Gi|
|master.resources.limits.cpu|CPU limit|2000m|
|master.resources.limits.memory|Memory limit|4Gi|
|master.nodeSelector|Node selector labels|{}|
|master.tolerations|Pod tolerations|[]|
|master.affinity|Pod affinity rules|{}|
|master.labels|Additional labels|{}|
|master.annotations|Additional annotations|{}|
|master.extraEnv|Additional environment variables|[]|
|master.extraVolumes|Additional volumes|[]|
|master.extraVolumeMounts|Additional volume mounts|[]|

##### Worker Configuration

|Parameter|Description|Default Value|
|:----|:----|:----|
|worker.replicas|Worker replica count|3|
|worker.rpcPort|RPC port|8997|
|worker.webPort|Web UI port|9001|
|worker.hostNetwork|Use host network|false|
|worker.dnsPolicy|DNS policy|ClusterFirst|
|worker.privileged|Privileged mode (required for FUSE)|true|
|worker.storage.dataDirs[0].name|Data directory name|data1|
|worker.storage.dataDirs[0].type|Storage type (SSD/HDD)|SSD|
|worker.storage.dataDirs[0].enabled|Enable data directory|true|
|worker.storage.dataDirs[0].size|Data directory size|10Gi|
|worker.storage.dataDirs[0].storageClass|Storage class|"" (default)|
|worker.storage.dataDirs[0].hostPath|Host path (used when no storageClass)|""|
|worker.storage.dataDirs[0].mountPath|Mount path|/data/data1|
|worker.resources.requests.cpu|CPU request|2000m|
|worker.resources.requests.memory|Memory request|4Gi|
|worker.resources.limits.cpu|CPU limit|4000m|
|worker.resources.limits.memory|Memory limit|8Gi|
|worker.nodeSelector|Node selector labels|{}|
|worker.tolerations|Pod tolerations|[]|
|worker.antiAffinity.enabled|Enable Pod anti-affinity|true|
|worker.antiAffinity.type|Anti-affinity type (required/preferred)|preferred|
|worker.labels|Additional labels|{}|
|worker.annotations|Additional annotations|{}|
|worker.extraEnv|Additional environment variables|[]|
|worker.extraVolumes|Additional volumes|[]|
|worker.extraVolumeMounts|Additional volume mounts|[]|

##### Service Configuration

|Parameter|Description|Default Value|
|:----|:----|:----|
|service.master.type|Master Service type|ClusterIP|
|service.master.annotations|Master Service annotations|{}|
|service.masterExternal.enabled|Enable external Master Service|false|
|service.masterExternal.type|External Service type|ClusterIP|
|service.masterExternal.annotations|External Service annotations|{}|
|service.masterExternal.nodePort|NodePort configuration|{}|
|service.masterExternal.loadBalancerIP|LoadBalancer IP|""|
|service.masterExternal.loadBalancerSourceRanges|LoadBalancer source ranges|[]|

##### Service Account & RBAC

|Parameter|Description|Default Value|
|:----|:----|:----|
|serviceAccount.create|Create Service Account|true|
|serviceAccount.name|Service Account name|"" (auto-generated)|
|serviceAccount.annotations|Service Account annotations|{}|
|rbac.create|Create RBAC resources|true|

##### Curvine Configuration

|Parameter|Description|Default Value|
|:----|:----|:----|
|config.master.metaDir|Master metadata directory|/opt/curvine/data/meta|
|config.journal.enable|Enable journal|true|
|config.journal.journalDir|Journal directory|/opt/curvine/data/journal|
|config.client.blockSizeStr|Client block size|64MB|
|config.log.level|Log level (INFO/DEBUG/WARN/ERROR)|INFO|
|config.log.logDir|Log directory|/opt/curvine/logs|
|configOverrides.master|Master configuration override|{}|
|configOverrides.journal|Journal configuration override|{}|
|configOverrides.worker|Worker configuration override|{}|
|configOverrides.client|Client configuration override|{}|
|configOverrides.log|Log configuration override|{}|

For the complete parameter list, please refer to `values.yaml`.

##### View Current Configuration

```bash
# View all current values
helm get values curvine -n curvine

# View specific version values in YAML format
helm get values curvine -n curvine -o yaml

# View rendered manifests
helm get manifest curvine -n curvine

# View Chart's values.yaml
cat ./helm/values.yaml

# View specific parameters
helm get values curvine -n curvine | grep master.replicas
```

##### Common Parameter Usage Examples

###### Adjust Resource Limits

```bash
# Increase Master resources for high-load scenarios
helm install curvine ./helm -n curvine --create-namespace \
  --set master.resources.requests.cpu=2000m \
  --set master.resources.requests.memory=4Gi \
  --set master.resources.limits.cpu=4000m \
  --set master.resources.limits.memory=8Gi
```

###### Configure Node Affinity

```bash
# Run Master on specific nodes
helm install curvine ./helm -n curvine --create-namespace \
  --set 'master.nodeSelector.node-type=master' \
  --set 'worker.nodeSelector.node-type=worker'
```

###### Enable Worker Privileged Mode

```bash
# Enabled by default, but can be disabled if needed
helm install curvine ./helm -n curvine --create-namespace \
  --set worker.privileged=false
```

###### Configure Multiple Data Directories for Worker

```bash
# Create values-multi-data.yaml with the following content:
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

helm install curvine ./helm -n curvine --create-namespace \
  -f values-multi-data.yaml
```

###### Adjust Log Level

```bash
# Set log level to DEBUG for troubleshooting
helm install curvine ./helm -n curvine --create-namespace \
  --set config.log.level=DEBUG
```

###### Configure External Master Service

```bash
# Expose Master Service via LoadBalancer
helm install curvine ./helm -n curvine --create-namespace \
  --set service.masterExternal.enabled=true \
  --set service.masterExternal.type=LoadBalancer
```

#### Configuration Examples

##### Development Environment (Minimal)

```bash
# Install from Helm repository
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=1 \
  --set worker.replicas=1

# Install from local Chart (run in helm-charts directory)
helm install curvine ./helm -n curvine --create-namespace \
  -f ./helm/examples/values-dev.yaml
```

##### Production Environment (High Availability)

```bash
# Install from Helm repository
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set master.storage.journal.storageClass=fast-ssd

# Install from local Chart (run in helm-charts directory)
helm install curvine ./helm -n curvine --create-namespace \
  -f ./helm/examples/values-prod.yaml
```

##### Bare Metal Environment (Using hostPath)

```bash
# Install from local Chart (run in helm-charts directory)
helm install curvine ./helm -n curvine --create-namespace \
  -f ./helm/examples/values-baremetal.yaml
```

##### Custom Configuration

```bash
# Install from Helm repository
helm install curvine curvine/curvine -n curvine --create-namespace --devel \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].size=500Gi

# Install from local Chart (run in helm-charts directory)
helm install curvine ./helm -n curvine --create-namespace \
  --set master.replicas=5 \
  --set worker.replicas=10 \
  --set master.storage.meta.storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].storageClass=fast-ssd \
  --set worker.storage.dataDirs[0].size=500Gi
```

#### Storage Configuration

##### Using PVC (Recommended for Cloud Environments)

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

##### Using hostPath (Recommended for Bare Metal)

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

##### Using emptyDir (For Testing)

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

##### Storage Configuration Examples

###### Quick Start with Default PVC

```bash
# Use default storage class (fastest startup method)
helm install curvine ./helm -n curvine --create-namespace
```

###### Cloud Environment Fast SSD Configuration

```bash
# AWS/GCP/Azure fast SSD storage
helm install curvine ./helm -n curvine --create-namespace \
  --set master.storage.meta.storageClass=fast-ssd \
  --set master.storage.journal.storageClass=fast-ssd \
  --set 'worker.storage.dataDirs[0].storageClass=fast-ssd' \
  --set 'worker.storage.dataDirs[0].size=500Gi'
```

###### Bare Metal Multi-Storage Type Configuration

```bash
# Create values-baremetal-multi.yaml:
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

helm install curvine ./helm -n curvine --create-namespace \
  -f values-baremetal-multi.yaml
```

###### Hybrid Cloud and Local Storage

```bash
# Master uses cloud PVC, Worker uses local hostPath
helm install curvine ./helm -n curvine --create-namespace \
  --set master.storage.meta.storageClass=cloud-ssd \
  --set master.storage.journal.storageClass=cloud-ssd \
  --set 'worker.storage.dataDirs[0].storageClass=""' \
  --set 'worker.storage.dataDirs[0].hostPath=/mnt/local/data'
```

#### Upgrade

##### Update Configuration

```bash
# Scale Worker replicas (from Helm repository)
helm upgrade curvine curvine/curvine -n curvine --devel \
  --set worker.replicas=15

# Upgrade image version (from Helm repository)
helm upgrade curvine curvine/curvine -n curvine --devel \
  --set image.tag=v1.1.0

# Upgrade with new values file (from local Chart, run in helm-charts directory)
helm upgrade curvine ./helm -n curvine \
  -f ./helm/values-new.yaml
```

>**Note**:
>1. Master replica count and journal storage class cannot be modified during upgrades. To modify, delete and redeploy the cluster.
>2. Parameters not modified during upgrade will be reset to default configuration. If Master replica count and journal storage class were modified during installation, these two parameters need to be included during updates.

##### Common Upgrade Scenarios

###### Scale Worker Nodes

```bash
# Increase Worker replicas from 3 to 10
helm upgrade curvine ./helm -n curvine \
  --set worker.replicas=10
```

###### Increase Resource Limits

```bash
# Increase Master resources for better performance
helm upgrade curvine ./helm -n curvine \
  --set master.resources.limits.cpu=4000m \
  --set master.resources.limits.memory=8Gi
```

###### Update Image Version

```bash
# Upgrade to new Curvine version
helm upgrade curvine ./helm -n curvine \
  --set image.tag=v1.2.0
```

###### Enable Debug Logging

```bash
# Temporarily enable debug logging for troubleshooting
helm upgrade curvine ./helm -n curvine \
  --set config.log.level=DEBUG
```

###### Change Storage Configuration

```bash
# Migrate to faster storage class
helm upgrade curvine ./helm -n curvine \
  --set master.storage.meta.storageClass=ultra-ssd \
  --set master.storage.journal.storageClass=ultra-ssd
```

##### View Release History

```bash
helm history curvine -n curvine
```

##### Rollback

```bash
# Rollback to previous version
helm rollback curvine -n curvine

# Rollback to specific version
helm rollback curvine 2 -n curvine
```

#### Uninstall

```bash
# Uninstall Chart (keep PVC)
helm uninstall curvine -n curvine

# Delete PersistentVolumeClaims
kubectl delete pvc -n curvine -l app.kubernetes.io/instance=curvine

# Delete namespace
kubectl delete namespace curvine
```

#### Troubleshooting

##### Check Pod Status

```bash
kubectl get pods -n curvine
kubectl describe pod <pod-name> -n curvine
kubectl logs <pod-name> -n curvine
```

##### View ConfigMap

```bash
kubectl get configmap -n curvine
kubectl describe configmap curvine-config -n curvine
```

##### View Events

```bash
kubectl get events -n curvine --sort-by='.lastTimestamp'
```

##### Common Issues

1. **Master Replica Validation Failed**

   1. Error: `master.replicas must be an odd number`

   2. Solution: Ensure Master replica count is odd (1, 3, 5, 7...)

2. **PVC Cannot Bind**

   1. Check if StorageClass exists

   2. Verify PV provisioner is working properly

3. **Pod Startup Failed**

   1. Verify container image exists

   2. Check if resource quotas are sufficient

   3. View Pod logs for details

### Container Deployment

After code compilation is complete, copy the compiled zip package to the `curvine-docker/deploy` directory and execute the following command to build the image:
```bash
# Default image name: curvine:latest
sh build-img.sh

# View the compiled image
docker images | grep curvine
```

Start services:
```bash
# Start a test master and worker
docker run -d \
--name curvine-cluster \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 -p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh all start

# Start master
docker run -d \
--name curvine-master \
-p 8995:8995 -p 8996:8996 -p 8997:8997 -p 9000:9000 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh master start

# Start worker
docker run -d \
--name curvine-worker \
-p 9001:9001 \
localhost/curvine:latest \
/bin/sh /entrypoint.sh worker start
```

### Metrics Collection

Master and worker expose monitoring metrics through HTTP interfaces. These metrics can be collected by Prometheus and visualized through Grafana.

- Master metrics: `http://URL_ADDRESS:9000/metrics`
- Worker metrics: `http://URL_ADDRESS:9001/metrics`
