# AI Workflow Instructions

## Read First

Before editing code, read:

- `DECISION_HIERARCHY.md`
- `AI_CONSTITUTION.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT_RULES.md`
- `TESTING_STRATEGY.md`
- `docs/meta/tooling-baseline.md`
- relevant files in `docs/adr/` and `docs/specs/`

## Workflow

1. Confirm the intended behavior and affected modules.
2. Update or create a spec for user-visible behavior changes.
3. Update or create tests, or document the manual smoke requirement.
4. Implement the smallest change that fits existing patterns.
5. Update meta-layer docs in the same change when architecture or workflow changes.

## Special Rules for This Repo

- Keep runtime registration in `src/extension.ts`.
- Treat `[template]` as canonical for editor intelligence unless an ADR changes that rule.
- If block semantics change, update grammar, providers, diagnostics, specs, tests, and README together.
- Do not invent CI, coverage, or release guarantees that the repository does not enforce.
