---
title: "技能参考"
description: 按工作流阶段组织的 GoMad 全部技能目录——Agent 角色、任务技能与核心技能。
sidebar:
  order: 2
---

GoMad 的技能（skills）是原子能力，按四个工作流阶段组织——分析（Analysis）、规划（Planning）、方案设计（Solutioning）和实现（Implementation）——再加上一层贯穿性的核心（Core）工具。其中有八个目录条目是 Agent 角色（完整的斜杠命令 launcher）；其完整用途与调用方式见 [Agent 参考](./agents.md)。下面列出的任务技能（task skills）与核心技能（core skills）由拥有它们的角色调用，不能直接调用。

## 如何阅读本目录

下面每个阶段小节的表格都是从源 SKILL.md 文件自动生成的。`Skill` 列是技能的规范名（与 `src/gomad-skills/<phase>/` 或 `src/core-skills/` 下的目录同名）。`Description` 列来自 SKILL.md 的 frontmatter。`Invoked by` 列描述契约——任务技能与核心技能不是独立的斜杠命令；某个角色会在其工作流中加载它们。

:::note[可信来源]
下面的表格是构建时从 `src/gomad-skills/*/SKILL.md` 与
`src/core-skills/*/SKILL.md` 自动生成的。要新增或重命名技能，
请编辑源 SKILL.md 并重新运行 `npm run docs:build`。
:::

## 1. 分析阶段

<!-- AUTO:skills-table-analysis-start -->
<!-- section: Analysis -->
| Skill | Description | Invoked by |
| --- | --- | --- |
| `gm-document-project` | Document brownfield projects for AI context. Use when the user says "document this project" or "generate project docs" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-domain-research` | Conduct domain and industry research. Use when the user says wants to do domain research for a topic or industry | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-market-research` | Conduct market research on competition and customers. Use when the user says they need market research | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-prfaq` | Working Backwards PRFAQ challenge to forge product concepts. Use when the user requests to 'create a PRFAQ', 'work backwards', or 'run the PRFAQ challenge'. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-product-brief` | Create or update product briefs through guided or autonomous discovery. Use when the user requests to create or update a Product Brief. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-technical-research` | Conduct technical research on technologies and architecture. Use when the user says they would like to do or produce a technical research report | Invoked by `gm-agent-*` or any persona via the skill loader |
<!-- AUTO:skills-table-analysis-end -->

分析阶段的技能聚焦于早期发现、市场调研与需求收集。

## 2. 规划阶段

<!-- AUTO:skills-table-planning-start -->
<!-- section: Planning -->
| Skill | Description | Invoked by |
| --- | --- | --- |
| `gm-create-prd` | Create a PRD from scratch. Use when the user says "lets create a product requirements document" or "I want to create a new PRD" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-create-ux-design` | Plan UX patterns and design specifications. Use when the user says "lets create UX design" or "create UX specifications" or "help me plan the UX" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-edit-prd` | Edit an existing PRD. Use when the user says "edit this PRD". | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-validate-prd` | Validate a PRD against standards. Use when the user says "validate this PRD" or "run PRD validation" | Invoked by `gm-agent-*` or any persona via the skill loader |
<!-- AUTO:skills-table-planning-end -->

规划阶段的技能产出 PRD、UX 设计规格以及经过校验的规划交付物。

## 3. 方案设计阶段

