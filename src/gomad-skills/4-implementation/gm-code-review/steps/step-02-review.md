---
failed_layers: '' # set at runtime: comma-separated list of layers that failed or returned empty
---

# Step 2: Review

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- The Blind Hunter subagent receives NO project context — diff only.
- The Edge Case Hunter subagent receives diff and project read access.
- The Acceptance Auditor subagent receives diff, spec, and context docs.

## INSTRUCTIONS

1. If `{review_mode}` = `"no-spec"`, note to the user: "Acceptance Auditor skipped — no spec file provided."

2. Launch parallel subagents without conversation context. If subagents are not available, generate prompt files in `{implementation_artifacts}` — one per reviewer role below — and HALT. Ask the user to run each in a separate session (ideally a different LLM) and paste back the findings. When findings are pasted, resume from this point and proceed to step 3.

   - **Blind Hunter** — receives `{diff_output}` only. No spec, no context docs, no project access. Invoke via the `gm-review-adversarial-general` skill.

   - **Edge Case Hunter** — receives `{diff_output}` and read access to the project. Invoke via the `gm-review-edge-case-hunter` skill.

   - **Acceptance Auditor** (only if `{review_mode}` = `"full"`) — receives `{diff_output}`, the content of the file at `{spec_file}`, and any loaded context docs. Its prompt:
     > You are an Acceptance Auditor. Review this diff against the spec and context docs.
     >
     > **Standard checks** — flag findings for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code.
     >
     > **Story-contract checks** — only if the spec contains the corresponding sections:
     >
     > 1. **Real-World Verification Evidence** (only if spec has a `## Real-World Verification` section). Locate the `### Real-World Verification Evidence` slot under Dev Agent Record in the spec. Flag each of these as a separate finding:
     >    - The Evidence slot is missing or empty.
     >    - For `Mode: real-world`: any Real-World Verification table row in the spec has no corresponding evidence entry, OR an entry says only "tests pass" / "verified" / "works as expected" without an actual command run + actual observed output (log excerpt, screenshot path, or response body).
     >    - For `Mode: test-only-justified`: the slot lacks the actual run-output of the strongest-available verification named in the spec (test-suite run summary, before/after benchmark numbers, reviewer-reading note). "Tests pass" alone is not evidence here either.
     >    - The Evidence text appears fabricated (claims output that contradicts the diff — e.g., evidence says "HTTP 201 returned" but the route in the diff returns 200; evidence references a table/column not present in the migration; evidence references a file not in the File List). Quote the contradicting line of the diff as proof.
     >    - The dev recorded "could not run X" honestly (e.g., "real upstream unreachable, deferred to review"). This is NOT a finding against the dev — but DO surface it as a `decision_needed` finding so the user explicitly accepts the un-verified AC, narrows the spec, or unblocks the missing dependency.
     >
     > 2. **Anti-Acceptance compliance** (only if spec has a `## Anti-Acceptance` section). Scan the diff for each forbidden pattern listed in that section. Flag each match with the exact diff location and quote:
     >    - Mock-only test pass treated as evidence (e.g., new tests asserting only against mocked dependencies; integration tests where the real upstream/DB is replaced with stub or in-memory fake).
     >    - `console.log` / `print` of an expected value in lieu of producing it.
     >    - `TODO` / `FIXME` / "wire later" comments in code paths reachable by any AC.
     >    - Hardcoded fixture responses returned from a route or function in lieu of real logic.
     >    - Disabled, skipped, or `.only`'d tests in changed files (`it.skip`, `xit`, `describe.skip`, `@Disabled`, `@pytest.mark.skip`, etc.).
     >    - "Compiles" / "type-checks" claimed as Real-World Verification evidence without an actual real-system run.
     >    - Any project-specific bullet listed in the spec's Anti-Acceptance section that you find in the diff.
     >
     > Output findings as a Markdown list. Each finding: one-line title, which AC / constraint / contract-section it violates (e.g., "Real-World Verification Evidence — AC#2 missing", "Anti-Acceptance — mock-only test pass at <file>:<line>"), and evidence from the diff or spec.

3. **Subagent failure handling**: If any subagent fails, times out, or returns empty results, append the layer name to `{failed_layers}` (comma-separated) and proceed with findings from the remaining layers.

4. Collect all findings from the completed layers.


## NEXT

Read fully and follow `./step-03-triage.md`
