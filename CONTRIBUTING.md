<a id="contributing-top"></a>

<!-- PROJECT LOGO -->
<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<!-- TITLE -->
<div align="center">
  <h1 align="center">Contributing to KoppaJS Projects</h1>
  <h3 align="center">Build with intention. Contribute with clarity.</h3>
  <p align="center">
    <i align="center">A framework powered by simplicity, transparency, and responsibility.</i>
  </p>
</div>

<br>

---

## Philosophy

> _"Only start things you're willing to finish with dedication."_

KoppaJS is more than a codebase — it is a declaration of intent.
A belief that frontend work can be **simple**, **transparent**, and **elegant**, without the noise of unnecessary abstraction.

KoppaJS follows **Intentional Architecture**:

- **No factories. No classes. No magic.**
  Everything is functional, explicit, and traceable.

- **Every behavior is explainable.**
  No invisible lifecycles, no hidden state transitions.

- **Data flows by reference.**
  Never duplicate what can be shared.

- **The developer is in control.**
  KoppaJS never overrides your intent.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Requirements

Before contributing, ensure you have:

- **Node.js ≥ 20**
- **pnpm ≥ 10.24.0**

Install dependencies:

```bash
pnpm install
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Development Setup

### 1. Build the project

```bash
pnpm build
```

This performs:

- Type checking via `pnpm typecheck`
- Bundling with Vite
- Generation of public type definitions via `pnpm generate:types`

### 1.1 Optional: Run build steps individually

```bash
# Type-check the source using config/tsconfig.json
pnpm typecheck

# Generate public type definitions using tsconfig.types.json
pnpm generate:types
```

### 2. Run tests

```bash
pnpm test
```

Generate coverage:

```bash
pnpm test:coverage
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Code Style & Quality

KoppaJS enforces strict consistency through:

- **ESLint (Flat Config)**
- **Prettier**
- **TypeScript strict mode**

Validate lint rules:

```bash
pnpm lint
```

Fix formatting:

```bash
pnpm format
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Commit Conventions

We use **Conventional Commits** (Gitmojis optional).

Example:

```
feat: ✨ add support for 'processed' lifecycle hook
```

All commit messages are validated through Husky and Commitlint.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Commit Hook Setup

Install Husky:

```bash
pnpm prepare
```

Ensure `.husky/commit-msg` exists and is executable.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Testing Guidelines

KoppaJS uses **Vitest** with the **Three Test Rule**:

- **Valid Case** — expected use
- **Error Case** — invalid input
- **Edge Case** — unusual but valid scenario

Additional rules:

- One `describe()` per function
- Each exported utility gets 3 `it()` blocks
- Test folder mirrors the source structure
- No global mocks
- Clear, explicit test data

### Current Test Coverage

- **248 tests** across **17 test files**
- **78% statement coverage**, **68% branch coverage**, **90% function coverage**, **80% line coverage**
- All tests passing with clean output (logger suppression in test environment)
- Comprehensive component registration, lifecycle, and utility testing

Run coverage report:

```bash
pnpm test:coverage
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Architecture Principles

KoppaJS Core adheres to:

- Fully functional architecture (no classes, no factories)
- Runtime-safe types using `satisfies`
- Explicit, composable functions
- Helpers and guards isolated under `utils/*`
- Avoid unnecessary `as` assertions

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Scripts

| Command               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm build`          | Full production build: typecheck → bundle → generate `.d.ts`     |
| `pnpm rebuild`        | Remove all build artifacts and rebuild from scratch              |
| `pnpm typecheck`      | Run TypeScript type checking                                     |
| `pnpm generate:types` | Generate public type definitions                                 |
| `pnpm test`           | Run all tests once                                               |
| `pnpm test:watch`     | Run tests in watch mode                                          |
| `pnpm test:coverage`  | Generate coverage report                                         |
| `pnpm test:ci`        | CI test run with coverage                                        |
| `pnpm lint`           | Lint TS/JS via ESLint                                            |
| `pnpm format`         | Apply Prettier formatting                                        |
| `pnpm dump-code`      | Output a full code snapshot (`---code_dump.txt`)                 |
| `pnpm analyze-code`   | Analyze project structure and output report (`---code_analysis`) |
| `pnpm list-structure` | Dump all tracked project files                                   |
| `pnpm clean`          | Remove dist and coverage directories                             |
| `pnpm deepclean`      | Remove node_modules, dist, and pnpm-lock.yaml                    |

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Need Help?

Open an issue or start a discussion:
https://github.com/koppajs/koppajs-core

Thank you for contributing — and welcome aboard. 🚀

<p align="right">(<a href="#contributing-top">back to top</a>)</p>
