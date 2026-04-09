[![Version](https://img.shields.io/npm/v/@xgent-ai/gomad?color=blue&label=version)](https://www.npmjs.com/package/@xgent-ai/gomad)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.10-blue?logo=python&logoColor=white)](https://www.python.org)
[![uv](https://img.shields.io/badge/uv-package%20manager-blueviolet?logo=uv)](https://docs.astral.sh/uv/)

GoMad (GOMAD Orchestration Method for Agile Development) is an agentic workflow
framework for AI-driven software development. It guides you through a structured
analysis → plan → solutioning → implementation pipeline using specialized agents
and skill-based workflows.

## What GoMad is

GoMad treats AI agents as expert collaborators in a structured agile process.
Rather than asking an AI to "do the thinking" for you, GoMad's workflows bring
out your best thinking in partnership with the model.

- **Structured Workflows** — Phased pipeline across analysis, planning, solutioning, and implementation
- **Specialized Agents** — Domain-expert personas for planning, architecture, development, and review
- **Scale-Adaptive** — Adjusts planning depth to project complexity, from small fixes to larger systems
- **Skills Architecture** — Composable skills under each workflow phase
- **Complete Lifecycle** — From initial analysis through delivery

## Quick Start

**Prerequisites**: [Node.js](https://nodejs.org) v20+ · [Python](https://www.python.org) 3.10+ (optional) · [uv](https://docs.astral.sh/uv/) (optional)

```bash
npx @xgent-ai/gomad install
```

Follow the installer prompts, then open your AI IDE (Claude Code, Cursor, etc.) in your project folder.

**Non-Interactive Installation** (for CI/CD):

```bash
npx @xgent-ai/gomad install --directory /path/to/project --modules gomad --tools claude-code --yes
```

## Documentation

[GoMad Docs Site](https://gomad.xgent.ai) — Tutorials, guides, concepts, and reference (site deployment pending; current docs live in the [`docs/`](docs/) directory of this repository).

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Credits

GoMad is a hard fork of BMAD Method ([bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)) by Brian (BMad) Madison and contributors. BMAD Method is MIT-licensed; the original copyright notice and license terms are preserved in [LICENSE](LICENSE).

xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC.
BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and are
referenced here solely for attribution purposes.

See [CHANGELOG.md](CHANGELOG.md) for the v1.1.0 release notes, including the
fork rationale and breaking changes from `@xgent-ai/gomad@1.0.0`.
