# Spec: KPA Editing Core

## Status

Active

## Summary

The extension provides an intermediate-to-advanced editing experience for `.kpa` documents in VS Code: syntax highlighting, block insertion snippets, HTML-oriented completions plus imported component-tag completions inside the canonical template block, imported component-prop completions inside canonical opening tags, call-site diagnostics and quick fixes for resolved component usage, local script-symbol completions plus typed member completions inside canonical template expressions, warning diagnostics for malformed canonical blocks, missing local template bindings, and unresolved component tags, and shared-language-core completions/diagnostics/hover/navigation/reference/rename plus document/workspace symbols through `@koppajs/koppajs-language-server`.

## Description

This spec defines the editor contract for `.kpa` authoring inside Visual Studio
Code. It covers activation, structural block insertion, canonical
template-oriented HTML completions, local script-symbol intelligence inside
canonical template expressions, a virtual-file TypeScript semantic layer for
typed member completion, a workspace-aware `.kpa` component import layer for
template tag completion and call-site diagnostics, shared-language-core
completions/diagnostics/code-actions/navigation/hover/reference/rename through
the published language server package, and warning diagnostics for malformed
canonical blocks plus missing local template bindings.

## Inputs

- A file opened in VS Code with `languageId` `kpa`
- Cursor position inside or outside known Koppa blocks
- Block tags such as `[template]`, `[ts]`, `[js]`, `[css]`, `[sass]`, and `[scss]`
- Grammar-level aliases `[html]` and `[tpl]` for syntax highlighting compatibility

## Outputs

Single-brace `{...}` binding features below describe retained legacy editor
compatibility. Current `{{...}}` runtime expressions use the returned controller
contract described in “Current Runtime Interpolation Compatibility”; do not
interpret legacy top-level script visibility as current runtime visibility.

- Syntax highlighting based on `syntaxes/kpa.tmLanguage.json`
- Block snippet completions outside known blocks
- HTML tag completions in `[template]` after the `<` trigger character
- Imported `.kpa` component tag completions in `[template]` after the `<` trigger character
- HTML attribute completions while editing an opening HTML tag inside `[template]`
- Imported component-prop completion items while editing an opening tag for a resolved `.kpa` component in `[template]`
- Warning diagnostics for missing required props, missing required slots, unknown props, unknown emits, and supported TS-backed or heuristic type mismatches on resolved imported component call sites
- Quick fixes for unresolved component tags when an unambiguous workspace import candidate exists (a sole or uniquely best-ranked local candidate)
- Quick fixes for missing required component props on resolved imported component call sites
- Local completion items for template-visible top-level bindings from `[ts]` and `[js]` while editing `{...}` expressions inside `[template]`
- Typed member completion items while editing member access on local template-visible bindings inside `{...}` expressions in `[template]`
- Hover details for imported `.kpa` component tags referenced in canonical template markup
- Find-references results for imported `.kpa` component tags together with their local script import alias across workspace importer documents
- Rename edits for imported `.kpa` component tags together with their local script import alias across workspace importer documents
- Hover details for template-visible local bindings referenced inside `{...}` expressions inside `[template]`
- Typed hover details for supported member access inside `{...}` expressions in `[template]`
- Go-to-definition targets in imported `.kpa` files for component tags referenced inside canonical template markup when the component import can be resolved
- Go-to-definition targets for template-visible local bindings referenced inside `{...}` expressions inside `[template]`
- Go-to-definition targets in external TypeScript files for imported bindings referenced inside canonical `{...}` expressions when the semantic layer can resolve them
- Find-references results for local top-level bindings across canonical `{...}` expressions and local `[ts]`/`[js]` usage
- Semantic find-references results in external TypeScript files for imported bindings referenced inside canonical `{...}` expressions when the semantic layer can resolve them
- Rename edits for local top-level bindings across canonical `{...}` expressions and local `[ts]`/`[js]` usage
- Rename edits for imported bindings referenced inside canonical `{...}` expressions when the rename stays on the local import alias and same-file usages
- Document symbols for parsed blocks plus local top-level bindings from `[ts]` and `[js]`
- Workspace symbols for `.kpa` components plus exported script bindings
- CLI diagnostics for `.kpa` files through the same shared parser, diagnostics, and workspace-graph core
- Warning diagnostics for canonical block issues:
  - closing block without a matching open block
  - mismatched closing block
  - unclosed canonical block at end of document
