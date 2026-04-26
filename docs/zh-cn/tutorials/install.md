---
title: "安装 GoMad"
description: 在五分钟内安装 @xgent-ai/gomad 并运行 gomad install。
sidebar:
  order: 1
---

使用 `npx` 在五分钟内将 GoMad 安装到你的项目中。完成后，你将拥有接入仓库的人格库、知识包以及斜杠命令启动器。

## 你将学到什么

- 从 npm 安装 `@xgent-ai/gomad`（或直接通过 `npx` 运行）。
- 运行交互式 `gomad install` 流程并选择合理的默认值。
- 理解安装器在 `<installRoot>/_config/` 下生成的目录布局。
- 通过查看 `files-manifest.csv` 和磁盘上的目录树来验证安装结果。

## 先决条件

:::note[先决条件]
Node.js 20+、npm 10+，以及一个支持斜杠命令的 AI IDE（Claude Code、Cursor 等）。
:::

## 快速路径

:::tip[快速路径]
`npx @xgent-ai/gomad install` —— 接受默认值 —— 完成。
:::

## 步骤 1：选择安装方式

你有两种选择。根据你打算在这个项目里保留 GoMad 的程度来挑一种。

**方式 A —— 通过 `npx` 一次性运行。** 当你想试用 GoMad 但不打算把它写进 `package.json` 时使用。每次调用都会下载最新版本。

```bash
npx @xgent-ai/gomad install
```

**方式 B —— 作为开发依赖加入。** 当你的项目需要锁定版本时使用。包会进入你的 lockfile，相同的命令可以通过本地二进制反复运行。

```bash
npm install --save-dev @xgent-ai/gomad
npx gomad install
```

无论哪种方式，最终都会进入相同的交互式安装器。

## 步骤 2：运行交互式安装器

安装器会依次询问三个问题：

- **选择安装根目录。** 默认是 `_gomad`。这是存放人格主体、知识包和清单文件的目录。如果你的项目约定要求其他路径，可以自由更改；不存在任何对此路径的硬编码。
- **确认 IDE 目标。** Claude Code、Cursor、Codex 以及其他已安装的、支持斜杠命令的 IDE 都会被自动识别。安装器会向匹配的 IDE 目录写入启动器存根。
- **确认 agent 选择。** 默认包含全部 8 个人格（analyst、tech-writer、pm、ux-designer、architect、sm、dev、solo-dev）。可以取消任何你不需要的项目。

确认之后，安装器会把文件复制到你的仓库。它写入的产物包括：

- 位于 `<installRoot>/_config/agents/<shortName>.md` 的人格主体文件 —— 每个人格的运行时唯一可信源。
- 位于 `<installRoot>/_config/kb/<slug>/` 的领域知识包 —— 适合检索的 markdown 包。
- 位于 `.claude/commands/gm/agent-*.md` 的斜杠命令启动器存根 —— IDE 识别的轻量入口。
- 位于 `<installRoot>/_config/files-manifest.csv` 的安装清单 —— 安装器写入的每个文件的记录，用于安全升级。

## 步骤 3：验证安装

安装器干净退出后，你的安装根目录下的目录树大致应当是这样：

```text
_gomad/
├── _config/
│   ├── agents/
│   │   ├── analyst.md
│   │   ├── architect.md
│   │   ├── dev.md
│   │   ├── pm.md
│   │   ├── sm.md
│   │   ├── solo-dev.md
│   │   ├── tech-writer.md
│   │   └── ux-designer.md
│   ├── kb/
│   │   ├── architecture/
│   │   └── testing/
│   └── files-manifest.csv
└── _backups/   # populated on subsequent installs
```

如果你的 IDE 支持斜杠命令，输入 `/gm:` 即可看到启动器列表。

## 常见问题

**人格文件存放在哪里？** 每个人格的主体文件位于 `<installRoot>/_config/agents/<shortName>.md`。`.claude/commands/gm/agent-*.md` 处的启动器存根在运行时引用这些主体文件。

**升级时如何在不丢失改动的前提下定制人格？** 可以。在人格文件旁放一个 `.customize.yaml`；安装器在清理过程中会尊重定制片段。合并契约请参见贡献指南。

**如何升级？** 重新运行 `npx @xgent-ai/gomad install`。清理计划器会先在 `<installRoot>/_backups/<timestamp>/` 下对被替换的文件做快照，然后再写入新版本，因此你可以随时回滚。

## 下一步

安装完成后，请到[快速入门教程](./quick-start.md)中跑一个真正的工作流 —— 五分钟内调用你的第一个人格并产出一个具体产物。
