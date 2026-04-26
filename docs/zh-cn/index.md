---
title: GoMad
description: 面向 AI 驱动敏捷开发的智能体工作流框架——固定的智能体角色、可组合的技能，以及把它们安装进 AI IDE 的安装器。
---

GoMad 是一个面向 AI 驱动敏捷开发的智能体工作流框架。它提供 8 个固定的智能体角色、一套可组合的技能库，以及一个把它们布置到 AI IDE 中的安装器，帮助你按"分析 → 规划 → 方案 → 实施"四阶段推进项目，而不必手写一堆提示词。

## 什么是 GoMad

GoMad 是 [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) 的精简、署名清晰的硬分叉（hard fork），由我们自己端到端维护。它把四阶段敏捷工作流压缩成一个小而稳定的接口：每个阶段对应一组 `gm-*` 技能，智能体调用这些技能，安装器把它们复制到 IDE 已经能读取的目录里。

8 个 `gm-agent-*` 角色覆盖软件交付中常见的岗位——analyst（分析师）、tech-writer（技术作者）、pm（产品经理）、ux-designer（UX 设计师）、architect（架构师）、scrum-master（Scrum Master）、dev（开发）和 solo-dev（独立开发）。在 IDE 中以 `/gm:agent-*` 斜杠命令调用，运行时从安装目录加载角色正文。

GoMad 通过 npm 以 `@xgent-ai/gomad` 名称发布，在 BMAD 原始技术栈之上不引入任何新的运行时依赖。安装器采用 copy-only 模式，支持基于清单（manifest）的升级清理、`--dry-run` 预览，以及带时间戳的备份快照。

## 快速上手

最快的路径是按安装教程操作：运行交互式安装器，并把它指向你的项目。

- [安装 GoMad](./tutorials/install.md) —— 端到端的安装演练。
- [快速开始](./tutorials/quick-start.md) —— 安装完成后运行你的第一个 GoMad 工作流。

## 浏览文档

文档遵循 [Diataxis](https://diataxis.fr/) 结构。请按你的目标挑选板块。

- [Agents 参考](./reference/agents.md) —— 8 个 `gm-agent-*` 角色及其调用方式。
- [Skills 参考](./reference/skills.md) —— 每个智能体可调用的 `gm-*` 技能目录。
- [架构说明](./explanation/architecture.md) —— 智能体、技能与安装器如何协同工作。
- [参与贡献](./how-to/contributing.md) —— 如何向 GoMad 仓库提交改动。

## 项目状态

GoMad 当前处于 v1.3 里程碑（文档站、故事上下文技能、智能体目录重构）。此前的 v1.1 与 v1.2 里程碑均已在 npm 上发布。

:::note[实时路线图]
权威的路线图位于仓库 [.planning/ROADMAP.md](https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md)。它会随着各阶段的落地持续更新，反映项目的真实交付状态。
:::

## Credits

GoMad 是 [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) 的硬分叉，由 Brian (BMad) Madison 以 MIT 协议发布。完整的署名信息与权威的非关联声明请见仓库的 [LICENSE](https://github.com/xgent-ai/gomad/blob/main/LICENSE) 与 [README](https://github.com/xgent-ai/gomad/blob/main/README.md)。
