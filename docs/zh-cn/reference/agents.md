---
title: "Agent 参考"
description: 全部八个 gm-agent-* 角色的用途、所属阶段以及对应的斜杠命令调用方式。
sidebar:
  order: 1
---

GoMad 提供了八个 Agent 角色，覆盖四个工作流阶段——分析（Analysis）、规划（Planning）、方案设计（Solutioning）和实现（Implementation）。每个角色都通过 launcher 形式的斜杠命令（`/gm:agent-<shortName>`）调用：命令桩位于 `.claude/commands/gm/agent-<shortName>.md`，而真正的角色正文则在运行时从 `<installRoot>/_config/agents/<shortName>.md` 现读现用。角色正文不会被打包进命令桩，每次调用都会从磁盘重新读取——这意味着对角色文件的修改会在下次调用时立刻生效，无需重新构建或重新安装。

## 所有 Agent

<!-- AUTO:agents-table-start -->
| Persona | Slash command | Phase | Purpose |
| --- | --- | --- | --- |
| Mary | `/gm:agent-analyst` | Analysis | Strategic business analyst and requirements expert. Use when the user asks to talk to Mary or requests the business analyst. |
| Paige | `/gm:agent-tech-writer` | Analysis | Technical documentation specialist and knowledge curator. Use when the user asks to talk to Paige or requests the tech writer. |
| John | `/gm:agent-pm` | Planning | Product manager for PRD creation and requirements discovery. Use when the user asks to talk to John or requests the product manager. |
| Sally | `/gm:agent-ux-designer` | Planning | UX designer and UI specialist. Use when the user asks to talk to Sally or requests the UX designer. |
| Winston | `/gm:agent-architect` | Solutioning | System architect and technical design leader. Use when the user asks to talk to Winston or requests the architect. |
| Amelia | `/gm:agent-dev` | Implementation | Senior software engineer for story execution and code implementation. Use when the user asks to talk to Amelia or requests the developer agent. |
| Bob | `/gm:agent-sm` | Implementation | Scrum master for sprint planning and story preparation. Use when the user asks to talk to Bob or requests the scrum master. |
| Barry | `/gm:agent-solo-dev` | Implementation | Elite full-stack developer for rapid spec and implementation. Use when the user asks to talk to Barry or requests the quick flow solo dev. |
<!-- AUTO:agents-table-end -->

## 如何选择角色

当你还在梳理问题空间时，使用分析阶段的角色。Analyst 负责早期发现、市场调研与头脑风暴。Tech Writer 则在你需要记录发现、撰写文档或为文档站点润色行文时上场。

当问题已经清晰、需要确定形态时，切换到规划阶段的角色。PM 负责撰写下游编码 Agent 可直接消化的 PRD 和产品简报。UX Designer 处理用户体验相关工作——交互流程、界面规格，以及 PRD 中引用的交互细节。

当需求已经稳固、下一个问题是"我们应该怎么搭建"时，使用方案设计阶段的角色。Architect 产出系统设计、把 PRD 分解为 epic 与 story，并在任何代码落地前完成实现就绪检查。

当冲刺机制启动时，切换到实现阶段的角色。Scrum Master 负责创建并打磨 story；Dev 负责执行——读 story、写代码、写测试、提 PR。Solo Dev（Barry）是第八个角色，是分叉之后引入的单人开发模式混合体，把 Scrum Master 与 Dev 的循环压缩为一个角色，适合单人工作流——在那种场景下，角色分离带来的仪式开销往往大于收益。

## 调用机制

每个角色都通过同一种 launcher 形式的契约被调用。上表中所示形态的斜杠命令会加载位于 `.claude/commands/gm/agent-<shortName>.md` 的轻量命令桩。命令桩是 `gomad install` 时根据该角色的 `skill-manifest.yaml` 生成的，里面携带了元数据（显示名、标题、图标），便于 Claude Code 在 UI 中呈现该角色。

斜杠命令触发后，命令桩会指示助手从 `<installRoot>/_config/agents/<shortName>.md` 读取角色正文。该文件是该角色行为、语气和约束的单一可信来源——命令桩从不复制其内容。每次调用都现读现用，意味着对角色的编辑会立即生效，无需任何重新构建步骤。

如需了解更深层的架构图景——launcher 形式的斜杠命令如何与技能、manifest-v2 安装器以及四阶段工作流协同——请参阅 [GoMad 架构](../explanation/architecture.md)。

## 自定义角色

`<installRoot>/_config/agents/*.md` 下的角色文件由安装器拥有。后续的 `gomad install`（例如升级时）会从 `src/gomad-skills/*/gm-agent-*/SKILL.md` 重新生成这些文件，可能会覆盖本地修改。

:::note[用户覆盖]
`<installRoot>/_config/agents/*.md` 下的角色文件会被 `gomad install` 重新生成。
若要在不丢失修改的前提下定制角色，请参阅 `<installRoot>/_config/files-manifest.csv`
中的定制说明，以及 `.customize.yaml` 用户覆盖语义。
:::
