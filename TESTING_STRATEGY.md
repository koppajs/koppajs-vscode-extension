# Testing Strategy

## Current Baseline

The repository uses three automated verification layers plus manual smoke checks:

- Vitest for fast unit tests around pure helper and parser-like logic
- `@koppajs/koppajs-kpa-check` smoke coverage through the published CLI package
- `@vscode/test-cli` for integration tests in a real VS Code extension host
- manual smoke checks for syntax-highlighting and packaging-adjacent behavior

CI runs `xvfb-run -a npm run validate` on Node.js 22 and 24, and unit-test coverage is available through `npm run test:coverage`.

## Test Philosophy

- Prefer the cheapest test that protects the behavior being changed.
- Put parser-like and block-detection logic under focused tests.
- Use VS Code integration tests for activation, provider registration, and end-to-end editor behavior.
- Keep the published CLI smoke-covered so the extension does not drift away from the shared diagnostics release surface.
- Keep manual smoke testing explicit until CI coverage exists.

## Test Pyramid

### 1. Unit Tests

Use for pure or near-pure logic:

- block-context detection in `src/utils/blockUtils.ts`
- `.kpa` parsing and document modeling in `src/language/`
- HTML opening-tag detection in `src/utils/htmlUtils.ts`
- diagnostics rules driven by parsed `.kpa` documents
- narrow string or position analysis helpers

### 2. Integration Tests

Use the VS Code test host for:

- explicit extension activation for `.kpa` documents
- provider registration
- diagnostics emitted for representative `.kpa` documents
- completion behavior in realistic editor contexts

### 3. CLI Packaging And Runtime Checks

Use the shared CLI smoke check and release packaging check for:

- verifying that the published `@koppajs/koppajs-kpa-check` runtime still works from this repository
- verifying that the extension packages into a `.vsix` without shipping unintended files
- catching ESM/CJS regressions in built artifacts before release

### 4. Manual Smoke Tests

Required until automated coverage improves:

- open a `.kpa` file in an Extension Development Host
- verify syntax highlighting
- verify block/tag/attribute completion triggers
- verify warning diagnostics for malformed blocks

See [docs/quality/manual-smoke-checklist.md](docs/quality/manual-smoke-checklist.md).

## Fixture Policy

- Use fixture `.kpa` documents in unit tests when parser or diagnostics behavior
  would otherwise be harder to read inline.
- Keep integration tests focused on real VS Code host behavior rather than
  reproducing every parser case there.

## Non-Goals

- No Playwright baseline: the repository has no standalone UI surface outside the VS Code editor host.
- No browser coverage target: numeric coverage currently applies to the unit-testable helper layer, not Electron-host integration tests.

## Required Test Coverage by Change Type

| Change Type                       | Minimum Expectation                                                |
| --------------------------------- | ------------------------------------------------------------------ |
| Pure helper change                | Unit tests                                                         |
| Diagnostics behavior change       | Unit or integration tests plus smoke verification                  |
| Completion trigger/content change | Integration tests or isolated helper tests plus smoke verification |
| Grammar-only change               | Manual smoke verification and spec/doc update                      |
| Large structural refactor         | Tests for changed behaviors plus ADR                               |
| Release or packaging change       | `npm run release:check` plus the relevant docs/workflow update     |

## Mocking Policy

- Prefer real VS Code objects in integration tests.
- Prefer thin stubs over broad `vscode` mocks when isolating helper logic.
- Do not hide broken integration behavior behind deep mocks.

## Coverage Expectations

- The repository does not currently enforce numeric coverage thresholds.
- `npm run test:coverage` reports coverage for the unit-testable helper layer.
- New non-trivial pure logic should extend unit coverage.
- If tests cannot be added immediately, document the gap and add a roadmap item.

## Exit Criteria for Behavior Changes

A user-visible change is ready when:

- the relevant spec is updated,
- the relevant tests or smoke checklist are updated,
- the implementation matches the spec,
- and the documentation no longer contradicts the code.
