# AI Constitution

## Mission

This repository delivers a focused VS Code extension for `.kpa` files. The codebase is intentionally small, explicit, and easy to inspect. The meta layer must stay equally explicit so that architectural drift is detected early.

## Core Principles

- Preserve the editing contract for `.kpa` documents before optimizing internals.
- Prefer direct composition over indirection. Small functions and clear module ownership are the default.
- Keep user-visible behavior traceable from specification to implementation to tests.
- Treat documentation as part of the architecture, not as optional commentary.
- Record structural decisions when they affect module boundaries, workflows, or long-term maintenance.

## Mandatory AI Workflow

1. Read [DECISION_HIERARCHY.md](DECISION_HIERARCHY.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md), [TESTING_STRATEGY.md](TESTING_STRATEGY.md), and all relevant ADRs/specs before editing code.
2. Prefer the smallest change that fits the existing architecture.
3. For user-visible behavior changes, follow `spec -> tests -> implementation -> documentation`.
4. Reuse existing provider, diagnostics, and utility patterns instead of introducing new abstraction layers.
5. Update the meta layer in the same change whenever architecture, workflow, or public behavior changes.

## Hard Constraints

- Do not silently change canonical block names, trigger characters, activation scope, or diagnostics behavior.
- Do not move runtime registration outside `src/extension.ts` without an ADR.
- Do not import `vscode` into static data modules under `src/data/`.
- Do not claim CI, coverage, or quality guarantees that the repository does not actually enforce.
- Do not leave documentation/code mismatches unresolved. Either align the code or document the limitation explicitly.

## AI Collaboration Rules

- Always explain architectural tradeoffs in terms of editor behavior, maintainability, and testability.
- When a change introduces a new subsystem or pattern, add an ADR before or alongside the implementation.
- When a change adds or alters user-facing `.kpa` behavior, update the relevant spec in `docs/specs/`.
- When a change affects contributor workflow, update `CONTRIBUTING.md` and any relevant `.github/instructions/` file.
- When a change cannot be fully verified, state the gap explicitly in the change summary.

## Self-Evolution Triggers

- New subsystem or major module boundary change: update [ARCHITECTURE.md](ARCHITECTURE.md), [docs/architecture/module-boundaries.md](docs/architecture/module-boundaries.md), and create an ADR.
- New coding pattern or constraint: update [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md).
- New or changed user-visible behavior: update the relevant spec, tests, README, and changelog entry if release-facing.
- New quality gate, build tool, or test harness: update [TESTING_STRATEGY.md](TESTING_STRATEGY.md), [docs/quality/quality-gates.md](docs/quality/quality-gates.md), and contributor instructions.
- Any discovered documentation drift: fix it immediately or create a tracked roadmap item in [ROADMAP.md](ROADMAP.md).
