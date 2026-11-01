# Tooling Baseline

## Scope

This repository is a bundled VS Code extension. It does not ship a standalone browser UI or maintain first-class CSS assets, so the quality baseline is optimized for TypeScript runtime logic, editor behavior, and packaging correctness.

## Active Tooling

| Tool                | Purpose                                                               | Entry Point                                  |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| ESLint              | Static analysis for TypeScript, config scripts, and Node-facing files | `npm run lint`                               |
| Prettier            | Consistent formatting for code, config, JSON, and Markdown            | `npm run format`, `npm run format:check`     |
| Vitest              | Fast unit tests for pure helpers and parser-like logic                | `npm run test:unit`, `npm run test:coverage` |
| `@vscode/vsce`      | VS Code extension packaging and `.vsix` payload verification          | `npm run release:check`                      |
| `@vscode/test-cli`  | Integration tests in a real VS Code extension host                    | `npm run test:integration`                   |
| Husky + lint-staged | Fast staged-file protection before commit                             | Git `pre-commit` hook                        |
| GitHub Actions      | Repository-wide validation on push and pull request                   | `.github/workflows/ci.yml`                   |

## Release Authentication

The tag-driven `release.yml` publishes its validated VSIX with `vsce --oidc`. Only the publishing job receives `contents: write` and `id-token: write`; no Marketplace PAT is stored or passed. The Trusted Publishing policy binds `koppajs/koppajs-vscode-extension` to workflow filename `release.yml` without an environment. See `RELEASE.md` and `docs/specs/release-publishing.md`; local YAML contract tests do not prove live token exchange.

## Release Package Verification

`scripts/check-release-package.mjs` owns the `release:check` sequence: package with `vsce`, read and verify the real ZIP, invoke `npm run test:integration:release`, and verify the archive/workspace correspondence again. The host tests run inside the script between archive checks, not as an external `&&` command. ZIP inspection reuses `yauzl` already installed through `@vscode/vsce`; no dependency changes are required.

The archive contract requires `extension/dist/extension.js`, `extension/dist/language-server.js`, and `extension/dist/package.json` with `type: "commonjs"`. The archived `extension/package.json` retains `main: "./dist/extension.js"` and the ESM root `type: "module"`. Reject `node_modules`, `src`, `out`, `test`, `tests`, and `scripts` directories, source files such as `.ts`/`.tsx`, and source maps (`.map`).

Compare workspace `dist/extension.js`, `dist/language-server.js`, and `dist/package.json` byte-for-byte with the archive before and after the host tests, without rebuilding development bundles. These tests use the workspace Extension Development Host, not an installed VSIX. Byte equality connects tested artifacts to the package, but does not verify installation or independence from workspace files.

## Dependency Compatibility

- Supported Node.js versions are `^22.22.1 || ^24.0.0 || >=26.0.0`; lint-staged 17 sets the Node 22 floor, and the shared language packages exclude unsupported odd Node releases. CI covers the minimum Node 22 release plus Node 24 and 26.
- ESLint 10 uses `eslint.config.mjs`; `@eslint/js` and `globals` preserve the recommended Node and TypeScript rule sets.
- Vitest 5 and its matching coverage provider use Vite 8, which also satisfies the Vite plugin 2 peer contract.
- VS Code and `@types/vscode` start at 1.144.0. This deliberately aligns the current editor API types with the supported host; language client/server 11 use the matching LSP 3.18 line.
- TypeScript stays on 6.0.3: the shared language core requires 6.x and TypeScript-ESLint 8.72 supports TypeScript below 6.1, not TypeScript 7. Node16 module resolution supports modern package exports; `src/package.json` retains CommonJS emit for Webpack and extension-host tests without deprecated node10 resolution. Webpack overrides emit to ESNext/Bundler internally and uses static CommonJS output so minification does not hide activation exports from the VS Code ESM loader.
- `@types/node` stays on the latest Node 22 release to avoid accidentally depending on newer Node APIs than the minimum supported development runtime.
- Internal KoppaJS packages are pinned to published registry versions. Language core and check use 0.2.2; server stays on its latest published 0.2.1 and resolves Core 0.2.2 through its `^0.2.1` range in the lockfile; check requires `^0.2.2`; development-only Core 3.0.12, Router 0.1.9, and Vite plugin 2.0.1 are exercised through `npm run test:ecosystem`. No unpublished sibling checkout is substituted into release dependencies.
- Registry audit findings must be reported separately from compatibility. Do not force major transitive overrides or downgrade current direct packages merely to silence an audit warning without tests proving the replacement contract.

## Security Audit Review (2026-10-31)

The dependency-update baseline reproduced **19 audit entries (1 low, 17 moderate, 1 high)**. The serializer fix first reduced this to 18. After the completed remediation, **both the full audit and the production-only audit report 0 findings**. Counts include propagated package entries, not independent exploitable application paths.

### Explicit, Tested Dependency Exceptions

