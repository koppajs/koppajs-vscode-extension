# ADR 0004: Establish Quality Tooling Baseline

## Context

The repository had working extension code but an unreliable meta layer:

- the automated test file was a placeholder,
- the VS Code test CLI was referenced without an explicit dependency,
- formatting was not enforced by repository tooling,
- workspace settings referenced tools that the repo did not actually configure,
- and no CI workflow enforced the documented quality gates.

The project is a VS Code extension, not a standalone web application. Its quality needs are centered on TypeScript logic, VS Code host behavior, and packaging discipline rather than browser E2E automation.

## Decision

The repository standardizes on this tooling baseline:

- ESLint for TypeScript and Node/config files
- Prettier for formatting
- Vitest for pure unit-testable helper logic and coverage reporting
- `@vscode/test-cli` for VS Code host integration tests
- Husky plus lint-staged for lightweight staged-file checks
- GitHub Actions for repository-wide validation via `npm run validate`

The repository also makes these deliberate exclusions:

- no Playwright until the repo gains a real standalone UI surface,
- no Stylelint until the repo gains maintained stylesheet source files.

To support this split, diagnostics parsing and text-context helpers should live in pure modules whenever practical, while VS Code object creation stays in runtime-facing modules.

## Consequences

- Contributors get a clear local baseline: format, lint, typecheck, unit test, integration test, validate.
- CI enforces the same baseline used locally.
- Coverage is meaningful for the unit-testable helper layer without pretending Electron-host integration coverage is solved.
- Tooling drift is reduced because workspace recommendations, scripts, hooks, and docs now point to the same set of tools.

## Alternatives Considered

- Keep only VS Code host tests and skip a unit-test layer. This would make parser and text-analysis coverage slower and harder to maintain.
- Add Playwright as a generic E2E layer. This would not match the repository surface because there is no standalone browser UI to exercise.
- Add Stylelint because CSS appears in embedded-language support. The repo does not maintain first-class CSS source files, so the extra tool would add overhead without protecting a real source surface.
