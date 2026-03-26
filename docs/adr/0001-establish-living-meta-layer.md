# ADR 0001: Establish a Living Meta Layer

## Status

Accepted

## Context

The repository had implementation files and basic user documentation, but no coherent meta-layer structure. Governance, architecture memory, testing policy, and contributor workflow expectations were either missing or inconsistent. The previous `CONTRIBUTING.md` described tooling and practices from a different repository.

## Decision

Create and maintain a living meta layer consisting of:

- root governance documents,
- structured subdirectories under `docs/`,
- ADRs for structural decisions,
- specs for user-visible behavior,
- and explicit AI workflow instructions.

Meta-layer updates are required in the same change as architectural or workflow changes.

## Consequences

- Architectural rationale is no longer implicit.
- Contributors and AI agents have a clear document set to read before editing.
- Documentation drift becomes visible and actionable.
- The repository takes on a maintenance obligation to keep the meta layer current.

## Alternatives Considered

- Keep all guidance in `README.md` and inline comments. Rejected because it does not scale to structural decisions.
- Add only a single architecture document. Rejected because it would not cover testing, specs, and AI workflow rules.
