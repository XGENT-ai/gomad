---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document - log-redactor

**Author:** gomad-integration-test
**Date:** 2026-04-22

## Executive Summary

log-redactor is a command-line tool that reads application log streams (stdin or file) and emits the same log content with sensitive data patterns removed. The tool targets developer and SRE workflows where log output must be shareable (bug reports, ticket attachments, public incident post-mortems) without leaking PII, credentials, or customer data.

### What Makes This Special

Unlike grep-based ad-hoc redaction scripts, log-redactor operates on a composable rule pack — email-shaped strings, credit-card numbers (Luhn-valid), JWT tokens, and user-defined regex patterns — and preserves line order, timestamps, and severity prefixes so downstream log-parsing tools still work on the redacted output.

## Project Classification

Developer tool, CLI project type, low-complexity domain, greenfield.

## Success Criteria

### User Success

- Developers can redact a log file in a single command, without writing a regex.
- Output format matches input format (timestamps, severity, line order) so downstream tooling is not broken.
- Default rule pack catches common leak shapes (emails, credit cards, JWTs) with no configuration.

### Technical Success

- Processes a 1 GB log file in under 30 seconds on a consumer laptop.
- Exits non-zero with a clear diagnostic on malformed rule files.
- Zero sensitive-data bytes in output when the matching rule is enabled (asserted by integration tests).

## Product Scope

### MVP - Minimum Viable Product

- Redact from stdin / file / directory recursively.
- Built-in rule pack: email, credit card (Luhn), JWT, API key prefixes.
- Custom rule file (YAML) for user-defined regex.
- Output to stdout or file; preserve line numbers.

### Growth Features (Post-MVP)

- Interactive mode for false-positive review before writing output.
- Rule-pack sharing via a central registry.

### Vision (Future)

- Plugin architecture for structured-log formats (JSON, logfmt) with field-aware redaction.

## User Journeys

### Primary User - Success Path

Actor (SRE) performs `log-redactor < incident.log > redacted.log`, system reads stdin, applies default rule pack to each line, writes redacted lines to stdout. Outcome: redacted.log contains the same line count and order as incident.log with matched patterns replaced by `[REDACTED]`.

### Primary User - Edge Case

Actor (developer) performs `log-redactor --rules custom.yaml corrupt.log`, system parses custom.yaml, discovers a malformed regex on line 3, exits with code 2, prints `custom.yaml:3: invalid regex '[unclosed'`. Outcome: no output file written; developer fixes the rule file and retries.

### Admin/Operations User

Actor (platform engineer) performs `log-redactor --stats < pipeline.log > redacted.log`, system processes input and also emits a summary to stderr: `redacted 412 lines, matched rules: email=38, credit-card=4, jwt=7`. Outcome: operator has redaction coverage metrics for the log batch.

### API Consumer

Actor (scripted tool) performs `log-redactor --json-summary --quiet < pipeline.log > /dev/null`, system processes input silently and writes a JSON summary to stdout (no redacted content). Outcome: scripted tool parses summary for dashboards.

## Functional Requirements

### Input Handling

- FR-01: Developer can pipe log content to log-redactor via stdin
    - AC: Given a running pipeline writing to stdout, when the user pipes to `log-redactor`, then the tool reads until EOF and emits redacted lines
    - AC: Given an empty stdin, when the tool runs, then it exits with code 0 and no output

- FR-02: Developer can pass a single file path as an argument
    - AC: Given a readable log file, when `log-redactor path/to/log` runs, then the file is opened, read line-by-line, and redacted output is written to stdout
    - AC: Given a non-existent path, when the tool runs, then it exits with code 1 and prints `cannot open: <path>: No such file or directory` to stderr

- FR-03: Developer can pass a directory path for recursive processing
    - AC: Given a directory of .log files, when `log-redactor --recursive dir/` runs, then every .log file is processed in deterministic order
    - AC: Given a directory with mixed file types, when run with `--recursive`, then only files matching `*.log` are processed

### Redaction Rules

- FR-04: Tool applies a built-in default rule pack
    - AC: Given an input line `user=alice@example.com`, when the tool processes it, then the output line reads `user=[REDACTED]`
    - AC: Given an input line `card=4111-1111-1111-1111` (Luhn-valid), when the tool processes it, then the card number is replaced with `[REDACTED]`
    - AC: Given a Luhn-invalid 16-digit sequence, when the tool processes it, then the sequence passes through unchanged

- FR-05: Developer can load a custom rule file in YAML format
    - AC: Given a custom.yaml with `- name: api-key\n  pattern: 'sk-[a-z0-9]{32}'`, when `log-redactor --rules custom.yaml input.log` runs, then lines matching the pattern are redacted
    - AC: Given a malformed YAML (e.g., unclosed quote), when the tool runs, then it exits with code 2 and prints `custom.yaml: parse error at line N`