- Warning diagnostics for missing local template-visible bindings in supported canonical `{...}` expressions
- Warning diagnostics for unresolved PascalCase component tags in canonical template markup
- Warning diagnostics for broken explicit `.kpa` component import paths in `[ts]` or `[js]`

## Behavior

1. Opening a `.kpa` document activates the extension through the explicit
   `onLanguage:kpa` activation event.
2. Outside recognized structural blocks, the extension offers block snippets for
   canonical Koppa blocks.
3. Inside any recognized structural block, top-level block insertion snippets
   are suppressed.
4. Inside the canonical `[template]` block, typing `<` can produce HTML tag
   completions.
5. Inside the canonical `[template]` block, typing `<` can also surface
   imported `.kpa` component tags that are in scope for the current document.
6. Inside an opening HTML tag within `[template]`, attribute completions can
   appear.
7. While editing an opening tag for an imported `.kpa` component in canonical
   template markup, extracted component props can appear as completion items.
8. Hovering an imported `.kpa` component tag in canonical template markup can
   show component-import details, go-to-definition can navigate to the imported
   component file when the import resolves inside the workspace, and
   find-references/rename can operate across that tag and its local import alias
   across workspace importer documents.
9. Component hover can summarize extracted props, emits, and slots from the
   resolved imported `.kpa` file when those conventions are present.
10. Resolved imported component call sites can warn on missing required props,
    missing required slots, unknown props, unknown emit handlers, and supported
    TS-backed or heuristic type mismatches.
11. Missing required props, unresolved component tags, missing required named/default slots and unknown emit bindings can offer safe explicit quick fixes. Prop stubs use runtime binding syntax; slot fixes preserve content and can expand self-closing tags. Unknown emit fixes remove the exact handler attribute rather than guessing another event name.
12. Inside a `{...}` expression within the canonical `[template]` block,
    template-visible top-level bindings from local `[ts]` and `[js]` blocks can
    appear as completion items.
13. Inside member access on a local template-visible binding in a canonical
    template expression, typed member completions can appear from the virtual
    TypeScript semantic layer.
14. Hovering a template-visible local binding reference inside a canonical
    template expression can show local symbol details, and supported member
    access can show typed hover information.
15. Type-only imports, interfaces, and type aliases are excluded from canonical
    template expression completions and hover.
16. Inside a canonical template expression, go-to-definition can navigate from a
    local template-visible binding reference to its declaration in `[ts]` or `[js]`,
    and imported bindings can resolve to external TypeScript declarations when
    the semantic layer has enough information.
17. Local top-level bindings from `[ts]` and `[js]` can provide find-references
    results across canonical `{...}` expressions and local script usage.
18. Imported bindings referenced from canonical template expressions can provide
    semantic reference results in external TypeScript files when they are
    reachable through the current document's imports.
19. Local top-level bindings from `[ts]` and `[js]` can be renamed across
    canonical `{...}` expressions and local script usage when the reference is
    unambiguous.
20. Imported bindings referenced from canonical template expressions can be
    renamed only at the local import alias level; exported source declarations
    in other files are not renamed.
21. Unresolved PascalCase component tags in canonical template markup can
    produce warning diagnostics, and broken explicit `.kpa` imports can produce
    warning diagnostics on the import identifier.
22. Document symbols can expose parsed blocks and local top-level script symbols
    for the current `.kpa` file.