<!-- AUTO:skills-table-solutioning-start -->
<!-- section: Solutioning -->
| Skill | Description | Invoked by |
| --- | --- | --- |
| `gm-check-implementation-readiness` | Validate PRD, UX, Architecture and Epics specs are complete. Use when the user says "check implementation readiness". | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-create-architecture` | Create architecture solution design decisions for AI agent consistency. Use when the user says "lets create architecture" or "create technical architecture" or "create a solution design" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-create-epics-and-stories` | Break requirements into epics and user stories. Use when the user says "create the epics and stories list" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-generate-project-context` | Create project-context.md with AI rules. Use when the user says "generate project context" or "create project context" | Invoked by `gm-agent-*` or any persona via the skill loader |
<!-- AUTO:skills-table-solutioning-end -->

方案设计阶段的技能涵盖架构设计、epic 与 story 拆分，以及实现就绪性检查。

## 4. 实现阶段

<!-- AUTO:skills-table-implementation-start -->
<!-- section: Implementation -->
| Skill | Description | Invoked by |
| --- | --- | --- |
| `gm-checkpoint-preview` | LLM-assisted human-in-the-loop review. Make sense of a change, focus attention where it matters, test. Use when the user says "checkpoint", "human review", or "walk me through this change". | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-code-review` | Review code changes adversarially using parallel review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) with structured triage into actionable categories. Use when the user says "run code review" or "review this code" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-correct-course` | Manage significant changes during sprint execution. Use when the user says "correct course" or "propose sprint change" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-create-story` | Creates a dedicated story file with all the context the agent will need to implement it later. Use when the user says "create the next story" or "create story [story identifier]" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-dev-story` | Execute story implementation following a context filled story spec file. Use when the user says "dev this story [story file]" or "implement the next story in the sprint plan" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-discuss-story` | Use when the user wants to crystallize gray areas for a planned story BEFORE running gm-create-story. Produces {planning_artifacts}/{{story_key}}-context.md with 5 locked sections (domain, decisions, canonical_refs, specifics, deferred) that gm-create-story auto-loads. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-domain-skill` | Use when a coding agent or another skill needs to ground itself in reference material from an installed domain-knowledge-base pack. Takes {domain_slug} and optional {query}; on a strong BM25 match the skill loads the single best-matching .md file into the agent''s working context as authoritative domain guidance and returns only a one-line citation (read-as-skill, not stdout dump). With no query, returns a file listing. Supports typo fallback via Levenshtein "did you mean" suggestions. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-epic-demo-story` | Create a demo/verification story for a completed epic that defines a walkthrough flow and validates it via Chrome DevTools. Use when the user says "create epic demo story", "create demo story for epic [N]", "create verification story for epic", or wants to demonstrate and verify a completed epic through browser interaction. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-qa-generate-e2e-tests` | Generate end to end automated tests for existing features. Use when the user says "create qa automated tests for [feature]" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-quick-dev` | Implements any user intent, requirement, story, bug fix or change request by producing clean working code artifacts that follow the project''s existing architecture, patterns and conventions. Use when the user wants to build, fix, tweak, refactor, add or modify any code, component or feature. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-retrospective` | Post-epic review to extract lessons and assess success. Use when the user says "run a retrospective" or "lets retro the epic [epic]" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-sprint-agent` | Autonomous sprint orchestrator that drives the full story lifecycle: create story, develop, code review, summary, and commit — looping through stories automatically. Use when user says "start sprint agent", "auto sprint", "run Elon", or wants hands-free story execution. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-sprint-planning` | Generate sprint status tracking from epics. Use when the user says "run sprint planning" or "generate sprint plan" | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-sprint-status` | Summarize sprint status and surface risks. Use when the user says "check sprint status" or "show sprint status" | Invoked by `gm-agent-*` or any persona via the skill loader |
<!-- AUTO:skills-table-implementation-end -->

实现阶段的技能驱动冲刺机制——story 创建、Dev 执行、代码评审、回顾，以及新的领域知识框架。

## 核心技能

<!-- AUTO:skills-table-core-start -->
<!-- section: Core -->
| Skill | Description | Invoked by |
| --- | --- | --- |
| `gm-advanced-elicitation` | Push the LLM to reconsider, refine, and improve its recent output. Use when user asks for deeper critique or mentions a known deeper critique method, e.g. socratic, first principles, pre-mortem, red team. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-brainstorming` | Facilitate interactive brainstorming sessions using diverse creative techniques and ideation methods. Use when the user says help me brainstorm or help me ideate. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-distillator` | Lossless LLM-optimized compression of source documents. Use when the user requests to 'distill documents' or 'create a distillate'. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-editorial-review-prose` | Clinical copy-editor that reviews text for communication issues. Use when user says review for prose or improve the prose | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-editorial-review-structure` | Structural editor that proposes cuts, reorganization, and simplification while preserving comprehension. Use when user requests structural review or editorial review of structure | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-help` | Analyzes current state and user query to answer GoMad questions or recommend the next skill(s) to use. Use when user asks for help, gomad help, what to do next, or what to start with in GoMad. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-index-docs` | Generates or updates an index.md to reference all docs in the folder. Use if user requests to create or update an index of all files in a specific folder | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-party-mode` | Orchestrates group discussions between installed GOMAD agents, enabling natural multi-agent conversations where each agent is a real subagent with independent thinking. Use when user requests party mode, wants multiple agent perspectives, group discussion, roundtable, or multi-agent conversation about their project. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-review-adversarial-general` | Perform a Cynical Review and produce a findings report. Use when the user requests a critical review of something | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-review-edge-case-hunter` | Walk every branching path and boundary condition in content, report only unhandled edge cases. Orthogonal to adversarial review - method-driven not attitude-driven. Use when you need exhaustive edge-case analysis of code, specs, or diffs. | Invoked by `gm-agent-*` or any persona via the skill loader |
| `gm-shard-doc` | Splits large markdown documents into smaller, organized files based on level 2 (default) sections. Use if the user says perform shard document | Invoked by `gm-agent-*` or any persona via the skill loader |
<!-- AUTO:skills-table-core-end -->

核心技能是贯穿性的工具——评审辅助、头脑风暴、文档分片、引导启发原语——任何角色在任何阶段都可以使用。
