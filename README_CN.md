[![Version](https://img.shields.io/npm/v/@xgent-ai/gomad?color=blue&label=version)](https://www.npmjs.com/package/@xgent-ai/gomad)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

GoMad（GOMAD Orchestration Method for Agile Development）是一个面向 AI 驱动软件
开发的智能体工作流框架。它通过专业智能体和基于技能的工作流，引导你完成
分析 → 规划 → 方案 → 实施的结构化流程。

## 什么是 GoMad

GoMad 把 AI 智能体视为结构化敏捷流程中的专家协作者。它不是让 AI 替你"思考"，
而是通过分阶段的工作流，把你与模型的协作引导到更高质量的产出上。

- **结构化工作流** —— 分析、规划、方案、实施四个阶段依序推进
- **专业角色智能体** —— 覆盖规划、架构、开发和评审等领域的专家角色
- **规模自适应** —— 按项目复杂度调整规划深度，从小修小补到较大系统都能适配
- **技能化架构** —— 每个工作流阶段下都有可组合的技能
- **完整生命周期** —— 从初始分析到最终交付

## 快速开始

**先决条件**：[Node.js](https://nodejs.org) v20+ · [Python](https://www.python.org) 3.10+（可选）· [uv](https://docs.astral.sh/uv/)（可选）

```bash
npx @xgent-ai/gomad install
```

按照安装程序提示操作，然后在项目文件夹中打开你的 AI IDE（Claude Code、Cursor 等）。

**非交互式安装**（用于 CI/CD）：

```bash
npx @xgent-ai/gomad install --directory /path/to/project --modules gomad --tools claude-code --yes
```

## 文档

[GoMad 文档站点](https://gomad.xgent.ai) —— 教程、指南、概念和参考（站点部署待定；当前文档位于本仓库的 [`docs/`](docs/) 目录）。

## 贡献

欢迎贡献。请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

## 许可证

MIT 许可证 —— 详见 [LICENSE](LICENSE)。

## Credits

GoMad 是 BMAD Method 的硬分叉（a hard fork of BMAD Method，[bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)），原作者 Brian (BMad) Madison 及其贡献者。BMAD Method 采用 MIT 许可证发布；原始版权声明和许可证条款完整保留于 [LICENSE](LICENSE) 文件。

xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC.
BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and are
referenced here solely for attribution purposes.

（中文译文，仅供参考：xgent-ai 与 BMad Code, LLC 之间不存在任何隶属、背书或
赞助关系。BMad™、BMad Method™ 和 BMad Core™ 均为 BMad Code, LLC 的商标，在本
文件中仅用于归属目的。）

发布说明见 [CHANGELOG.md](CHANGELOG.md)，包含 v1.1.0 的分叉理由和相对
`@xgent-ai/gomad@1.0.0` 的破坏性变更。