23. Workspace symbols can expose `.kpa` components plus exported top-level
    script symbols.
24. The same shared diagnostics and workspace-graph core can be invoked from
    the published `@koppajs/koppajs-kpa-check` CLI for direct `.kpa` file or folder checks.
25. Missing local template-visible bindings in canonical `{...}` expressions can
    produce warning diagnostics for top-level identifier references.
26. `[html]` and `[tpl]` are treated as structural compatibility aliases only:
    they suppress top-level block insertion inside the alias block, but they do
    not receive canonical template local symbol intelligence, parser-backed
    navigation, or runtime block diagnostics.
27. Warnings are not limited to block structure: the shared server emits
    structural, runtime-binding, and component diagnostics. The local collection
    adds legacy single-brace missing-binding warnings only.

## English Language Contract

All extension-owned descriptions, diagnostics, quick-fix titles, errors, logs,
examples, and contributor-facing text use English. English is fixed and does not
follow the VS Code display language. User-authored content, identifiers, paths,
and public diagnostic codes are not translated.

The pinned shared packages still emit some German text. The client adapts known
shared diagnostics and rename errors to English at the presentation boundary and
uses the English local HTML catalog for matching server completion snippets.
This changes presentation only: the server remains the owner of those features.
Unknown messages and semantic/user documentation pass through unchanged.
Original German strings remain only as compatibility patterns and regression
fixtures. Installed dependencies are not rewritten.

Slot/emit quick fixes compare normalized English messages against recomputed
shared diagnostics, preserving stale-diagnostic and foreign-source rejection.
The repository `npm run kpa:check -- [options] [targets...]` command uses a thin
English-output adapter over the published CLI. It preserves options, JSON
metadata, target paths, diagnostic codes, and exit codes. Direct invocation of
the upstream CLI outside this repository retains that package's language.

## Current Runtime Interpolation Compatibility

With language-core 0.2.1 and language-server 0.2.1, current `{{...}}` interpolations use the explicit
returned controller contract (`state`, `methods`, `props`, and `events`).
The shared language server owns binding diagnostics, completion, hover, definition,
references, and rename for these expressions. Local single-brace adapters must
not suppress server completions, expose private controller locals, or emit
false missing-binding diagnostics for returned properties. Incomplete `{{...`
input remains eligible for server completion. Existing single-brace `{...}`
behavior described in this spec remains legacy editor compatibility, not a current runtime guarantee.
HTML completions remain suppressed inside both expression forms.

Validation includes the shared ecosystem fixture and a real-host regression
that detects an unknown runtime binding, clears that warning for returned props,
and completes returned state/props/methods without exposing a private local.

## Constraints

- Diagnostics are warning-level only.
- The extension does not perform automatic document repairs.
- Full template-intelligence support is canonical for `[template]`, not for all grammar aliases.
- Local HTML/block snippets use static catalogs; semantic and component suggestions also use parsed/type information.
- Runtime expressions, HTML/component completions, component hover/definition and document symbols are server-owned. Local adapters retain block snippets, legacy expressions, reference/rename mappings and component quick fixes. Middleware and local guards use the same ownership rules to prevent duplicate responses. Workspace symbols use the server with workspace folders and the local index without folders.
- `src/diagnostics.ts` publishes only uncoded legacy missing-binding messages
  beginning `Local template symbol [` from the local diagnostics engine.
  This editor-only compatibility collection is an explicit exception to CLI
  parity; it skips current runtime `{{...}}` bindings.
- Slot/emit repairs require a matching fresh shared diagnostic and an unambiguous current tag/attribute. Stale/foreign diagnostics, malformed markup or duplicate attributes produce no edit. No repair is applied automatically.
- Local script-symbol intelligence is limited to file-local top-level bindings from `[ts]` and `[js]`.
- Workspace-aware component resolution currently follows relative or absolute
  `.kpa` imports plus `tsconfig`/`jsconfig` `baseUrl` and `paths` aliases
  reachable from the current document.
