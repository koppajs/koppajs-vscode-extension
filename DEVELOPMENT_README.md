# VS Code Koppa Extension Development Guide

## Prerequisites

- Node.js `^22.22.1 || ^24.0.0 || >=26.0.0` (`.nvmrc` defaults to `22.22.1`)
- npm >= 10
- VS Code >= 1.144.0

Install dependencies:

```bash
npm install
```

`npm install` also wires the repository's Husky Git hook baseline.

## Local Development

Compile the extension bundle:

```bash
npm run compile
```

Watch for changes during development:

```bash
npm run watch
```

Compile the VS Code integration test bundle:

```bash
npm run compile-tests
```

Run linting:

```bash
npm run lint
```

Run formatting checks:

```bash
npm run format:check
```

Run the full validation baseline:

```bash
npm run validate
```

Build the release `.vsix`, check its archive contract, and test the workspace minified bundles in the editor host:

```bash
npm run release:check
```

`release:check` runs `scripts/check-release-package.mjs`: it packages with `vsce`, checks that the VSIX exists and is non-empty, calls `scripts/release-archive.mjs` for archive checks, and runs `test:integration:release`. The archive helper resolves `yauzl` through `@vscode/vsce`.

It requires `extension/dist/extension.js`, `extension/dist/language-server.js`, and `extension/dist/package.json` with `type: "commonjs"`. The archived `extension/package.json` must use `main: "./dist/extension.js"` and `type: "module"`. The archive must exclude `node_modules`, `src`, `out`, `test`, `tests`, and `scripts` directories, source files such as `.ts`/`.tsx`, and `.map` files.

Workspace `dist/extension.js`, `dist/language-server.js`, and `dist/package.json` must match the archive byte-for-byte before and after the host tests, and the VSIX must remain unchanged during testing. These are bounded archive-contract checks, not a complete validation of every payload asset. The tests run in the workspace Extension Development Host, not an installed VSIX; they can still read workspace fixtures. Byte equality does not prove installation or isolation. The manual installation steps below are separate.

Local side effects: `release:check` recursively replaces `.local/release` before packaging. The `vscode:prepublish` lifecycle rebuilds production output in `dist/` (including source maps and the CommonJS marker); `test:integration:release` compiles tests into `out/` without rebuilding development bundles. The VS Code runner may download and populate the `.vscode-test/` editor cache and test-host state. `validate` includes this release check, so it has the same effects in addition to its earlier build/test steps. Save anything needed from `.local/release` before running either command.

## Running Tests

Fast unit tests use Vitest:

```bash
npm run test:unit
```

Coverage currently targets the unit-testable helper layer:

```bash
npm run test:coverage
```

VS Code host integration tests use the VS Code test runner:

```bash
npm run test:integration
```

`npm test` runs unit, CLI, ecosystem production-build, and editor-host checks.
`npm run test:ecosystem` checks the same canonical KPA fixture with the published
Vite plugin/Core/Router build and kpa-check diagnostics. `npm run test:watch` watches the unit suite.

## Optional Repository Audit Utility

Generate a repository dump for AI-assisted audits:

```bash
npm run dump:ai
```

The script writes outputs under `.local/`. ZIP creation remains optional and is
skipped automatically when its extra dependency is unavailable.

## Packaging

Create the production extension bundle:

```bash
npm run package
```

If you want to build a `.vsix`, use the VS Code packaging tool explicitly:

```bash
npx @vscode/vsce package
```

## Installing a `.vsix`

1. Open Visual Studio Code.
2. Open the Extensions view.
3. Open the Extensions view menu.
4. Select `Install from VSIX...`.
5. Choose the generated `.vsix` file.

## Related Docs

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [docs/meta/tooling-baseline.md](./docs/meta/tooling-baseline.md)