- FR-06: Developer can disable individual rules from the default pack
    - AC: Given `--disable credit-card` on the command line, when the tool runs, then credit-card patterns pass through unchanged but email/jwt are still redacted
    - AC: Given `--disable` with an unknown rule name, when the tool runs, then it exits with code 1 and prints `unknown rule: <name>`

### Output Control

- FR-07: Tool writes redacted content to stdout by default
    - AC: Given any valid input, when the tool runs without `--output`, then redacted content is written to stdout
    - AC: Given shell redirection (`>`), when combined with default behavior, then the redacted content lands in the target file

- FR-08: Developer can specify an output file via `--output`
    - AC: Given `--output redacted.log`, when the tool runs, then the file is created with 0600 permissions and contains the redacted content
    - AC: Given `--output` pointing to an existing file, when the tool runs without `--force`, then it exits with code 1 and prints `refusing to overwrite: <path>`

- FR-09: Tool preserves line order and line count
    - AC: Given an input with N lines, when the tool processes it, then the output has exactly N lines in the same order (a `diff -q <(wc -l input) <(wc -l output)` returns no difference, and line order is preserved)
    - AC: Given an input line with no matches, when the tool processes it, then the output line is identical to the input line

### Observability

- FR-10: Developer can request a redaction summary via `--stats`
    - AC: Given `--stats` flag, when the tool finishes processing, then a summary of the form `redacted N lines, matched rules: rule1=M, rule2=P` is written to stderr
    - AC: Given `--stats` with zero matches, when the tool finishes, then the summary reads `redacted 0 lines, matched rules: (none)`

- FR-11: Developer can request a machine-readable summary via `--json-summary`
    - AC: Given `--json-summary`, when the tool finishes, then a single JSON object matching `{redacted: number, matched: {rule: count}}` is written to stdout (with content suppressed if `--quiet`)
    - AC: Given `--json-summary` without `--quiet`, when the tool finishes, then the JSON is written to stderr so stdout stays content-only

### Rule Discovery

- FR-12: Developer can list built-in rules via `--list-rules`
    - AC: Given `--list-rules`, when the tool runs, then it prints one rule name per line to stdout and exits with code 0
    - AC: Given `--list-rules` combined with input, when the tool runs, then it ignores the input and only lists rules

- FR-13: Developer can describe a single rule via `--describe <name>`
    - AC: Given `--describe email`, when the tool runs, then it prints the rule name, pattern, and example match/replacement to stdout
    - AC: Given `--describe <unknown>`, when the tool runs, then it exits with code 1 and prints `unknown rule: <name>`

### Error Handling

- FR-14: Tool exits with documented codes on failure
    - AC: Given any successful run, when the tool finishes, then it exits with code 0
    - AC: Given any IO or filesystem error, when the tool finishes, then it exits with code 1

- FR-15: Tool fails fast on malformed rule files
    - AC: Given a custom.yaml with an unclosed regex on line 3, when the tool runs, then it exits with code 2 and prints `custom.yaml:3: invalid regex '[unclosed'` before reading any log input
    - AC: Given a custom.yaml with a duplicate rule name, when the tool runs, then it exits with code 2 and prints `custom.yaml: duplicate rule name: <name>`

## Out of Scope

- **OOS-01**: Log aggregation / forwarding to a central log store — Reason: redaction is a local stream transformation; aggregation is a separate concern
- **OOS-02**: Structured-log field-aware redaction (JSON, logfmt) — Reason: MVP targets line-oriented logs; structured-log plugins are Vision-tier
- **OOS-03**: GUI / TUI interactive mode — Reason: CLI-only is the MVP surface; interactive review is a Growth-tier feature

## Non-Functional Requirements

### Performance

- NFR-01: Tool processes 1 GB of line-oriented log input in under 30 seconds on a laptop with 4-core CPU, 16 GB RAM, SSD — as measured by a scripted benchmark against a fixed corpus

### Security

- NFR-02: Output files are created with 0600 permissions on POSIX systems — as measured by `stat --format '%a'` on the output path
- NFR-03: The tool does not write sensitive data to any temp file or log during processing — as measured by a capture harness that monitors filesystem writes during a benchmark run

### Reliability

- NFR-04: A match failure on one line does not abort processing of remaining lines — as measured by a golden-input test containing deliberately malformed lines
- NFR-05: The tool is idempotent: running twice on its own output produces byte-identical output — as measured by `sha256sum` of the first and second passes
