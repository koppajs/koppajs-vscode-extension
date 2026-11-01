# Change Log

All notable changes to **koppajs-vscode-extension** are documented in this file.

This project uses a **manual, tag-driven release process**.
Only tagged versions represent official releases.

This changelog documents **intentional milestones and guarantees**,
not every internal refactor.

---

## [Unreleased]

No unreleased changes.

## [1.1.0]

- Include the original KoppaJS icon as the Marketplace extension icon and verify
  its manifest reference and byte-identical VSIX inclusion.

- Bound unit-test concurrency for TypeScript-service and CLI regression suites.
- Preserve full main-branch ancestry when validating release tags.

- Exclude local `.diffuno` workspace metadata from the VSIX and reject it in archive regression tests.
- Consume English language-core/check 0.2.2 with server 0.2.1 resolving Core 0.2.2; preserve identifiers and user-authored Unicode values.

- Standardize extension text, HTML completion descriptions, diagnostics, quick fixes, logs, examples, and repository CLI output on English. Adapt known shared-package messages at the presentation boundary without changing diagnostics, snippets, or user content.

- Add safe required-slot insertion and unknown-emit-handler removal, with real editor application and diagnostic-cleanup tests. Use the published language-core 0.2.1 fixes for paired default slots and isolated Prop assignment checks.
- Remove duplicate HTML/component and document-symbol providers; route legacy, reference/rename, code-action and empty-window workspace-symbol requests to one explicit owner.
- Require syntax and language configuration assets in the VSIX and verify their byte identity alongside the tested release bundles.

- Validate the generated VSIX ZIP for required bundles, CommonJS metadata and forbidden payloads; verify packaged runtime bytes match the workspace before and after release-host tests. The host tests do not install the archive.

- Resolve the reviewed npm audit findings with tested, version-scoped security dependencies; reproducibly adapt the two client glob checks to minimatch 11 during installation. File-operation filters adopt Bash-style negative extglob suffix matching and Unicode case folding for case-insensitive patterns.

- Update dependencies to the latest compatible releases, including KoppaJS language-core/check 0.2.2 and server 0.2.1, language client/server 11, ESLint 10, Vitest 5, Vite 8, and Webpack CLI 7.
- Raise the supported baseline to Node.js `^22.22.1 || ^24.0.0 || >=26.0.0` and VS Code 1.144.0, aligning editor API types with the supported host.
- Adopt TypeScript 6.0.3 with Node16 module resolution and an explicit CommonJS source scope; retain Node 22 API types and defer TypeScript 7 until the parser and shared language packages support it.
- Fix local editor adapters overriding current `{{...}}` runtime interpolations: defer their binding diagnostics and expression intelligence to the shared language server while preserving legacy single-brace behavior.
- Preserve statically detectable activation exports in minified release bundles for the current VS Code ESM loader, and run the editor suite against release bundles in `release:check`.
- Add a production-build and CLI compatibility check using Core 3.0.12, Router 0.1.9, and Vite plugin 2.0.1 as development-only dependencies.

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
