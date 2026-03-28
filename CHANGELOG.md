# Change Log

All notable changes to **koppajs-vscode-extension** are documented in this file.

This project uses a **manual, tag-driven release process**.
Only tagged versions represent official releases.

This changelog documents **intentional milestones and guarantees**,
not every internal refactor.

---

## [Unreleased]

- Raised the repository Node.js baseline to `>=22` and expanded CI validation to Node.js 22 and 24.
- Fixed the shared CLI smoke test integration, hardened VS Code integration-test packaging for ESM repositories, and added release `.vsix` validation plus a tag-driven release workflow.

## [1.0.0] - 2026-03-27

- Added workspace-aware canonical template tag completions for imported `.kpa` components.
- Added hover, go-to-definition, find-references, and local rename support for imported `.kpa` component tags in canonical template markup.
- Added extracted component-prop completions for imported `.kpa` component opening tags, plus hover summaries for supported `Props`/`Emits`/`Slots` contracts.
- Added component call-site diagnostics for missing required props, unknown props, and simple literal prop-type mismatches on resolved imported components.
- Added quick fixes for missing required component props and unresolved component imports when a unique workspace candidate exists.
- Added workspace-aware references and rename for imported `.kpa` components across importer documents.
- Added workspace symbols for `.kpa` components and exported script bindings.
- Added `tsconfig`/`jsconfig` path-alias resolution for imported `.kpa` components.
- Adopted the published shared language packages `@koppajs/koppajs-language-core`, `@koppajs/koppajs-language-server`, and `@koppajs/koppajs-kpa-check`.
- Switched the extension runtime and CLI workflow to consume those published packages directly.
- Added a shared workspace graph with dependency-aware invalidation for `.kpa` importer relationships and CLI scanning.
- Added an LSP-backed semantic layer for completions, diagnostics, quick fixes, hover, definitions, references, rename, and symbol search.
- Added deeper component call-site diagnostics for required slots and unknown emit handlers, plus TS-backed expression-to-prop validation when the local context can resolve the type.
- Added the published `@koppajs/koppajs-kpa-check` CLI package and root `kpa:check` command that run the shared diagnostics core outside VS Code.
- Reduced the VS Code extension host to a thin client plus editor-only block snippets on top of the shared language server.
- Added warning diagnostics for unresolved PascalCase component tags and broken explicit `.kpa` component imports.
- Added a first virtual TypeScript semantic layer for canonical template expressions, including typed member completions and typed hover information.
- Kept local symbol hover intact while augmenting it with semantic type information where available.
- Extended template go-to-definition to consult the semantic layer before falling back to local name-based resolution, including imported TypeScript definitions when reachable.
- Extended template find-references to include semantic cross-file results for imported TypeScript bindings when reachable from the current document.
- Added local find-references and rename support across canonical template expressions and embedded `[ts]`/`[js]` usage.
- Clarified imported-symbol rename behavior so template-initiated rename updates the local import alias and same-file usages without renaming exported source declarations in dependency files.
- Expanded canonical template missing-binding diagnostics to cover supported compound expressions.
- Tightened canonical template symbol resolution so property names and nested callback scopes are not treated as top-level local bindings.
- Made `.kpa` activation explicit through `onLanguage:kpa`.
- Clarified canonical `[template]` behavior versus `[html]` and `[tpl]` compatibility aliases.
- Fixed the optional repository-audit dump script so the default path runs without extra ZIP tooling.
