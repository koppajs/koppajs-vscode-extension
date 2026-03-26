# Spec: KPA Editing Core

## Status

Active

## Summary

The extension provides a baseline editing experience for `.kpa` documents in VS Code: syntax highlighting, block insertion snippets, HTML-oriented completions inside the canonical template block, and warning diagnostics for malformed canonical block structure.

## Description

This spec defines the editor contract for `.kpa` authoring inside Visual Studio
Code. It covers activation, structural block insertion, canonical
template-oriented HTML completions, and warning diagnostics for malformed
canonical blocks.

## Inputs

- A file opened in VS Code with `languageId` `kpa`
- Cursor position inside or outside known Koppa blocks
- Block tags such as `[template]`, `[ts]`, `[js]`, `[css]`, `[sass]`, and `[scss]`
- Grammar-level aliases `[html]` and `[tpl]` for syntax highlighting compatibility

## Outputs

- Syntax highlighting based on `syntaxes/kpa.tmLanguage.json`
- Block snippet completions outside known blocks
- HTML tag completions in `[template]` after the `<` trigger character
- HTML attribute completions while editing an opening HTML tag inside `[template]`
- Warning diagnostics for canonical block issues:
  - closing block without a matching open block
  - mismatched closing block
  - unclosed canonical block at end of document

## Behavior

1. Opening a `.kpa` document activates the extension through the explicit
   `onLanguage:kpa` activation event.
2. Outside recognized structural blocks, the extension offers block snippets for
   canonical Koppa blocks.
3. Inside any recognized structural block, top-level block insertion snippets
   are suppressed.
4. Inside the canonical `[template]` block, typing `<` can produce HTML tag
   completions.
5. Inside an opening HTML tag within `[template]`, attribute completions can
   appear.
6. `[html]` and `[tpl]` are treated as structural compatibility aliases only:
   they suppress top-level block insertion inside the alias block, but they do
   not receive template-specific HTML completions or runtime block diagnostics.
7. Diagnostics are emitted only for canonical runtime blocks handled by the
   diagnostics engine.

## Constraints

- Diagnostics are warning-level only.
- The extension does not perform automatic document repairs.
- Full template-intelligence support is canonical for `[template]`, not for all grammar aliases.
- The extension currently relies on local static completion catalogs instead of remote or generated metadata.

## Edge Cases

- Typing outside any known block should offer block snippets, not HTML tag suggestions.
- Typing inside `[html]` or `[tpl]` should not re-offer top-level block snippets.
- Typing inside `[template]` but outside an opening HTML tag should not offer HTML attribute suggestions.
- A closing canonical block without an opener should produce a warning.
- A canonical block left open at end of document should produce a warning.
- `[html]` and `[tpl]` receive grammar support and structural suppression, but canonical template completions and diagnostics do not apply to them.

## Acceptance Criteria

1. Opening a `.kpa` document enables the extension without affecting non-`kpa` files.
2. Outside any known block, completion offers insertable Koppa block snippets.
3. Inside `[template]`, typing `<` can produce HTML tag snippets.
4. Inside `[html]` or `[tpl]`, typing inside the block does not offer top-level
   block snippets or canonical template HTML completions.
5. Inside an opening HTML tag within `[template]`, attribute suggestions can appear.
6. Malformed canonical block structure produces warning diagnostics.
7. Documentation explicitly distinguishes canonical behavior from compatibility aliases.

## Evolution

- `evolution_phase`: legacy-alignment
- `completeness_level`: partial
- `known_gaps`:
  - `[html]` and `[tpl]` still do not have diagnostics parity with `[template]`
  - grammar behavior is still verified partly through manual smoke checks
- `deferred_complexity`:
  - fixture-driven integration scenarios for larger `.kpa` documents
  - generated HTML metadata instead of hand-maintained completion catalogs
- `technical_debt_items`:
  - decide whether compatibility aliases should remain structural-only
  - reduce reliance on manual grammar verification where practical
