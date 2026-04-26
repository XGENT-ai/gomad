---
title: "GoMad 架构"
description: 了解 GoMad 的 4 阶段工作流、manifest-v2 安装器和启动器式斜杠命令如何协同工作。
sidebar:
  order: 1
---

GoMad 是 BMAD Method 的一个分支，它将一套有主张的敏捷工作流以代理（agent）和技能（skill）的形式打包，由你的 AI IDE 在运行时加载。
本文解释 GoMad 的三大支柱如何协同工作 —— 4 阶段工作流、manifest 驱动的安装器，以及启动器式斜杠命令契约。

## 概述

GoMad 是一个以 Markdown 为载体、面向 AI 辅助软件开发的代理式工作流。
它发布一组协同设计的 persona、任务技能（task skill）和领域知识包（knowledge pack），由 AI IDE 在运行时加载，驱动项目走完分析、规划、解决方案和实现四个阶段。

三大支柱共同支撑运行时：

- **工作流**决定*做什么*以及*何时做* —— 一条线性流水线，每个阶段消费上一个阶段的产出。
- **安装器**决定文件*如何*落地到你的工作区 —— 一个 manifest 驱动的复制步骤，将代理 persona、任务技能、启动器存根（launcher stub）写入用户选择的安装根目录。
- **启动器**决定你的 IDE *如何*调用一个 persona —— 一个轻量的斜杠命令存根，每次调用都重新加载 persona 主体。

三者背后的设计约束是刻意的：零新增运行时依赖。
整个系统就是纯 Markdown 加上一个最小化的 Node.js 安装器。
没有托管服务，没有守护进程，没有插件运行时。
干活的是你 IDE 已有的技能加载机制。

## 4 阶段工作流

GoMad 的工作流是一条贯穿四个阶段的线性流水线 —— Analysis（分析）、Planning（规划）、Solutioning（解决方案）、Implementation（实现）。
每个阶段都消费上一个阶段的产出，所以阶段顺序是承重结构，而不是装饰性建议。

**Analysis（分析）**产出探索性资料。
分析师 persona 带领团队完成头脑风暴、市场调研和项目记录工作。
产出是一组简报和研究笔记，在做任何产品决策之前先把问题界定清楚。

**Planning（规划）**产出需求。
PM 和 UX-designer persona 把分析阶段的产出转化为产品需求文档（PRD）和配套的 UX 设计规格。
这些文档命名功能需求（FR-NN）、给出 Given/When/Then 验收标准，并明确写出"超出范围（Out of Scope）"契约，供下一个阶段消费。

**Solutioning（解决方案）**产出实现计划。
架构师 persona 起草架构文档，把工作分解为 Epic 和 Story，并执行实现就绪检查（implementation-readiness check）。
该检查确认下游技能可以直接据此行动，不再需要额外的人工翻译。

**Implementation（实现）**产出代码、代码评审和复盘记录。
开发和 SM persona 推动 Story 的执行，再加上新的领域知识框架，让 persona 可以按需检索精选的参考资料。
正是在这个阶段，上游各阶段的产出最终落实为提交的代码。

流水线的形态很重要，因为每个阶段的产出就是下一个阶段的输入。
不完整的简报会产出不完整的 PRD，进而产出不完整的架构，最后留下卡壳的 Story。
完整的逐阶段技能目录请参见[技能参考](../reference/skills.md)。

## manifest-v2 安装器

GoMad 遵循"生成而非搬移（generate-don't-move）"的原则。
源目录 —— `src/gomad-skills/`、`src/core-skills/` 和 `src/domain-kb/` —— 是规范的内容来源。
这些目录里的内容并不是用户直接运行的对象。
取而代之的是：`gomad install` 读取这些源目录，*生成*一棵新的目录树写入用户选择的 `<installRoot>`（项目惯例是 `_gomad`，但路径可配置）。

每一个生成的文件都被记录在一个 manifest 中。
该 manifest 位于 `<installRoot>/_config/files-manifest.csv`，使用 v2 schema：一行 `schema_version` 加上每文件一行，携带 `install_root`、`path` 以及内容元数据。
manifest 才是已安装内容的真相来源 —— 不是文件系统，不是 npm 包版本，是这份 CSV。

