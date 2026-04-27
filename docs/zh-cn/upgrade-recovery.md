---
title: "升级恢复"
description: 介绍 manifest 驱动的清理快照如何工作，以及如何从快照中恢复
---

从 gomad v1.2 起，每一次会删除文件的 `gomad install` 都会把这些文件快照到 `_gomad/_backups/<YYYYMMDD-HHMMSS>/` 下的一个带时间戳的目录里。本文说明这些快照的结构，以及如何从中恢复。

## 备份目录布局

当 `gomad install` 执行 manifest 驱动的清理时，会创建：

```
_gomad/_backups/<YYYYMMDD-HHMMSS>/
├── metadata.json           # machine-readable backup manifest
├── README.md               # auto-generated recovery instructions (co-located)
├── .claude/                # snapshots of files that were installed under .claude/
│   └── commands/gm/agent-pm.md
├── _gomad/                 # snapshots of files that were installed under _gomad/
│   └── gomad/agents/pm.md
└── .cursor/                # snapshots from any IDE-target install_root
    └── ...
```

`<YYYYMMDD-HHMMSS>/` 下的每一个顶层目录都对应 `_gomad/_config/files-manifest.csv` 中的一个 `install_root` 值。每个目录内部的相对路径结构与原始工作区布局保持一致。

## metadata.json 结构

```json
{
  "gomad_version": "1.2.0",
  "created_at": "2026-04-20T14:30:52.123+09:00",
  "reason": "manifest_cleanup",
  "files": [
    {
      "install_root": ".claude",
      "relative_path": "commands/gm/agent-pm.md",
      "orig_hash": "<sha256 from files-manifest.csv, or null>",
      "was_modified": false
    }
  ],
  "recovery_hint": "Restore with: cp -R $(pwd)/_gomad/_backups/20260420-143052/* ./"
}
```

| 字段 | 用途 |
|-------|---------|
| `gomad_version` | 产生该备份的 gomad 版本。恢复时应核对其与当前已安装版本的兼容性。 |
| `created_at` | 完整的 ISO 8601 时间戳，含时区 —— 用于在同一秒内多次安装之间消歧。 |
| `reason` | 取值之一：`manifest_cleanup`、`legacy_v1_cleanup`。 |
| `files[]` | 每个文件的记录。`was_modified` 为 `true` 表示磁盘上的文件与 manifest 中存储的哈希不一致，`false` 表示一致，`null` 表示这是 v1.1 遗留备份（当时尚未存储哈希）。 |
| `recovery_hint` | 一行 shell 命令，用于从该备份恢复。 |

## 如何恢复

### 快速恢复

在工作区根目录下执行：

```bash
cp -R $(pwd)/_gomad/_backups/<YYYYMMDD-HHMMSS>/* ./
```

将 `<YYYYMMDD-HHMMSS>` 替换为你想恢复的备份目录名。

### 仅恢复文件内容（跳过 metadata.json 和 README.md）

```bash
rsync -a --exclude=metadata.json --exclude=README.md \
  $(pwd)/_gomad/_backups/<YYYYMMDD-HHMMSS>/ ./
```

### 恢复前 —— 版本兼容性检查

将 `metadata.json.gomad_version` 与你当前已安装的 gomad 版本进行对比：

```bash
cat _gomad/_backups/<YYYYMMDD-HHMMSS>/metadata.json | grep gomad_version
npx gomad --version
```

如果版本不一致，install_root 的语义可能已经发生变化。把 v1.2 时期的备份恢复到 v1.3+ 的安装上，文件内容层面通常仍然可用，但路径可能会落到新版安装器不再管辖的位置 —— 你可能因此得到一些孤儿文件。拿不准时，建议一次只复制一个文件。

## 如何识别要恢复哪个备份

每一个 `_gomad/_backups/<YYYYMMDD-HHMMSS>/` 目录都可以按时间顺序排序（按 D-37 时间戳格式构造，字典序与时间序天然一致）。同一秒内的两次安装会产生 `<ts>` 与 `<ts>-2` 这样的后缀。

每个备份目录里还附带一份自动生成的 `README.md`，里面写着针对该具体快照的 `cp -R` 命令。

## 修剪备份

在 v1.2 中，备份完全由用户管理 —— 安装器既不会删除也不会轮转旧的快照。每一个备份目录都是一棵自包含的目录树，可以安全地直接删除：

```bash
rm -rf _gomad/_backups/20260401-*   # remove all April-1st backups
```

自动轮转策略留待未来某个 gomad 版本再支持。

## 何时不会产生备份

以下情形不会创建备份：

- `gomad install` 在一个全新的工作区上运行（没有可快照的内容）
- 新的安装集与之前完全相同 —— 幂等的重复安装
- 检测到 manifest 损坏（日志中记录 `MANIFEST_CORRUPT`）—— 出于安全考虑，清理流程会被整体跳过

在这些情形下，`_gomad/_backups/` 可能保持为空，或仅保留更早的备份。

## v1.2 → v1.3 升级恢复

从 v1.2.0 升级到 v1.3.0 时，安装程序会将代理人格主体文件从
`_gomad/gomad/agents/<shortName>.md` 迁移到
`_gomad/_config/agents/<shortName>.md`。这 8 个旧文件会在删除前被快照备份到
`_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/` 目录。

v1.3 清理计划程序通过同时检测以下两个条件来识别 v1.2 布局：
存在 `_gomad/_config/files-manifest.csv`（v2 模式），并且
`_gomad/gomad/agents/` 目录下至少存在一个人格文件。一旦检测到，
迁移过程会输出醒目的横幅，说明迁移内容、备份位置以及指向本恢复文档的链接。

### 回滚到 v1.2 布局

如果升级后 `/gm:agent-*` 调用失败，或者你需要回滚到 v1.2.0：

1. 重新全局固定 v1.2 版本：

   ```bash
   npm install -g @xgent-ai/gomad@1.2.0
   ```

2. 还原快照中的人格文件（请把示例中的时间戳替换为
   `_gomad/_backups/` 目录下的实际值）：

   ```bash
   cp -R _gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/ _gomad/gomad/
   ```

3. 在 v1.2 二进制下重新运行 `gomad install`，安装程序会重新生成
   指向已恢复的 `_gomad/gomad/agents/` 路径的启动器存根
   （`/gm:agent-*`）：

   ```bash
   gomad install
   ```

### 前向恢复

如果只是启动器存根失效（人格主体文件已位于新的 `_config/agents/` 路径，
但 `/gm:agent-*` 仍然 404），重新运行 `gomad install`。
`writeAgentLaunchers` 步骤会无条件覆盖启动器存根，使用 v1.3 的新路径
重新生成它们：

```bash
gomad install
```

### .customize.yaml 的保留语义

位于 `_gomad/_config/agents/.customize.yaml` 的用户自定义配置会在
v1.2→v1.3 升级中得到保留。自定义文件检测器把 8 个生成的人格 `.md`
文件视为安装程序管理的文件，不会触碰 `.customize.yaml` 以及任何
不匹配上述名单的 `.md` 文件。