- Workspace-aware editor features rely on the published shared
  `@koppajs/koppajs-language-core` package and its dependency-aware workspace
  graph rather than only on ad-hoc filesystem scans.
- Typed template member completion and hover currently operate on a document-scoped virtual TypeScript view and do not yet model a full `.kpa` workspace graph.
- Semantic definition and reference resolution can follow imported TypeScript bindings that are reachable from the current document, but the extension does not yet build a full framework-aware project graph.
- Component intelligence currently covers imported tag completion, prop
  completion, hover, definition, references, workspace rename, call-site prop,
  slot, and emit diagnostics, workspace symbol exposure, and safe quick fixes,
  but it does not yet model a full framework-wide project graph or deeper
  project-wide TS-backed component semantics.
- Local legacy expression binding rename operates on file-local `[ts]`/`[js]` bindings; imported TypeScript binding rename stays on the local alias and same-file usages. Component tag/import-alias rename separately spans workspace importer documents.
- Rename inside canonical template expressions is intentionally refused when multiple local declarations share the same visible name.
- Local legacy missing-binding diagnostics target canonical template identifier references outside nested function/class scopes; current runtime binding checks belong to the server.
- Cross-file component resolution, definition, references, and importer-alias/tag
  rename already work for reachable `.kpa` imports. What remains absent is a
  complete framework-aware project model and source-declaration rename across
  component boundaries; importer rename does not rename the component source file.

## Edge Cases

- Typing outside any known block should offer block snippets, not HTML tag suggestions.
- Typing inside `[html]` or `[tpl]` should not re-offer top-level block snippets.
- Typing inside `[template]` but outside an opening HTML tag should not offer HTML attribute suggestions.
- Typing inside a canonical template expression should not offer HTML tag or attribute completions just because the expression sits near markup.
- Type-only imports and type-only declarations should not appear as canonical template expression completions.
- Imported `.kpa` components should appear as tag completions in canonical template markup when their import is in scope.
- Imported `.kpa` component props should appear as attribute completions while editing the component's opening tag when the imported file exposes a supported `Props` contract.
- Missing required props on a resolved imported component call site should warn
  and offer an insertion quick fix.
- Unresolved PascalCase component tags should offer an import quick fix when a
  matching `.kpa` candidate is unambiguous in reachable workspace roots; the local
  provider accepts a sole candidate or a uniquely best-ranked match, but not a tie.
- Go-to-definition, hover, find-references, and local rename on an imported component tag should work on both its opening and closing tag names when the component resolves.
- Hover on an imported component tag should surface extracted props, emits, and slots when the imported file exposes supported `Props`/`Emits`/`Slots` contracts.
- Member access such as `user.` inside canonical template expressions should offer typed member completions when the local symbol type is known.
- Hovering supported member access such as `user.name` inside canonical template expressions should show typed member information when available.
- Missing local template binding warnings should apply only to canonical `[template]`, not compatibility aliases.
- Unresolved PascalCase tags in canonical template markup should warn as likely missing component imports.
- Broken explicit `.kpa` imports should warn on the import identifier when the workspace file cannot be found.
- Property names such as `user.name` should not be treated as local template symbol references for hover, definition, references, rename, or diagnostics.
- Identifiers inside nested callback scopes in template expressions should not be treated as top-level local template references.
- Imported bindings referenced in canonical template expressions can resolve to external TypeScript definitions and references when the current document imports them.
- Renaming an imported binding from a canonical template expression should update the local import alias and same-file usages, but not the exported declaration in the dependency file.
- A closing canonical block without an opener should produce a warning.
- A canonical block left open at end of document should produce a warning.
- `[html]` and `[tpl]` receive grammar support and structural suppression, but canonical template local symbol intelligence and diagnostics do not apply to them.

## Acceptance Criteria

