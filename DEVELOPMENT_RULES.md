# Development Rules

## Default Style

- Write extension UI text, diagnostics, errors, logs, comments, documentation, and examples in English. Preserve user-authored content and technical identifiers. German text is permitted only in the shared-package compatibility patterns and regression fixtures that exercise them.

- Prefer small, explicit TypeScript modules over broad abstractions.
- Favor functions and plain objects over classes unless a VS Code API requires otherwise.
- Keep data modules declarative and side-effect free.
- Keep local `.diffuno` workspace metadata outside formatting, linting, and the
  published VSIX. Do not rewrite task-board files to satisfy code quality gates.
- Keep comments focused on intent, invariants, or non-obvious behavior.

## Dependency Rules

- `src/extension.ts` may depend on providers and diagnostics, but feature modules must not depend on `src/extension.ts`.
- Provider modules may depend on `vscode`, `src/utils/*`, and `src/data/*`.
- Utility and parser modules that need fast unit tests should stay free of runtime `vscode` dependencies.
- `src/data/*` must not import `vscode` or runtime logic.
- JSON grammar/configuration files are part of the product surface and must stay aligned with TypeScript behavior.

## Architectural Constraints

- Keep runtime registration centralized in `src/extension.ts`.
- Do not introduce hidden side effects at module import time.
- Dependency security adaptations must be explicit lifecycle scripts, version/source guarded, idempotent and covered by actual consumer tests. Do not bypass the language-client preparation guards or silently broaden scoped overrides.
- Do not create new block aliases without documenting canonical behavior in specs and ADRs.
- If a helper becomes central to diagnostics or provider behavior, make it testable in isolation.

## Naming and Layout

- Use `*Provider.ts` for completion providers.
- Use `*Utils.ts` for reusable helpers with narrow scope.
- Use descriptive singular file names for core services such as `diagnostics.ts`.
- Mirror runtime modules under `src/test/unit/` or `src/test/integration/` when adding meaningful tests.

## Allowed Patterns

- Static arrays for completion catalogs
- Guard clauses for unsupported contexts
- Narrow helper functions for document-position logic
- Incremental extension behavior added through explicit registration

## Forbidden Patterns

- Deep abstraction layers for a small extension surface
- Silent behavioral drift between grammar files, provider logic, diagnostics, and docs
- Repo-wide tooling claims that are not backed by scripts or workflows
- User-visible behavior changes without spec and documentation updates

## Required Change Matrix

When changing block semantics, update all relevant locations in one change:

| Change Type                 | Required Updates                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Add/remove a block type     | `syntaxes/kpa.tmLanguage.json`, providers, diagnostics, specs, README, tests, roadmap/ADR as needed               |
| Change completion behavior  | spec, provider module, tests, README if user-visible                                                              |
| Change diagnostics rules    | spec, `src/diagnostics.ts`, tests, README if user-visible                                                         |
| Change contributor workflow | `CONTRIBUTING.md`, `TESTING_STRATEGY.md`, `docs/meta/tooling-baseline.md`, `.github/instructions/*` if applicable |
| Change module boundaries    | `ARCHITECTURE.md`, `docs/architecture/module-boundaries.md`, ADR                                                  |

## Documentation Obligations

- Structural decisions require an ADR.
- User-visible editing behavior requires a spec in `docs/specs/`.
- Specs must include the current behavior description and the evolution metadata fields defined in `docs/specs/TEMPLATE.md`.
- Any architecture or workflow change must update the corresponding root governance document in the same change.

## Documentation Contract Rules

- `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` are governed by [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).
- If one of those files changes shape, update the spec and `scripts/check-doc-contract.mjs` in the same change.
- Keep official KoppaJS branding, logo usage, and closing governance sections consistent across the governed root documents.
