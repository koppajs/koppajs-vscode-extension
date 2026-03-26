# Spec: KPA Editing Core

## Status

Active

## Summary

The extension provides a baseline editing experience for `.kpa` documents in VS Code: syntax highlighting, block insertion snippets, HTML-oriented completions inside the canonical template block, local script-symbol completions and hover inside canonical template expressions, warning diagnostics for malformed canonical blocks and missing local template bindings, local go-to-definition from canonical template expressions, and document symbols for blocks plus local script declarations.

## Description

This spec defines the editor contract for `.kpa` authoring inside Visual Studio
Code. It covers activation, structural block insertion, canonical
template-oriented HTML completions, local script-symbol intelligence inside
canonical template expressions, parser-backed local navigation, and warning
diagnostics for malformed canonical blocks plus missing local template bindings.

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
- Local completion items for template-visible top-level bindings from `[ts]` and `[js]` while editing `{...}` expressions inside `[template]`
- Hover details for template-visible local bindings referenced inside `{...}` expressions inside `[template]`
- Go-to-definition targets for template-visible local bindings referenced inside `{...}` expressions inside `[template]`
- Document symbols for parsed blocks plus local top-level bindings from `[ts]` and `[js]`
- Warning diagnostics for canonical block issues:
  - closing block without a matching open block
  - mismatched closing block
  - unclosed canonical block at end of document
- Warning diagnostics for missing local template-visible bindings in simple canonical `{...}` expressions

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
6. Inside a `{...}` expression within the canonical `[template]` block,
   template-visible top-level bindings from local `[ts]` and `[js]` blocks can
   appear as completion items.
7. Hovering a template-visible local binding reference inside a canonical
   template expression can show local symbol details.
8. Type-only imports, interfaces, and type aliases are excluded from canonical
   template expression completions and hover.
9. Inside a canonical template expression, go-to-definition can navigate from a
   local template-visible binding reference to its declaration in `[ts]` or `[js]`.
10. Document symbols can expose parsed blocks and local top-level script symbols
    for the current `.kpa` file.
11. Missing local template-visible bindings in simple canonical `{...}`
    expressions can produce warning diagnostics.
12. `[html]` and `[tpl]` are treated as structural compatibility aliases only:
    they suppress top-level block insertion inside the alias block, but they do
    not receive template-specific HTML completions, local symbol intelligence,
    parser-backed local navigation, or runtime block diagnostics.
13. Diagnostics are emitted only for canonical runtime blocks handled by the
    diagnostics engine.

## Constraints

- Diagnostics are warning-level only.
- The extension does not perform automatic document repairs.
- Full template-intelligence support is canonical for `[template]`, not for all grammar aliases.
- The extension currently relies on local static completion catalogs instead of remote or generated metadata.
- Local script-symbol intelligence is limited to file-local top-level bindings from `[ts]` and `[js]`.
- Local go-to-definition only resolves file-local template-visible bindings from `[ts]` and `[js]`.
- Missing-binding diagnostics currently target only simple canonical `{...}` expressions whose root reference can be resolved conservatively.
- The extension does not yet provide inferred types, cross-file symbol resolution, or semantic rename.

## Edge Cases

- Typing outside any known block should offer block snippets, not HTML tag suggestions.
- Typing inside `[html]` or `[tpl]` should not re-offer top-level block snippets.
- Typing inside `[template]` but outside an opening HTML tag should not offer HTML attribute suggestions.
- Typing inside a canonical template expression should not offer HTML tag or attribute completions just because the expression sits near markup.
- Type-only imports and type-only declarations should not appear as canonical template expression completions.
- Missing local template binding warnings should apply only to canonical `[template]`, not compatibility aliases.
- A closing canonical block without an opener should produce a warning.
- A canonical block left open at end of document should produce a warning.
- `[html]` and `[tpl]` receive grammar support and structural suppression, but canonical template completions, local symbol intelligence, and diagnostics do not apply to them.

## Acceptance Criteria

1. Opening a `.kpa` document enables the extension without affecting non-`kpa` files.
2. Outside any known block, completion offers insertable Koppa block snippets.
3. Inside `[template]`, typing `<` can produce HTML tag snippets.
4. Inside `[html]` or `[tpl]`, typing inside the block does not offer top-level
   block snippets, canonical template HTML completions, or canonical local
   symbol intelligence.
5. Inside an opening HTML tag within `[template]`, attribute suggestions can appear.
6. Inside `{...}` expressions in `[template]`, local top-level bindings from
   `[ts]` and `[js]` can appear as completion items.
7. Hovering a local template-visible binding in a canonical template expression
   can show symbol details.
8. Go-to-definition from a local template-visible binding in canonical
   `{...}` expressions can navigate to its local script declaration.
9. Document symbols expose parsed blocks and local top-level script bindings.
10. Missing local template-visible bindings in simple canonical `{...}`
    expressions produce warning diagnostics.
11. Malformed canonical block structure produces warning diagnostics.
12. Documentation explicitly distinguishes canonical behavior from compatibility aliases.

## Evolution

- `evolution_phase`: legacy-alignment
- `completeness_level`: partial
- `known_gaps`:
  - `[html]` and `[tpl]` still do not have diagnostics parity with `[template]`
  - local template symbol intelligence is file-local only and not type-aware
  - missing-binding diagnostics are conservative and do not yet analyze compound expressions
  - grammar behavior is still verified partly through manual smoke checks
- `deferred_complexity`:
  - fixture-driven integration scenarios for larger `.kpa` documents
  - cross-file component and symbol resolution
  - rename and references beyond local declarations
  - generated HTML metadata instead of hand-maintained completion catalogs
- `technical_debt_items`:
  - decide whether compatibility aliases should remain structural-only
  - decide the full script-to-template visibility contract for KoppaJS semantics
  - decide whether template semantic diagnostics should expand beyond simple root-reference cases
  - reduce reliance on manual grammar verification where practical
