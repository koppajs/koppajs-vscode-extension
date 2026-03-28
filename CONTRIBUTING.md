<a id="contributing-top"></a>

<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<div align="center">
  <h1 align="center">Contributing to KoppaJS Projects</h1>
  <h3 align="center">Build with intention. Contribute with clarity.</h3>
  <p align="center">
    <i>A framework ecosystem powered by simplicity, transparency, and responsibility.</i>
  </p>
</div>

<br>

---

## Philosophy

> _“Only start things you are willing to finish with dedication.”_

KoppaJS favors explicit behavior, readable systems, and deliberate repository contracts.

Contributions should preserve those traits:

- keep behavior understandable and traceable
- prefer explicit contracts over hidden convention
- update documentation when the owned contract changes
- leave the repository in a state where both humans and AI agents can recover intent locally

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Repository Governance

Before structural, workflow, or user-visible changes, read the local governance layer:

- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [docs/specs/README.md](./docs/specs/README.md)
- [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md)

If your change moves package behavior, contributor workflow, or governed file shape, update the corresponding documentation in the same change.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Documentation Contract

The root documents `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` are governed by [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).

Before committing, run:

```bash
npm run check:docs
```

The local pre-commit hook runs the same guard and blocks the commit when the contract fails.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Requirements

- Node.js >= 22 (`.nvmrc` defaults to `22`)
- npm >= 10

Install dependencies:

```bash
npm install
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Development Workflow

Use the smallest change that solves the actual problem.

A safe default workflow is:

1. Read the affected code, tests, and local governance docs before changing behavior.
2. Update the owned specs and governed root docs in the same change when the contract moves.
3. Run `npm run check:docs` before broader quality checks.
4. Run the repository quality gates that cover the affected behavior.
5. Keep unrelated edits out of the same change whenever possible.

Repository-specific focus for this project:

- Keep the extension a thin editor adapter over the shared KoppaJS language packages.
- Align editor contributions, diagnostics behavior, quick fixes, and docs in the same change.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Code Style & Quality

All KoppaJS repositories value clarity over cleverness.

Expectations for changes in this repository:

- keep implementations explicit and easy to review
- prefer updating governing docs over leaving intent implicit
- keep quality-gate commands passing before asking for review
- do not silently change public behavior or contributor workflow

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Commit Conventions

KoppaJS uses **Conventional Commits**.

Example:

```text
feat: harden documentation contract validation
```

Keep commit scope aligned with the actual repository change.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Testing Guidelines

Every user-visible or contract-visible change should leave verification behind.

That means:

- update specs when behavior changes
- add or adjust automated tests when executable behavior changes
- run the repository commands that cover the affected area
- keep the documentation contract valid when the root docs change

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Scripts

| Command                 | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `npm run check:docs`    | Validate README, CHANGELOG, CODE_OF_CONDUCT, CONTRIBUTING, and the local doc contract |
| `npm run check`         | Run the main local quality gate                                                       |
| `npm run validate`      | Run the repository validation flow                                                    |
| `npm run release:check` | Build the release `.vsix` and verify the package payload                              |
| `npm run test`          | Run the test suite                                                                    |
| `npm run lint`          | Run lint checks                                                                       |
| `npm run format`        | Format repository files                                                               |
| `npm run format:check`  | Check formatting without rewriting files                                              |

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Releasing

Release and packaging expectations remain documented in `CHANGELOG.md`, `ROADMAP.md`, `RELEASE.md`, and the repository workflows.

When a release changes the public contract, update `CHANGELOG.md`, the relevant specs, and the governed root documents together.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Need Help?

Open an issue: https://github.com/koppajs/koppajs-vscode-extension/issues

If the question is about contributor expectations or file shape, start with [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) and [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).

<p align="right">(<a href="#contributing-top">back to top</a>)</p>
