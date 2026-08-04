# Execution Scripts (Layer 3)

This directory contains deterministic Python scripts used for executing automated work.

## Guidelines
- Scripts must be deterministic, well-commented, and reliable.
- Load environment variables from `.env` (e.g., using `python-dotenv`).
- Store temporary data and intermediate files in `.tmp/`.
- Handle API calls, data transformations, and system interactions here rather than performing manual inline work in LLM loops.
