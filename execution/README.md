# Layer 3: Execution (Doing the work)

This directory contains deterministic Python scripts that perform the actual work.

## Principles
- Scripts should be reliable, testable, and fast.
- Handle API calls, data processing, file operations, and database interactions here.
- Environment variables and API tokens are stored in `.env` (never commit this).
- Use scripts instead of manual work whenever possible to ensure consistency.

## Organization
- Keep scripts modular and well-commented.
- Requirements should be documented (e.g., `requirements.txt`).
