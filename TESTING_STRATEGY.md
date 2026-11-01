# Testing Strategy

## Current Baseline

The repository uses unit, ecosystem/CLI, and editor-host verification plus manual smoke checks:

- Vitest 5 with Vite 8 for fast unit tests around pure helper and parser-like logic.
  Limit execution to two workers because TypeScript services and real CLI child
  processes otherwise compete across every test file and can exceed case timeouts.
- `npm run test:ecosystem` for a production build and shared CLI check of the same canonical fixture using the published Core, Router, and Vite plugin
- `@koppajs/koppajs-kpa-check` smoke coverage through the published CLI package
- `@vscode/test-cli` for integration tests in a real VS Code extension host, pinned to the minimum supported VS Code 1.144.0 in `.vscode-test.mjs`
- `releaseWorkflow.test.ts` parses the hosted release YAML and verifies the OIDC-only publishing contract; actual token exchange is verified only during an authorized GitHub Actions release
- manual smoke checks for syntax-highlighting and packaging-adjacent behavior

CI runs `xvfb-run -a npm run validate` on Node.js 22.22.1, 24, and 26, and unit-test coverage is available through `npm run test:coverage`.

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
- dependency security regressions and real consumer contracts in `dependencySecurity`, `clientGlobCompatibility`, `toolingGlobCompatibility` and `toolingSerialization` tests
- idempotence and fail-closed version/source checks for `scripts/prepare-languageclient.mjs` in `languageClientPreparation` tests
- small generated positive and negative ZIP fixtures in `releaseArchive.test.ts` for required payloads, CommonJS metadata, forbidden entries, corrupt archives, and runtime/archive drift

### 2. Integration Tests

Use the VS Code test host for:

- explicit extension activation for `.kpa` documents
- provider registration
- diagnostics emitted for representative `.kpa` documents
- completion behavior in realistic editor contexts
- the current explicit-return runtime contract: double-brace diagnostics and completions must come from the server without legacy false warnings or private bindings

### 3. CLI Packaging And Runtime Checks

Use the shared CLI smoke check and release packaging check for:

- verifying that the published `@koppajs/koppajs-kpa-check` runtime still works from this repository
- verifying English presentation of shared diagnostics and HTML documentation, English local quick fixes, and repository CLI text/JSON output while preserving user content, diagnostic metadata, options and exit codes (`englishPresentation.test.ts`, `englishCli.test.ts`, provider-ownership and quick-fix tests)
- verifying VSIX creation/non-empty output and the explicit archive rules in `scripts/release-archive.mjs`, not exhaustive correctness of all packaged assets
- catching ESM/CJS regressions in built artifacts before release
- rerunning the real editor integration suite against workspace minified release bundles through `npm run test:integration:release`, invoked inside `scripts/check-release-package.mjs` between archive/workspace comparisons by `npm run release:check`

The release package contract requires inspecting the actual ZIP created by `vsce`, not only a file listing or a non-empty archive. The script reuses `yauzl` already installed through `@vscode/vsce`; this requires no dependency changes.

The archive must contain `extension/dist/extension.js`, `extension/dist/language-server.js`, and `extension/dist/package.json` with `type: "commonjs"`. Its `extension/package.json` must retain `main: "./dist/extension.js"` and the ESM root contract `type: "module"`. Reject `.diffuno`, `node_modules`, `src`, `out`, `test`, `tests`, and `scripts` directories, source files such as `.ts`/`.tsx`, and source maps (`.map`).

Before and after the release-host tests, compare the workspace `dist/extension.js`, `dist/language-server.js`, and `dist/package.json` byte-for-byte with their archived counterparts. The script owns the initial archive inspection, workspace comparisons, and intervening host invocation; an external `&& npm run test:integration:release` cannot enforce the post-test comparison. Do not rebuild development bundles between these checks.

The host remains the workspace Extension Development Host. It does not install or load the VSIX. Byte equality links three tested workspace artifacts to the archive, but does not prove installation, isolation from workspace files, behavior of an installed extension, or correctness of every other payload asset. `src/test/unit/releaseArchive.test.ts` covers valid/corrupt ZIPs, required files, forbidden entries, manifest drift, and byte drift using synthetic archives.

`release:check` recursively replaces `.local/release`, invokes production packaging into `dist/`, compiles tests into `out/`, and can populate the `.vscode-test/` download/test-host cache. `validate` includes those effects. Do not run either command with files you need to retain in `.local/release`.

### 4. Manual Smoke Tests

Required until automated coverage improves:

- open a `.kpa` file in an Extension Development Host
- verify syntax highlighting
- verify block/tag/attribute completion triggers
- verify warning diagnostics for malformed blocks

See [docs/quality/manual-smoke-checklist.md](docs/quality/manual-smoke-checklist.md).

## Runtime Versus Legacy Coverage

- Use `src/test/fixtures/ecosystem/counter-page.kpa` and the integration regression “uses the shared runtime contract for double-brace diagnostics and completions” for current `{{...}}` authoring with returned `state`/`props`/`methods`.
- Existing single-brace `{...}` cases in `diagnosticsEngine.test.ts`, `templateContext.test.ts`, `templateExpressions.test.ts`, and the editor suite protect legacy compatibility, not the current runtime contract.
- Shared CLI diagnostics follow the server/core path. Local legacy missing-binding warnings from `src/diagnostics.ts` are an explicit editor-only exception; do not require the CLI to reproduce them.
- Component importer references/rename are already cross-file; tests verify both importer files and exclude edits to the component source. Slot/emit quick fixes have shared-diagnostic unit/CLI roundtrips and real editor application/diagnostic-cleanup tests. Ownership tests and host assertions reject duplicate completions, symbols and Prop/import actions.

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
