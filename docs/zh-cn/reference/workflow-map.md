---
title: "工作流地图"
description: GoMad Method 各阶段 workflow 与产出速查
sidebar:
  order: 1
---

GoMad Method（BMM）通过分阶段 workflow 逐步构建上下文，让智能体始终知道“做什么、为什么做、如何做”。这张地图用于快速查阅阶段目标、关键 workflow 和对应产出。

如果你不确定下一步，优先运行 `gomad-help`。它会基于你当前项目状态和已安装模块给出实时建议。

<iframe src="/workflow-map-diagram.html" title="GoMad Method Workflow Map Diagram" width="100%" height="100%" style="border-radius: 8px; border: 1px solid #334155; min-height: 900px;"></iframe>

<p style="font-size: 0.8rem; text-align: right; margin-top: -0.5rem; margin-bottom: 1rem;">
  <a href="/workflow-map-diagram.html" target="_blank" rel="noopener noreferrer">在新标签页打开图表 ↗</a>
</p>

## 阶段 1：分析（可选）

在正式规划前，先验证问题空间与关键假设。

| Workflow | 目的 | 产出 |
| --- | --- | --- |
| `gomad-brainstorming` | 通过引导式创意方法扩展方案空间 | `brainstorming-report.md` |
| `gomad-domain-research`、`gomad-market-research`、`gomad-technical-research` | 验证领域、市场与技术假设 | 研究发现 |
| `gomad-create-product-brief` | 沉淀产品方向与战略愿景 | `product-brief.md` |

## 阶段 2：规划

定义“为谁做、做什么”。

| Workflow | 目的 | 产出 |
| --- | --- | --- |
| `gomad-create-prd` | 明确 FR/NFR 与范围边界 | `PRD.md` |
| `gomad-create-ux-design` | 在 UX 复杂场景下补齐交互与体验方案 | `ux-spec.md` |

## 阶段 3：解决方案设计（Solutioning）

定义“如何实现”并拆分可交付工作单元。

| Workflow | 目的 | 产出 |
| --- | --- | --- |
| `gomad-create-architecture` | 显式记录技术决策与架构边界 | `architecture.md`（含 ADR） |
| `gomad-create-epics-and-stories` | 将需求拆分为可实施的 epics/stories | epics 文件与 story 条目 |
| `gomad-check-implementation-readiness` | 实施前 gate 检查 | PASS / CONCERNS / FAIL 结论 |

## 阶段 4：实施

按 story 节奏持续交付与校验。

| Workflow | 目的 | 产出 |
| --- | --- | --- |
| `gomad-sprint-planning` | 初始化迭代追踪（通常每项目一次） | `sprint-status.yaml` |
| `gomad-create-story` | 准备下一个可实施 story | `story-[slug].md` |
| `gomad-dev-story` | 按规范实现 story | 可运行代码与测试 |
| `gomad-code-review` | 验证实现质量 | 通过或变更请求 |
| `gomad-correct-course` | 处理中途重大方向调整 | 更新后的计划或重路由 |
| `gomad-sprint-status` | 跟踪冲刺与 story 状态 | 状态更新 |
| `gomad-retrospective` | epic 完成后复盘 | 经验与改进项 |

## Quick Flow（并行快线）

当任务范围小且目标清晰时，可跳过阶段 1-3 直接推进：

| Workflow | 目的 | 产出 |
| --- | --- | --- |
| `gomad-quick-dev` | 统一快流：意图澄清、规划、实现、审查、呈现 | `spec-*.md` + 代码变更 |

## 上下文管理

每个阶段产出都会成为下一阶段输入：PRD 约束架构，架构约束开发，story 约束实现。没有这条链路，智能体更容易在跨 story 时出现不一致决策。

:::tip[Project Context 建议]
创建 `project-context.md`，把项目特有约定（技术栈、命名、组织、测试策略）写成共享规则，能显著降低实现偏差。
:::

**创建方式：**
- **手动创建**：在 `_gomad-output/project-context.md` 记录项目规则
- **自动生成**：运行 `gomad-generate-project-context` 从架构或代码库提取

## 相关参考

- [命令与技能参考](./commands.md)
- [智能体参考](./agents.md)
- [核心工具参考](./core-tools.md)
- [项目上下文说明](../explanation/project-context.md)
