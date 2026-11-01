# Spec: Dependency Compatibility

## Status

Active

## Summary

Dependency updates preserve the extension's editor contract and verify the published KoppaJS ecosystem through a production build, shared CLI diagnostics, and the real VS Code extension host.

## Description

The extension consumes published language packages rather than sibling checkouts. Language-core 0.2.2 and kpa-check 0.2.2 emit English messages and retain the default-slot and Prop assignment fixes from 0.2.1. The latest server is 0.2.1; its `^0.2.1` range resolves to the exact Core 0.2.2 selected in the release lockfile. Check requires Core `^0.2.2`. Core, Router, and the Vite plugin are development-only compatibility dependencies; they must not become extension runtime requirements.

## Inputs

- The pinned packages and lockfile in `package.json` and `package-lock.json`
- A canonical `.kpa` application fixture under `src/test/fixtures/ecosystem/`
- `npm run test:ecosystem`, `npm test`, and `npm run validate`

## Outputs

- A successful in-memory or temporary-directory Vite production build
- Successful shared CLI diagnostics for the same application fixture
- Existing editor integration tests passing against both development and minified release bundles

## Behavior

1. Install published package versions with a reproducible npm lockfile. The server
   and CLI must resolve the same language-core 0.2.2 instance; the legacy English
   adapter remains an idempotent fallback, not a replacement for current upstream
   English messages.
2. Run the ecosystem fixture through the Vite plugin with Core and Router imports.
3. Check the same fixture using the published kpa-check CLI.
4. Apply the guarded client 11.0.0/minimatch 11.0.3 API migration during postinstall: replace only the two removed `makeRe()` boolean checks with empty parsed-alternative checks. Verify both original source hashes before any write; reject unknown sources or versions and allow repeat application.
5. Run dependency security regressions and real client/tooling consumer contracts before accepting version-scoped major overrides.
6. Run existing unit, CLI, editor-host, and release-package checks.

## Constraints

- Node.js support is `^22.22.1 || ^24.0.0 || >=26.0.0`; VS Code support starts at 1.144.0, aligned with the editor API types.
- TypeScript 6.0.3 satisfies the shared core and TypeScript-ESLint contracts; TypeScript 7 is not yet compatible with both.
- Node 22 API types preserve the minimum Node API surface.
- Exact, tested parent overrides install minimatch 11.0.3, glob 14.0.3, Mocha diff 8.0.3 and serialize-javascript 7.1.4. The affected direct consumers remain pinned until their overrides and adaptation are reviewed.
- File-operation patterns accept minimatch 11 Bash-style negative extglob suffix semantics and Unicode case folding when `ignoreCase` is enabled. Diagnostic/notebook selectors retain `noext: true`; leading negation, empty/comment rejection and literal unmatched brackets remain covered by actual client-helper tests.
- Browser rendering and navigation are not validated by a production build.
- Current `{{...}}` runtime expressions defer to the shared language server; single-brace local providers remain legacy editor compatibility. The adapter boundary is covered by an editor-host regression.

## Edge Cases

- Build or diagnostic failures must fail the compatibility command.
- Temporary output must not enter the release package.
- Minification must retain statically detectable `activate` and `deactivate` exports for the VS Code ESM loader; release checks run the real editor suite without recompiling development bundles.
- Registry security findings are assessed separately; unsupported forced overrides are not an acceptable substitute for compatibility testing.

## Acceptance Criteria

- `npm ci` applies the client adaptation reproducibly and resolves without invalid peer dependencies; `npm ls --all` succeeds.
- Full and production-only `npm audit` report zero findings for the reviewed lockfile; future registry findings require a fresh assessment.
- Installs with lifecycle scripts disabled must explicitly run `node scripts/prepare-languageclient.mjs` before tests or packaging.
- `npm run test:ecosystem` builds and checks the same canonical fixture successfully.
- `npm run validate` passes, including editor integration and VSIX creation.
- `npm run test:coverage` works with matching Vitest and coverage-provider versions.
- Minimum versions and deliberate exceptions are documented in the tooling baseline.

## Evolution

- `evolution_phase`: dependency-maintenance
- `completeness_level`: build-cli-editor
- `known_gaps`:
  - the ecosystem fixture does not execute browser navigation or reactive rendering
  - legacy single-brace provider semantics are editor compatibility rather than current runtime parity
- `deferred_complexity`:
  - browser-level ecosystem behavior tests
- `technical_debt_items`:
  - revisit TypeScript 7 when shared language packages and TypeScript-ESLint support it
