# ADR 0008: Assign Explicit Provider Ownership

## Context

The shared server and local adapters were registered for overlapping markup, symbol and code-action features. The editor could receive duplicate results. Removing all local adapters would lose legacy single-brace intelligence and script/importer rename mappings; removing the local workspace-symbol provider also loses symbols in editor windows without workspace roots.

## Decision

- Let the server own runtime `{{...}}`, HTML/component completions, component hover/definition and document symbols. Do not register duplicate local HTML/document-symbol providers.
- Retain local block snippets and legacy expression intelligence. Use common ownership predicates for middleware and local reference/rename adapters, including script declarations and imported-component tags.
- Keep explicit component code actions local. Filter only their existing Prop/import diagnostic codes from server code-action requests so the editor offers each once. Add slot/emit repairs using fresh shared component diagnostics, conservative current-markup checks and explicit WorkspaceEdits.
- Route workspace symbols to the server when workspace folders exist, and to the local index otherwise. Only one owner returns results in either context.
- Preserve editor-only legacy missing-binding warnings as a documented compatibility exception to shared CLI parity.
- Consume published language-core 0.2.1 for the underlying paired-default-slot and Prop assignment fixes, rather than patching a different diagnostics implementation into the extension.

## Consequences

- Existing legacy behavior remains available without exposing private runtime-controller locals or producing duplicate server results.
- The local parser/TS mapping remains compatibility code, not an independent replacement for the shared runtime language service.
- Slot/emit repairs are deliberately conservative: stale/foreign diagnostics, ambiguous attributes or malformed markup yield no action. No edit is applied automatically or guesses a replacement emit name.
- Unit tests cover ownership and actual Shared-service replacements; real Host tests verify unique results and apply repairs until their diagnostics clear. The release checks require the tested bundles and language assets to match the archive before and after Host tests.

## Alternatives Considered

- Leave all providers active: preserves duplicate and conflicting results.
- Remove every local provider: breaks supported legacy mappings and empty-window symbols.
- Rewrite the complete workspace/type system: unnecessary scope expansion for these concrete release defects.
