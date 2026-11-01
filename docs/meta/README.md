# Meta Layer Guide

The meta layer is the repository's architecture memory and decision framework. It exists to keep implementation, docs, and collaboration rules aligned.

## Contents

- Root governance docs define the top-level rules for architecture, development, testing, and decision precedence.
- `docs/architecture/` stores deeper structure and module-boundary detail.
- `docs/adr/` stores architectural decisions and their rationale.
- `docs/specs/` stores behavior definitions for user-visible features.
- `docs/quality/` stores quality gates and manual verification procedures.
- `docs/meta/tooling-baseline.md` records the active quality-tooling baseline and its deliberate exclusions.
- `docs/meta/maintenance.md` defines how the meta layer evolves with the codebase.

## Operating Rule

If the system changes, the meta layer changes in the same pull request. Drift is a defect.
