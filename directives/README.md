# Directives (Layer 1)

This directory contains Standard Operating Procedures (SOPs) written in natural language Markdown.

## Structure of a Directive
Each directive defined here describes:
1. **Goal**: High-level target or task statement.
2. **Inputs**: Parameters, credentials, or initial files required.
3. **Execution Scripts**: Python scripts in `execution/` to invoke for deterministic steps.
4. **Outputs**: Expected intermediate artifacts (placed in `.tmp/`) or final cloud deliverables.
5. **Edge Cases & Learnings**: Guidelines for handling known rate limits, retries, and API specifics.

Directives are living documents. As the agent encounters errors or new constraints, it will update the corresponding directive during self-annealing.
