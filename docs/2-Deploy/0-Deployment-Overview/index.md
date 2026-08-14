---
sidebar_position: 0
---

# Deployment Overview

This chapter separates cluster installation from optional services. Deploy and
verify the Curvine Master and Workers first. Add the Transfer service only when
Load or Export jobs should run outside the Master process.

## Deployment Sequence

1. Choose a cluster form.
   - Use [Quick Start](../1-quick-start.md) for a local evaluation.
   - Use [Standalone Mode](../2-Deploy-Curvine-Cluster/2-Standalone-Mode.md) for a
     single-host cluster.
   - Use [bare metal](../2-Deploy-Curvine-Cluster/3-Distributed-Mode/02-Bare-Metal-Deployment.md)
     or [Kubernetes](../2-Deploy-Curvine-Cluster/3-Distributed-Mode/01-k8s-Deployment.md)
     for a distributed cluster.
2. Verify that Master and Worker processes are healthy and that required UFS
   mounts can be listed with `cv mount --check`.
3. If the cluster needs independent Load and Export scheduling, deploy the
   [Transfer Service](../3-Transfer-Service/0-Overview.md).
4. Enable Transfer only in the clients that should use it. Existing clients can
   continue to use the legacy Master job path during a staged rollout.

## Documentation Boundaries

- Cluster deployment pages describe Master, Worker, storage, and networking.
- Transfer pages describe the independent scheduler, its state store, and
  client routing.
- The [configuration reference](../2-Deploy-Curvine-Cluster/3-Distributed-Mode/03-conf.md)
  is the single source for configuration defaults. Deployment pages show only
  the settings required for each topology.

## Production Changes

Treat upgrades as a separate operation. Verify version compatibility and
configuration changes in a non-production cluster before changing the running
cluster. For Transfer, use a shared MySQL store before running more than one
instance.
