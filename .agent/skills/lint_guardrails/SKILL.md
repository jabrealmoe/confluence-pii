---
name: quality_guardrails
description: Protocol to ensure code quality through linting and standardized commit messages.
---

# Quality Guardrails Skill

This skill ensures that code is consistently high-quality and the repository history is easy to manage by enforcing linting and Conventional Commits standards.

## Instructions

Whenever you are about to:

1. **Commit changes** to the repository.
2. **Deploy the application** using the Forge CLI.
3. **Finish a major feature** implementation.

**YOU MUST** perform the following steps:

### 1. Linting Guardrail

Run the Root Lint Check to ensure no regressions or code quality issues exist in the backend/trigger logic:

```bash
npm run lint
```

- **Errors**: You **MUST** fix all errors before committing.
- **Warnings**: Review all warnings. Clean up unused variables or imports to maintain code health.

### 2. Commit Standard (Conventional Commits)

All commit messages **MUST** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
Format: `<type>[optional scope]: <description>`

**Allowed Types:**

- `feat`: A new feature (correlates with `MINOR` in Semantic Versioning).
- `fix`: A bug fix (correlates with `PATCH` in Semantic Versioning).
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process or auxiliary tools and libraries.

**Example**: `feat(admin): add interactive SVG chart to privacy dashboard`

### 3. Frontend Review

The code in `static/admin` is not currently covered by the root lint check. When modifying files in `static/admin/`, perform a manual review for:

- Unused imports/variables.
- Proper React hook usage.
- Accessibility and performance.

## CI/CD Integration

The GitHub Actions workflow in `.github/workflows/main.yml` relies on high quality standards. Standardized commits allow the `versioning` stage to accurately determine the next Semantic Version (Patch vs. Minor) for production releases.
