# Decision Hierarchy

When repository guidance conflicts, apply the highest applicable source first.

1. Approved feature or behavior specs in `docs/specs/`
2. Accepted ADRs in `docs/adr/`
3. Root governance documents:
   - `AI_CONSTITUTION.md`
   - `ARCHITECTURE.md`
   - `DEVELOPMENT_RULES.md`
   - `TESTING_STRATEGY.md`
4. Supporting governance documents in `docs/meta/`, `docs/architecture/`, and `docs/quality/`
5. Contributor-facing and user-facing docs such as `CONTRIBUTING.md`, `README.md`, and `DEVELOPMENT_README.md`
6. Inline comments, examples, and historical code patterns

## Conflict Resolution Rules

- The more specific document wins when two documents are at the same level.
- A newer approved ADR or spec supersedes older guidance at the same level.
- Code that diverges from approved docs is considered drift, not authority.
- Unresolved conflicts block merge until the docs or code are aligned.

## Escalation

- Behavioral conflict: resolve through a spec update.
- Structural conflict: resolve through an ADR.
- Workflow conflict: update the relevant root governance document and contributor instructions.
