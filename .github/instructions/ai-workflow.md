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
- Preserve the actual VSIX archive checks in `release:check` and the before/after runtime byte comparisons around release-host tests. Do not describe the workspace host run as an installed-VSIX test.
- Preserve Marketplace OIDC Trusted Publishing in `release.yml`, its job-scoped `id-token: write` permission and the policy identity in `RELEASE.md`. Do not add a Marketplace PAT fallback or trigger a live release to test authentication without explicit authorization.
- For dependency updates, preserve the Node/VS Code engine and API-type alignment and run `npm run test:ecosystem` alongside the regular validation gate.
- Preserve the version/hash guards in `scripts/prepare-languageclient.mjs`; do not bypass a failed postinstall. Recheck scoped security overrides with the dependency contract tests, both audit scopes and `npm ls --all` before accepting owner updates.
