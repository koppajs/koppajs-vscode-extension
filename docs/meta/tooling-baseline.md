# Tooling Baseline

## Scope

This repository is a bundled VS Code extension. It does not ship a standalone browser UI or maintain first-class CSS assets, so the quality baseline is optimized for TypeScript runtime logic, editor behavior, and packaging correctness.

## Active Tooling

| Tool                | Purpose                                                               | Entry Point                                  |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| ESLint              | Static analysis for TypeScript, config scripts, and Node-facing files | `npm run lint`                               |
| Prettier            | Consistent formatting for code, config, JSON, and Markdown            | `npm run format`, `npm run format:check`     |
| Vitest              | Fast unit tests for pure helpers and parser-like logic                | `npm run test:unit`, `npm run test:coverage` |
| `@vscode/test-cli`  | Integration tests in a real VS Code extension host                    | `npm run test:integration`                   |
| Husky + lint-staged | Fast staged-file protection before commit                             | Git `pre-commit` hook                        |
| GitHub Actions      | Repository-wide validation on push and pull request                   | `.github/workflows/ci.yml`                   |

## Deliberate Non-Choices

### No Playwright

Playwright is intentionally not part of this repository because there is no standalone user-operable web UI. The extension surface is the VS Code editor host, which is covered more directly by VS Code integration tests and manual smoke checks.

Revisit this only if the repository gains a real preview app, Storybook, demo site, or another browser-based UI that users can operate independently.

### No Stylelint

Stylelint is intentionally not part of this repository because the codebase does not contain maintained CSS, SCSS, or design-token source files. Embedded CSS snippets inside completion catalogs do not justify a separate stylesheet linting layer.

Revisit this only if styling assets become first-class source files in the repo.

## Quality Flow

1. `npm install` installs dependencies and wires Git hooks through Husky.
2. `npm run format:check` verifies formatting.
3. `npm run lint` verifies TypeScript and script quality.
4. `npm run typecheck` verifies source and test TypeScript.
5. `npm run test:unit` verifies pure helper behavior quickly.
6. `npm run test:integration` verifies extension behavior in the VS Code host.
7. `npm run validate` runs the full baseline expected before merge.

## Test Layer Guidance

- Put pure parsing, block detection, and text-position logic in modules without a runtime `vscode` dependency so Vitest can cover them cheaply.
- Keep VS Code host tests focused on activation, provider registration, diagnostics publication, and realistic editor interactions.
- Keep manual smoke tests for syntax highlighting and packaging-adjacent behavior that is expensive or brittle to automate.

## Evolution Rules

- If a workflow change affects scripts, hooks, CI, or validation order, update this document in the same change.
- If the repo gains a real UI or real styling source files, explicitly document whether Playwright or Stylelint should be introduced instead of adding them ad hoc.
- Do not add a second tool for the same job unless the current tool cannot cover the need without unacceptable complexity.
