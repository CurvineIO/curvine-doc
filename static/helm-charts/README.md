# Helm Charts Repository

This directory contains the Helm charts repository for Curvine.

## Structure

```
helm-charts/
├── index.yaml          # Helm repository index file
├── charts/             # Directory containing packaged chart files (.tgz)
└── README.md          # This file
```

## Usage

To add this repository to your Helm client:

```bash
helm repo add curvine https://curvineio.github.io/helm-charts
helm repo update
```

Then you can install charts from this repository:

```bash
helm install <release-name> curvine/<chart-name>
```