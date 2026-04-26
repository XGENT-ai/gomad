---
title: "快速入门"
description: 运行你的第一个 GoMad 工作流 —— 调用人格，五分钟内产出一份 PRD 草稿。
sidebar:
  order: 2
---

端到端跑一遍你的第一个 GoMad 工作流。你将调用产品经理人格，起草一份 PRD，并亲眼看到启动器形式的斜杠命令 + 人格主体解析机制实际是怎么工作的。预计五分钟，从触发斜杠命令到在磁盘上检视产物。

## 你将学到什么

- 通过斜杠命令调用一个 `gm-agent-*` 人格。
- 理解启动器在运行时如何加载人格主体。
- 产出你的第一个产物（PRD 草稿）。
- 知道在哪里找到 agents 参考以及之后该往哪儿走。

## 开始之前

:::note[开始之前]
你已完成[安装教程](./install.md)。`_gomad/` 目录已存在，并且 `_config/agents/` 已被填充。
:::

## 步骤 1：挑选一个人格

GoMad 内置 8 个人格，分布在四个工作阶段 —— 分析、规划、方案设计和实施。每个人格都有一条你可以从 IDE 触发的斜杠命令、一个启动器在运行时加载的主体文件，以及一组它知道如何调用的技能。

本教程选 `gm-agent-pm` —— 产品经理 John。他属于规划阶段人格，主要技能（`gm-create-prd`）会产出一份 PRD 草稿，恰好是五分钟教程想要的小而具体的产物。在磁盘上对 John 来说重要的是这两个文件：

```text
<installRoot>/_config/agents/pm.md       # persona body (loaded at runtime)
.claude/commands/gm/agent-pm.md          # launcher stub (slash command target)
```

当你打算挑选其他人格时，到[Agents 参考](../reference/agents.md)中浏览完整目录。

你不需要记住这些文件路径。它们出现在这里只是为了让你确认安装确实把东西连好了；一旦你信任安装，日常只需要触发斜杠命令即可。

## 步骤 2：调用人格

从你 IDE 的斜杠命令面板触发 John：

```text
/gm:agent-pm
```

`.claude/commands/gm/agent-pm.md` 处的启动器存根会解析这条斜杠命令，然后在每次调用时从 `<installRoot>/_config/agents/pm.md` 加载人格主体。这一层间接是契约本身：启动器保持轻量、IDE 友好，而人格主体在升级之后仍然是唯一可信源。

John 接管后会以角色身份打招呼，列出他的能力（PRD 创建、校验、编辑、头脑风暴、撰写产品简介），然后等你下指令。他不会脱离角色，也不会自作主张往前跑 —— 每一步都由你来推动。

## 步骤 3：驱动你的第一个工作流

现在请 John 产出一个产物。给他一个能让示例在五分钟内收尾的小范围提示词，并明确指出技能名称：

> Use the `gm-create-prd` skill to draft a PRD for a daily-summary email feature.

John 会加载 `gm-create-prd` 并走完 PRD 访谈流程。`gm-create-prd` 是一个任务技能而非人格 —— 它本身没有斜杠命令，你只能通过持有它的人格来调用，这正是你之后调用所有实施类技能时会反复使用的模式。

简短地回答他的提问。你给的范围（每日摘要邮件）足够小，所以访谈很快就会结束。John 完成时会把 PRD 草稿写入项目规划约定所指定的路径 —— 通常是项目规划目录下的一个 markdown 文件。

如果某个问题不适用，回 "skip" 或 "not in scope"，John 会跳过。如果你不知道答案，直说就好 —— 他宁可在 PRD 里留一个明确的 "unknown"，也不要捏造内容。

## 步骤 4：检视产物

打开 John 产出的 PRD 草稿。它就是一个普通的 markdown 文件，分为目标、功能需求（FR-NN 格式）、Given/When/Then 验收标准以及显式的 `## Out of Scope` 段落。没有任何魔法 —— 只是下游技能（和人）都能读懂的纯 markdown。

这个产物是三个输入合并的结果：人格主体的指令、技能的模板，以及你的提示词。要了解运行时如何在每次调用中解析这三者，请看[架构说明](../explanation/architecture.md)。

PRD 同时也是工作流后续步骤的输入契约。架构、史诗与故事创建、实施就绪检查这些下游技能，消费的都是你刚刚产出的 FR-NN 需求和 Given/When/Then 验收标准。

## 你得到了什么

在这个短短的会话里，你产出了：

- 你的第一次人格调用 —— 一条斜杠命令通过启动器解析到人格主体。
- 你加载的第一个任务技能 —— `gm-create-prd`，由持有它的人格来调用。
- 你写出的第一个产物 —— 一份 markdown 格式的 PRD 草稿，已经可以喂给工作流的下一步。

## 下一步

按深度递增的方式，三条好的后续路径：到[技能参考](../reference/skills.md)浏览所有可以通过任意人格调用的任务技能完整目录。读[架构说明](../explanation/architecture.md)，理解四阶段生命周期，以及启动器、人格主体和技能在运行时如何组合。当你准备好用自己的技能或人格调整去扩展 GoMad 时，请看[贡献指南](../how-to/contributing.md)。
