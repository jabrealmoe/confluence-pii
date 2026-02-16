---
name: lint_guardrails
description: Protocol to ensure code quality by running linting before major actions.
---

# Lint Guardrails Skill

This skill ensures that code is consistently linted to prevent CI/CD failures on GitHub Actions.

## Instructions

Whenever you are about to:

1. Commit changes to the repository.
2. Deploy the application using the Forge CLI.
3. Finish a major feature implementation.

**YOU MUST** perform the following steps:

1. **Run the Root Lint Check**:

   ```bash
   npm run lint
   ```

   This checks all files in the `src/` directory.

2. **Resolution Protocol**:
   - If there are any **Linting Errors**: You **MUST** fix them before proceeding with a commit or deployment.
   - If there are **Linting Warnings**: Review them. If they indicate unused variables or potential issues, clean them up to keep the codebase maintainable.

3. **Frontend Awareness**:
   The code in `static/admin` is not currently covered by the root lint check. When modifying files in `static/admin/`, perform a manual review for code quality, unused variables, and proper React patterns.

## GitHub Actions Integration

The "Comprehensive Forge CI/CD" workflow in `.github/workflows/main.yml` includes a `qa` stage that runs `npm run lint`. If this stage fails, the deployment will stop. Running linting locally ensures a smooth PR and deployment process.