1. Opening a `.kpa` document enables the extension without affecting non-`kpa` files.
2. Outside any known block, completion offers insertable Koppa block snippets.
3. Inside `[template]`, typing `<` can produce HTML tag snippets.
4. Inside `[template]`, typing `<` can also produce imported `.kpa` component
   tag completions when the import is in scope.
5. Inside `[html]` or `[tpl]`, typing inside the block does not offer top-level
   block snippets or canonical template local symbol intelligence.
6. Inside an opening HTML tag within `[template]`, attribute suggestions can appear.
7. Hover, go-to-definition, find-references, and rename on imported component
   tags in `[template]` can surface and update the resolved `.kpa` component
   import across workspace importer documents when the file is reachable.
8. While editing an opening tag for an imported component, prop suggestions can
   appear when the imported file exposes a supported `Props` contract.
9. Inside `{...}` expressions in `[template]`, local top-level bindings from
   `[ts]` and `[js]` can appear as completion items.
10. Member access in canonical template expressions can offer typed member
    completions when the type is available from the local virtual TS view.
11. Hovering a local template-visible binding in a canonical template expression
    can show symbol details, and supported member access can show typed hover
    details.
12. Go-to-definition from a local template-visible binding in canonical
    `{...}` expressions can navigate to its local script declaration.
13. Go-to-definition from an imported binding in a canonical template
    expression can navigate to an external TypeScript declaration when that
    import is semantically resolvable.
14. Find-references can operate on local top-level bindings across canonical
    `{...}` expressions and local script usage, and imported template bindings
    can contribute semantic reference results from external TypeScript files.
15. Rename can operate on local top-level bindings across canonical `{...}`
    expressions and local script usage, while imported template bindings rename
    only the local import alias and same-file usages.
16. Unresolved PascalCase component tags and broken explicit `.kpa` imports in
    canonical files produce warning diagnostics.
17. Document symbols expose parsed blocks and local top-level script bindings.
18. Imported component hover can summarize props, emits, and slots when the
    imported file exposes supported contracts.
19. Imported component call sites can produce prop diagnostics and safe quick
    fixes for supported missing-prop and import scenarios.
20. Workspace symbols expose `.kpa` components plus exported script bindings.
21. The repository-local CLI can invoke the same diagnostics core on direct
    `.kpa` file or folder targets, excluding editor-only legacy missing-binding warnings.
22. Missing local template-visible bindings in canonical `{...}` expressions
    produce warning diagnostics for supported identifier references.
23. Malformed canonical block structure produces warning diagnostics.
24. Documentation explicitly distinguishes canonical behavior from compatibility aliases.

## Evolution

- `evolution_phase`: release-1.0
- `completeness_level`: initial-1.0
- `known_gaps`:
  - `[html]` and `[tpl]` still do not have diagnostics parity with `[template]`
  - local template symbol intelligence is still primarily document-scoped, even though imported TypeScript definitions/references and imported `.kpa` component tags can now be followed through the semantic layer
  - component intelligence now covers first prop/slot/emit call-site checks, but it still does not provide a full framework-aware project graph or deeper project-wide TS-backed component semantics
  - rename is not yet workspace-aware across imported TypeScript exports or `.kpa` component source declarations
  - grammar behavior is still verified partly through manual smoke checks
- `deferred_complexity`:
  - fixture-driven integration scenarios for larger `.kpa` documents
  - deeper component call-site semantics for slot bodies, richer emit payload contracts, and broader TS-backed validation
  - workspace-aware rename and references beyond imported TypeScript aliases and importer documents
  - formatter and auto-import flows on top of the shared language core
  - generated HTML metadata instead of hand-maintained completion catalogs
- `technical_debt_items`:
  - decide whether compatibility aliases should remain structural-only
  - decide the full script-to-template visibility contract for KoppaJS semantics
  - decide how far template semantic analysis should follow nested scopes and richer expression forms
  - reduce reliance on manual grammar verification where practical