后续每一次 `gomad install` 都是 manifest 驱动的。
安装器读取上一次的 manifest，先把所有即将被替换的文件快照到 `<installRoot>/_backups/<timestamp>/`，再写入新的产出并重写 manifest。
如果某次重装出现意外结果，快照目录里就有可逆的恢复记录 —— 恢复流程见[升级恢复指南](../upgrade-recovery.md)。

用户的自定义改动可以跨越多次重装而保留。
在你的安装根目录下放一份 `.customize.yaml` 即可把特定路径标记为用户自有。
安装器的"自定义文件检测器"会把匹配到的 `.md` 文件视为禁区，在清理时跳过它们，你的修改不会被悄悄覆盖。

v1.3 安装目录结构刻意保持扁平：

```text
<installRoot>/
├── _config/
│   ├── agents/<shortName>.md
│   ├── kb/<slug>/
│   └── files-manifest.csv
└── _backups/<timestamp>/
```

## 启动器式斜杠命令

GoMad 的每个 persona 实际上由三件产物组成，而不是一个文件。

- **persona 主体**位于 `<installRoot>/_config/agents/<shortName>.md`，是 persona 被激活时 IDE 真正遵循的指令文件。
- **启动器存根**位于 `.claude/commands/gm/agent-<shortName>.md`，是一个被 IDE 绑定到斜杠命令面的小文件。
- **斜杠命令面**本身，即 `/gm:agent-<shortName>`，是你输入的内容。

运行时序列刻意做得很短。
你输入 `/gm:agent-pm`。
你的 IDE 找到位于 `.claude/commands/gm/agent-pm.md` 的启动器存根。
启动器指示 IDE 从 `<installRoot>/_config/agents/pm.md` 重新加载 persona 主体。
persona 与你打招呼并列出能力。
每次调用都会重新读取 persona 主体，所以 `gomad install` 带来的更新会在下次斜杠命令调用时生效，无需重启。

之所以采用启动器形态而不是把 persona 内联打包，是为了解耦。
persona 主体每一次重跑 `gomad install` 都可能变化（新提示词、修订过的指令、更新过的能力清单）。
启动器存根保持稳定 —— 它是一个指针，不是副本。
解耦的好处是：用户面对的斜杠命令在升级中形态不变；变的是 IDE 那一侧加载到的内容。

完整的代理目录请参见 [Agents 参考](../reference/agents.md)，其中列出每一个 persona 及其斜杠命令和主要阶段。

请注意，**任务技能（task skill）** —— 也就是 persona 调用的那些按步骤执行的技能，目录见[技能参考](../reference/skills.md) —— 是由 persona 加载的，不能直接调用。
v1.3 中没有 `/gm:create-prd` 这样的斜杠命令；只有当一个激活中的 persona 的指令告诉 IDE 加载某个任务技能时，该技能才会被触发。
斜杠命令面只留给 persona。

## 三者如何协同

走一遍具体流程，就能看到三大支柱如何协同。

一名开发者在一个全新项目中运行 `gomad install`。
安装器把代理 persona、任务技能和启动器存根按 v1.3 布局写入磁盘 —— `<installRoot>/_config/agents/pm.md`、`<installRoot>/_config/kb/<slug>/`、`.claude/commands/gm/agent-pm.md`，以及位于 `<installRoot>/_config/files-manifest.csv` 的 manifest。

开发者输入 `/gm:agent-pm`。
IDE 加载启动器存根，存根指示它重新加载 persona 主体。
PM persona 与开发者打招呼，并提议带领他完成 Planning 阶段。
persona 的指令按需调用任务技能，产出一份 PRD 草稿。
该 PRD 成为 Solutioning 阶段的输入产物 —— 在那一阶段，架构师 persona 以同样的方式被调用，把 PRD 转化为架构文档和 Story 分解。

三大支柱可以独立测试，但它们是一起设计的。
安装器负责把文件落地到磁盘。
启动器把斜杠命令绑定到这些文件上。
工作流给这些斜杠命令一个执行顺序。
缺了任何一根支柱，系统就会失灵：没有安装器，文件就永远落不到可预测的路径上；没有启动器，IDE 就没有可以调用的入口；没有工作流，persona 之间就没有共享的"接下来做什么"的剧本。
