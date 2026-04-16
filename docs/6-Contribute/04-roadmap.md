# Curvine Roadmap

This page intentionally tracks only roadmap information that is visible in the reference repository.

The old in-tree 2025 milestone table is not aligned with the current reference state. In the current repository, the top-level `README.md` points readers to a GitHub discussion labeled `Roadmap 2026` instead of maintaining a dated release plan inside the repo.

## Where to Follow Planning

- `README.md` for the current roadmap link
- GitHub Issues for scoped implementation tasks
- GitHub Discussions for roadmap and design discussion

## Contribution Areas Visible in the Repository Today

| Area | Current repo surface |
|------|----------------------|
| Core runtime and RPC | `orpc/`, `curvine-common/`, `curvine-server/`, `curvine-client/` |
| FUSE and CLI | `curvine-fuse/`, `curvine-cli/` |
| Storage backends and data access | `curvine-ufs/`, `curvine-s3-gateway/`, `curvine-libsdk/` |
| Web and management surfaces | `curvine-web/` |
| Tests, benchmarks, and regression tooling | `curvine-tests/`, `build/tests/`, `curvine-tests/benchmark/` |
| Kubernetes and packaging assets | `curvine-csi/`, `curvine-docker/` |

## Planning Guidance for Contributors

- Prefer the current repository tree, build scripts, and tests over old milestone tables.
- Treat top-level directories as evidence of active work areas, not as guarantees of release timing.
- Avoid repeating unpublished storage or protocol promises that are not backed by the reference repository state.

## Getting Involved

- Comment on relevant GitHub Issues if a task already exists.
- Use GitHub Discussions for broader proposals or roadmap suggestions.
- When sending doc updates, keep commands and feature descriptions tied to what the reference repo actually builds, ships, and tests.