| Root cause                                                                                                                                                                                                                            | Patched version installed | Integration                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [minimatch globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), fixed from 11.0.1                                                                                                                             | 11.0.3                    | Version-scoped overrides for client 11.0.0, ESLint 10.14.0/config-array 0.23.5, TypeScript-estree 8.72.1, test-cli 0.0.15, vsce 4.1.0, Mocha 11.8.0, test-exclude 8.0.0 and glob 14.0.3. |
| [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), fixed from 14.0.2                                                                                                                                      | 14.0.3                    | Scoped to test-cli 0.0.15, Mocha 11.8.0 and test-exclude 8.0.0.                                                                                                                          |
| [diff patch-parsing DoS](https://github.com/advisories/GHSA-73rr-hh4g-fpgx), fixed for the installed line from 8.0.3                                                                                                                  | 8.0.3                     | Scoped to Mocha 11.8.0. This is the smallest patched major; no need to adopt diff 9.                                                                                                     |
| serialize-javascript [code injection](https://github.com/advisories/GHSA-5c6j-r48x-rmvq), [array-like DoS](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v), [function-body XSS](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) | 7.1.4                     | Scoped to Mocha 11.8.0; upstream fixes begin at 7.0.3, 7.0.5 and 7.1.3 respectively.                                                                                                     |

The owning packages still declare older transitive majors. These are deliberate tested exceptions, not global overrides, forced downgrades, audit suppressions, or claims that upstream already supports the replacements. The four affected direct consumers (client, ESLint, test-cli and vsce) are pinned to their reviewed versions so npm can enforce exact parent selectors. Reassess every selector when updating its owner; remove exceptions once upstream accepts patched dependencies natively. Node requirements remain within the repository's supported range.

### Reproducible Client API Migration

minimatch 11 removes `Minimatch.makeRe()` and matches without generating a JavaScript RegExp. A bare override breaks the client: 29 of the original 31 client contract tests fail. `scripts/prepare-languageclient.mjs` adapts only two boolean checks in client 11.0.0, in `lib/common/fileOperations.js` and `lib/common/utils/globPattern.js`, from `!matcher.makeRe()` to `matcher.set.length === 0`. This preserves rejection of empty/comment patterns while leaving the actual matching, options and path normalization to the real minimatch implementation. It does not add a fake `makeRe` or bring back the vulnerable regex engine.

The root `postinstall` runs the script during `npm install` and `npm ci`. It verifies client 11.0.0, the client's resolved minimatch 11.0.3, and SHA-256 hashes of both original files before writing either. Repeated runs are idempotent; unknown versions or source changes abort installation and require review. Installs with `--ignore-scripts` alone are not build-ready: run `node scripts/prepare-languageclient.mjs` before testing or packaging. See [ADR 0006](../adr/0006-use-guarded-dependency-security-adaptations.md).

The new engine deliberately changes uncommon patterns: negative extglobs with suffixes follow Bash-style matching (for example `**/!(a)*` can match `/workspace/a.kpa`), and case-insensitive matches use Unicode folding (`k`/`K`, `s`/`ſ`). These differences are explicitly tested and accepted for server-supplied file-operation filters. Diagnostic/notebook selectors retain `noext: true`. Leading negation, empty/comment rejection, literal unmatched brackets, invalid ranges, directory matching, dotfiles, Windows-normalized paths and relative selectors have dedicated tests. The bundled server currently advertises neither file-operation filters, notebooks nor pull diagnostics.

### Exposure and Verification Boundaries

- minimatch is embedded in the extension bundle: excluding `node_modules` from the VSIX never removed the vulnerable code. Production bundles must be rebuilt after installation. The former client calls used optimization level 1, outside the specific amplification prerequisite (>=2); the fix now removes the affected implementation rather than relying on that limited reachability argument.
- Development glob callers use level 2. The regression tests resolve dependencies from each real consumer, cap a tiny amplification case, verify that cancellation stops further directory reads, and parse the three problematic filename separators under a bounded VM timeout. All 14 security cases failed before the overrides and pass with the patched packages.
- Mocha serializes and evaluates worker options, but normal editor tests set `parallel: false`. Serializer tests also exercise a real worker run. Its reporter uses `createPatch`/`diffWordsWithSpace`, not the vulnerable parsing APIs; both reporter modes remain tested.
- Compatibility tests exercise actual installed client helpers with only the VS Code API stubbed, plus ESLint discovery, TypeScript-estree project selection, test-cli discovery, test-exclude sync/async discovery, VSCE ignore handling and Mocha collection/reporters. The client source, matching packages and reporters are not replaced by test shims.
- Guard tests cover repeat application and rejection of unknown client versions, matcher versions and source content before any file is written.

Reproduce with `npm ci`, `npm audit`, `npm audit --omit=dev` and `npm ls --all`. Run `npm run check:docs` before broader checks, then `npm run validate` and `npm run test:coverage`. A zero audit count is a registry snapshot, not proof that arbitrary patterns or untrusted test code are safe. Keep build/test configuration trusted and untrusted contributions isolated from credentials.

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
6. `npm run test:cli` verifies the shared diagnostics CLI still works from this repo.
7. `npm run test:integration` verifies extension behavior in the VS Code host.
8. `npm run release:check` verifies the real release ZIP and byte equality with workspace artifacts before and after the minified-bundle integration tests in the workspace Extension Development Host; it does not install the VSIX.
9. `npm run validate` runs the full baseline expected before merge.

## Test Layer Guidance

- Put pure parsing, block detection, and text-position logic in modules without a runtime `vscode` dependency so Vitest can cover them cheaply.
- Keep VS Code host tests focused on activation, provider registration, diagnostics publication, and realistic editor interactions.
- Keep manual smoke tests for syntax highlighting and packaging-adjacent behavior that is expensive or brittle to automate.

## Evolution Rules

- If a workflow change affects scripts, hooks, CI, or validation order, update this document in the same change.
- If the repo gains a real UI or real styling source files, explicitly document whether Playwright or Stylelint should be introduced instead of adding them ad hoc.
- Do not add a second tool for the same job unless the current tool cannot cover the need without unacceptable complexity.
