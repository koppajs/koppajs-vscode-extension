# VS Code Koppa Extension Development Guide

## Prerequisites

- Node.js >= 22 (`.nvmrc` defaults to `22`)
- `npm`

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

Build the release `.vsix` and verify the package payload:

```bash
npm run release:check
```

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

`npm test` runs both automated layers. `npm run test:watch` watches the unit suite.

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
