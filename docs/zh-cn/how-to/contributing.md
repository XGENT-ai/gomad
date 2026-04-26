---
title: "为 GoMad 贡献代码"
description: Fork、分支、测试,然后提交 PR — 提交前需要运行的内容。
sidebar:
  order: 1
---

使用标准的 fork-and-PR 工作流为 GoMad 贡献代码。本页介绍每个 PR 在合并前必须满足的测试要求。

## 何时使用本指南

- 你打算提出新的角色 (persona)、技能 (skill) 或领域知识包。
- 你要修复安装器、`tools/` 下某个工具或现有技能中的 bug。
- 你正在改进文档或翻译。

## 先决条件

:::note[先决条件]
Node.js 20+、npm 10+、一个 GitHub 账号,以及对仓库根目录现有 `CONTRIBUTING.md` 的阅读权限 — 该文件包含规范的 PR 模板。
:::

## 步骤 1:Fork 并克隆

在 GitHub 上 fork [`xgent-ai/gomad`](https://github.com/xgent-ai/gomad)(使用仓库页面右上角的 **Fork** 按钮),然后克隆你的 fork 并安装依赖:

```bash
git clone git@github.com:<your-username>/gomad.git
cd gomad
npm install
```

GoMad 是 BMAD Method 的硬分叉 (hard fork),并非持续合并的下游分支 — 不存在需要保持同步的上游。把你的 fork 当作 `xgent-ai/gomad` 的一份工作副本即可。

## 步骤 2:从 main 创建分支

使用约定的前缀,从 `main` 创建一个特性分支:

```bash
git switch -c feat/your-feature-name
```

`feat/` 用于新特性,`fix/` 用于修复 bug,`docs/` 用于文档变更,`chore/` 用于工具或配置更新。分支名应简短且具有描述性。

## 步骤 3:进行修改

源真相 (source-of-truth) 内容位于 `src/gomad-skills/`、`src/core-skills/` 和 `src/domain-kb/`。安装器在安装时会把这些目录复制到用户的 `<installRoot>/_config/` — 这就是 generate-don't-move 模式,因此请始终在 `src/` 下进行修改,而不要修改已安装的副本。

如果要新增一个角色,请在 `src/gomad-skills/<phase>/gm-agent-<short>/` 下创建目录,包含 `SKILL.md`(其 frontmatter 含 `name:` 和 `description:`)和 `skill-manifest.yaml`(包含 `displayName`、`title`、`icon`)。如果要新增一个任务技能 (task skill),使用相同的目录布局,放在合适的阶段下,但只需要 `SKILL.md`(任务技能不需要 `skill-manifest.yaml`)。如果只是修改文档,直接编辑 `docs/` 下的文件 — Starlight 站点会自动捕获变更。

参见[架构说明](../explanation/architecture.md),了解安装器、工作流和启动器在运行时如何协同。

## 步骤 4:运行质量门禁

在提交 PR 之前,先在本地运行完整的质量链:

```bash
npm run quality
```

该链(在 `package.json` 中定义)会依次运行 Prettier 格式检查、ESLint、markdownlint、文档构建(链接检查 + Astro 构建)、安装与集成测试、文件引用校验、技能校验、inject-reference-tables 测试、KB license 校验,以及孤立引用检查。门禁必须以 0 退出码通过,你才能提交 PR。

:::caution[如果检查失败]
单独运行失败的脚本(例如 `npm run lint` 或 `npm run docs:build`)以获得更聚焦的输出。不要绕过门禁 — PR 模板会要求你确认 `npm run quality` 在本地通过。
:::

## 步骤 5:提交 PR

将特性分支推送到你的 fork,然后向 `xgent-ai/gomad` 的 `main` 分支提交 pull request。审核者会拉取你的分支,重新运行 `npm run quality`,并基于 diff 给出反馈。

PR 标题约定:`<type>(<scope>): <summary>` — 例如 `feat(skills): add gm-domain-skill`。PR 正文应引用相关的 issue 或路线图条目,以便审核者把变更与其动机背景关联起来。

## 你将获得

- PR 评审反馈,通常在几天内给出。
- 一旦合并,你的变更会随下一次 `@xgent-ai/gomad` 的 npm 发布按 milestone 节奏一起发布。
- 如果变更非琐碎 (non-trivial),会在 `CONTRIBUTORS.md` 中获得署名。

## 进一步了解

了解运行时模型(安装器、技能与启动器斜杠命令如何协同),请阅读[架构说明](../explanation/architecture.md)。要查看目录示例,可浏览 [Agents 参考](../reference/agents.md)和[技能参考](../reference/skills.md),看看现有的角色与技能是如何组织的。
