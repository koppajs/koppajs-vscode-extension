# ADR 0005: Introduce a Parser-Backed Document Model

## Status

Accepted

## Context

The extension originally derived block context and diagnostics directly from
string heuristics. That approach was sufficient for syntax-level support, but it
creates three problems:

- block-context detection and diagnostics duplicate parsing logic,
- future typed tooling would have to replace those heuristics anyway,
- and it is hard to grow toward virtual files, source maps, and semantic
  analysis without a canonical internal document model.

The repository needs a Stage-1 language foundation, but it is still too early
to extract shared packages before there is a second real consumer.

## Decision

Introduce an internal `src/language/` subsystem that owns:

- `.kpa` tag parsing,
- a small AST and document model,
- source-position mapping,
- and parser-backed diagnostics rules.

The extension keeps this subsystem internal for now. Existing public behavior
should remain stable while block-context helpers and diagnostics consume the
parsed document model instead of ad-hoc text scanning.

## Consequences

- Diagnostics and block-context detection share the same parsed structure.
- The repository gains a concrete starting point for symbol extraction, virtual
  files, and later semantic tooling.
- Internal complexity increases slightly, but in a controlled and testable way.
- Extraction into shared packages remains deferred until there is proven reuse.

## Alternatives Considered

- Keep regex-only heuristics longer. Rejected because it compounds drift and
  delays the foundation needed for typed tooling.
- Extract `@koppajs/language-core` immediately. Rejected because there is not
  yet a second consumer that justifies a public package boundary.
