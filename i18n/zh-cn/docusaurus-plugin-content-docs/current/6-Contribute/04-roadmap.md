# Curvine 路线图

本页只保留参考仓库中能够直接确认的路线图信息。

旧的 2025 里程碑表已经不再与当前参考仓库状态一致。当前仓库顶层 `README.md` 给出的做法，是把路线图入口指向一个名为 `Roadmap 2026` 的 GitHub Discussion，而不是在仓库内维护一份带发布日期的计划表。

## 在哪里关注规划

- `README.md` 中当前的路线图链接
- GitHub Issues：跟踪具体实现任务
- GitHub Discussions：讨论路线图与设计方向

## 当前仓库可见的贡献方向

| 方向 | 当前仓库位置 |
|------|--------------|
| 核心运行时与 RPC | `orpc/`、`curvine-common/`、`curvine-server/`、`curvine-client/` |
| FUSE 与命令行工具 | `curvine-fuse/`、`curvine-cli/` |
| 存储后端与数据访问 | `curvine-ufs/`、`curvine-s3-gateway/`、`curvine-libsdk/` |
| Web 与管理面 | `curvine-web/` |
| 测试、压测与回归工具 | `curvine-tests/`、`build/tests/`、`curvine-tests/benchmark/` |
| Kubernetes 与打包资源 | `curvine-csi/`、`curvine-docker/` |

## 对贡献者的规划建议

- 以当前仓库目录、构建脚本和测试覆盖面为准，而不是沿用过时的里程碑表。
- 顶层目录只能说明当前存在相关工作面，不代表具体发布日期承诺。
- 对于参考仓库中没有明确落地的存储或协议能力，不要在文档里继续扩写未发布承诺。

## 如何参与

- 如果已有对应任务，直接在 GitHub Issues 中参与讨论。
- 如果是更宽泛的方向建议，优先在 GitHub Discussions 中提出。
- 更新文档时，确保命令、构建产物和功能描述都与参考仓库当前实际可见的状态一致。
