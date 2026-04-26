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
