# ADR 0003: Canonicalize `[template]` for Editor Intelligence

## Status

Accepted

## Context

The TextMate grammar currently recognizes `[html]`, `[tpl]`, and `[template]` as HTML-like blocks. Runtime editor intelligence is narrower: completions and diagnostics are implemented around `[template]`. Without an explicit rule, the repository appears inconsistent and contributors may assume all aliases have full feature parity.

## Decision

Treat `[template]` as the canonical block for HTML-oriented editor intelligence
features such as HTML completions and block diagnostics. Keep `[html]` and
`[tpl]` as compatibility aliases until an explicit feature-unification decision
is implemented. Compatibility aliases may still be recognized for structural
context decisions such as suppressing top-level block insertion inside the alias
block.

## Consequences

- The current implementation becomes explainable instead of ambiguous.
- User-facing docs can distinguish between syntax-highlighting compatibility and full editor-intelligence support.
- Structural context can stay conservative without silently expanding canonical template behavior.
- A future unification effort will require coordinated changes across grammar, providers, diagnostics, tests, and specs.

## Alternatives Considered

- Declare all aliases fully supported immediately. Rejected because the current code does not implement that behavior.
- Remove aliases from the grammar now. Rejected because it would be a user-visible breaking change without migration planning.
