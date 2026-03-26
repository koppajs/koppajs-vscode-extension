# Contributing

## Start Here

Read these documents before making structural or user-visible changes:

- [DECISION_HIERARCHY.md](DECISION_HIERARCHY.md)
- [AI_CONSTITUTION.md](AI_CONSTITUTION.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md)

## Requirements

- Node.js `22` (see `.nvmrc`)
- `npm`

Install dependencies:

```bash
npm install
```

## Common Commands

```bash
npm run format
npm run format:check
npm run compile
npm run watch
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:coverage
npm run validate
npm run compile-tests
npm test
npm run package
npm run dump:ai
```

## Contribution Rules

- User-visible behavior changes require a spec update in `docs/specs/`.
- Structural or long-lived workflow decisions require an ADR in `docs/adr/`.
- Keep grammar, providers, diagnostics, tests, and docs aligned in the same change.
- Prefer small, explicit modules over new abstraction layers.
- Treat `npm run dump:ai` as an optional repository-audit utility, not as a merge gate.
- If verification is incomplete, document the gap clearly in the change summary.

## Changes That Need Extra Care

### Block Semantics

If you add, rename, or remove a block such as `[template]` or `[ts]`, update all of the following:

- `syntaxes/kpa.tmLanguage.json`
- completion providers under `src/providers/`
- `src/diagnostics.ts`
- relevant specs and ADRs
- `README.md`
- tests and manual smoke checklist

### Tooling or Workflow

If you change build, lint, packaging, or test workflows, update:

- `TESTING_STRATEGY.md`
- `DEVELOPMENT_README.md`
- `docs/quality/quality-gates.md`
- `docs/meta/tooling-baseline.md`
- `.github/instructions/ai-workflow.md` when AI workflow expectations change

## Pull Request Checklist

- `npm run validate` passes locally, or the gap is documented
- Spec updated if behavior changed
- ADR added if structure changed
- Docs match the code
- Tests added or manual smoke coverage noted
- Changelog updated when release-facing behavior changes

## Commit Messages

Conventional commits are preferred but not currently enforced by repository tooling.
Staged files are still guarded by a `pre-commit` hook that runs `lint-staged`.
