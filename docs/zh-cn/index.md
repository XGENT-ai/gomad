---
title: GoMad
description: 面向 AI 驱动敏捷开发的智能体工作流框架
---

# GoMad

GoMad（GOMAD Orchestration Method for Agile Development）是一个面向 AI 驱动软件开发的智能体工作流框架。它通过专业智能体和可组合技能，引导你完成分析、规划、方案、实施四个阶段的结构化流程。GoMad 在 npm 上以 `@xgent-ai/gomad` 发布。

GoMad 是 BMAD Method 的硬分叉（hard fork）。它继承了经过验证的四阶段敏捷流水线，并在此基础上扩展 xgent-ai 自己的智能体、技能与集成。关于分叉来源，请参见本页底部的 [Credits](#credits)。

## 什么是 GoMad

GoMad 把 AI 智能体视为结构化敏捷流程中的专家协作者。它不是让 AI 替你"思考"，而是通过分阶段的工作流，把你与模型的协作引导到更高质量的产出上。

框架围绕四个顺序阶段组织：

1. **分析（Analysis）** —— 头脑风暴、调研，并界定问题边界。
2. **规划（Planning）** —— 产出需求文档、PRD 或规范。
3. **方案（Solutioning）** —— 设计架构与技术路径。
4. **实施（Implementation）** —— 通过智能体工作流与紧凑的评审循环推进落地。

每个阶段都暴露一组 `gm-*` 技能，由专业智能体调用以产出具体制品。技能可组合，也可按项目情况改写。

## 安装

```bash
npm install @xgent-ai/gomad
```

或者通过 `npx` 直接运行交互式安装器：

```bash
npx @xgent-ai/gomad install
```

按照安装程序提示操作，然后在项目文件夹中打开你的 AI IDE（Claude Code、Cursor 等）。

## 下一步去哪里

这些文档按 Diataxis 分成四类，按你的目标选择入口：

- **[教程（Tutorials）](./tutorials/getting-started.md)** —— 学习导向。通过分步引导带你做成一件事，第一次使用建议从这里开始。
- **[操作指南（How-To Guides）](./how-to/install-gomad.md)** —— 任务导向。解决具体问题的实用文档。
- **[说明（Explanation）](./explanation/advanced-elicitation.md)** —— 理解导向。深入讲解概念、架构与原理。
- **[参考（Reference）](./reference/agents.md)** —— 信息导向。提供智能体、工作流和配置项的技术规格。

## 你需要准备什么

GoMad 可与任何支持自定义系统提示词或项目上下文的 AI 编码助手配合使用，常见选择包括：

- [Claude Code](https://code.claude.com) —— Anthropic 的 CLI 工具（推荐）
- [Cursor](https://cursor.sh) —— AI 优先的代码编辑器
- [Codex CLI](https://github.com/openai/codex) —— OpenAI 的终端编码智能体

具备版本控制、项目结构和敏捷工作流的基础了解会很有帮助。

## Credits

GoMad 是 [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) 的硬分叉。完整的致谢信息与非关联声明请参见仓库 README 的 Credits 部分。
