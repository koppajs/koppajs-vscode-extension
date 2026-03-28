<a id="readme-top"></a>

<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<div align="center">
  <a href="https://github.com/koppajs/koppajs-vscode-extension/actions"><img src="https://img.shields.io/github/actions/workflow/status/koppajs/koppajs-vscode-extension/ci.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
</div>

<br>

<div align="center">
  <h1 align="center">koppajs-vscode-extension</h1>
  <h3 align="center">Official Visual Studio Code tooling for KoppaJS .kpa files</h3>
  <p align="center">
    <i>Editor-time diagnostics, navigation, completions, and workspace intelligence for KoppaJS authoring.</i>
  </p>
</div>

<br>

<div align="center">
  <p align="center">
    <a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-core">Language Core</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-server">Language Server</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-kpa-check">KPA Check</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vscode-extension/issues">Issues</a>
  </p>
</div>

<br>

<details>
<summary>Table of Contents</summary>
  <ol>
    <li><a href="#purpose">Purpose</a></li>
    <li><a href="#repository-classification">Repository Classification</a></li>
    <li><a href="#ownership-boundaries">Ownership Boundaries</a></li>
    <li><a href="#public-contract">Public Contract</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#cli-diagnostics">CLI Diagnostics</a></li>
    <li><a href="#ecosystem-fit">Ecosystem Fit</a></li>
    <li><a href="#architecture-governance">Architecture & Governance</a></li>
    <li><a href="#community-contribution">Community & Contribution</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## Purpose

`koppajs-vscode-extension` provides editor support for KoppaJS `.kpa` files in
Visual Studio Code. It is an editor-integration package, not a KoppaJS runtime,
compiler, or bundler.

---

## Repository Classification

- Type: VS Code extension plugin
- Runtime responsibility: register `.kpa` language support and host the VS Code
  client surface over the shared KoppaJS language server
- Build-time responsibility: bundle the extension, compile integration tests,
  consume the published KoppaJS language tooling packages, and validate repository quality gates
- UI surface: no standalone UI; the only product surface is the VS Code editor
- Maturity: pre-1.0, narrow in scope, with explicit governance and specs

---

## Ownership Boundaries

This repository owns:

- `.kpa` language registration and grammar wiring
- editor completions for KoppaJS block insertion
- LSP-backed HTML tag and attribute completions in the canonical template block
- imported `.kpa` component tag completions inside the canonical template block
- imported component-prop completions inside canonical opening tags
- component call-site diagnostics for missing required props, unknown props, and simple literal type mismatches
- local script-symbol completions plus typed member completions and hover in canonical template expressions
- warning diagnostics for missing local template bindings in canonical template expressions
- language-core-backed go-to-definition, find-references, rename, document symbols, and workspace symbols for `.kpa` structure
- semantic go-to-definition and find-references for imported TypeScript symbols referenced from canonical template expressions
- semantic go-to-definition, hover, find-references, and rename for imported `.kpa` component tags referenced from canonical template markup, including workspace-wide importer documents
- quick fixes for missing required component props and unresolved component imports
- published shared language packages `@koppajs/koppajs-language-core`,
  `@koppajs/koppajs-language-server`, and `@koppajs/koppajs-kpa-check`
- extension runtime wiring against the published language server package under
  `node_modules/`
- an internal workspace graph with cached `.kpa` discovery and dependency-aware
  invalidation for workspace features
- warning diagnostics for malformed canonical block structure
- warning diagnostics for unresolved PascalCase component tags and broken explicit `.kpa` component imports

This repository does not own:

- KoppaJS runtime execution
- build output for `.kpa` applications
- framework compilation or bundler integration
- browser UI behavior outside the VS Code host

---

## Public Contract

The supported editor contract is intentionally small:

- `.kpa` files are registered as the `kpa` language and activate the extension
  through the explicit `onLanguage:kpa` activation event
- top-level Koppa block snippets are offered only outside recognized structural
  blocks
- the extension contributes HTML tag completions inside the canonical
  `[template]` block after `<`
- imported `.kpa` components can appear as canonical template tag completions
- the extension contributes HTML attribute completions while editing an opening
  HTML tag inside `[template]`
- imported `.kpa` components can surface extracted prop suggestions while editing
  their opening tags inside canonical `[template]`
- imported `.kpa` component call sites can emit warnings for missing required
  props, missing required slots, unknown props, unknown emit handlers, and
  TS-backed or heuristic prop type mismatches
- local template-visible top-level bindings from `[ts]` and `[js]` are offered
  as completion items inside `{...}` expressions within canonical `[template]`
- typed member completions for local template-visible bindings are offered inside
  canonical template expressions
- hover inside canonical template expressions can describe local
  template-visible bindings from `[ts]` and `[js]` and surface typed member
  information from the embedded TypeScript semantic layer
- canonical template expressions can navigate to local `[ts]` and `[js]`
  declarations via go-to-definition, and imported TypeScript bindings can
  resolve to external source declarations through the semantic layer
- canonical template component tags can navigate to imported `.kpa` files and
  surface hover details about their import origin
- canonical template component hover can summarize extracted props, emits, and
  slots from the imported component when available
- canonical template component tags support references and rename together with
  their imported script alias across workspace importer documents
- hover, go-to-definition, references, rename, document symbols, and workspace
  symbols are served through the shared `@koppajs/koppajs-language-server`
- local top-level bindings from `[ts]` and `[js]` support find-references and
  rename across canonical template expressions plus local script usage
- unresolved component tags can offer an import quick fix, and missing required
  props can offer an insertion quick fix
- imported TypeScript bindings referenced from canonical template expressions
  can contribute semantic cross-file reference results
- semantic completions, diagnostics, hover, go-to-definition, references,
  rename, document symbols, workspace symbols, and quick fixes are served
  through the shared `@koppajs/koppajs-language-server`; top-level block snippets
  remain a thin extension-local adapter
- renaming an imported binding from a canonical template expression currently
  renames the local import alias and same-file usages, not the exported source
  declaration in another file
- document symbols expose parsed blocks and local top-level script bindings, and
  workspace symbols expose `.kpa` components plus exported script symbols
- `npm run kpa:check -- <path>` can run the same diagnostics core from the CLI
- missing local bindings inside canonical template expressions emit warning diagnostics
- unresolved PascalCase component tags and broken explicit `.kpa` imports emit
  warning diagnostics
- warning diagnostics are emitted only for malformed canonical blocks
  recognized by the diagnostics engine

Current block behavior:

- Canonical runtime blocks: `[template]`, `[ts]`, `[js]`, `[css]`, `[sass]`,
  `[scss]`
- Compatibility aliases: `[html]`, `[tpl]`

`[html]` and `[tpl]` are structural compatibility aliases. They suppress
top-level block insertion inside the alias block, but they are outside the
canonical template intelligence contract. Local symbol intelligence and runtime
block diagnostics are not guaranteed there.

Current workspace-aware component support:

- imported `.kpa` components are resolved through relative or absolute paths and
  `tsconfig`/`jsconfig` `baseUrl` plus `paths` aliases reachable from the
  current file
- a workspace graph invalidates dependent importer documents when `.kpa`,
  project-config, or neighboring script files change
- component references and rename can follow importer documents across the
  workspace for resolved `.kpa` components
- missing required props can be inserted through quick fixes, and unresolved
  component tags can offer a matching import quick fix when a unique workspace
  candidate exists
- props, slots, and emits are modeled from supported `Props`/`Slots`/`Emits`
  contracts, including required-slot and unknown-emit checks at call sites
- deeper project-wide TS-backed component analysis is still future work

---

## Usage

Open a `.kpa` file in Visual Studio Code and edit within the canonical block
structure:

```plaintext
[template]
  <div class="card">
    <p>{message}</p>
  </div>
[/template]

[ts]
  const message = 'Hello TypeScript';
[/ts]

[css]
  .card {
    color: red;
  }
[/css]
```

---

## Installation

Supported paths:

1. Install from the VS Code Marketplace after a public release.
2. Build and install a local `.vsix` for development or manual verification.

Local packaging details live in [DEVELOPMENT_README.md](./DEVELOPMENT_README.md).

---

## CLI Diagnostics

The repository now exposes the shared diagnostics core through the published
package `@koppajs/koppajs-kpa-check`, its bundled CLI artifact, and the root
convenience command:

- `npm run kpa:check -- path/to/file-or-folder`

This uses the same parser, diagnostics, and workspace-graph layer as the
extension. The root convenience command delegates directly to the published CLI
artifact under `node_modules/@koppajs/koppajs-kpa-check/dist/cli.js`.

---

## Ecosystem Fit

This extension complements the rest of the KoppaJS ecosystem:

- KoppaJS core defines runtime semantics
- KoppaJS build tooling owns compilation and bundler integration
- this repository owns editor-time feedback and authoring ergonomics for `.kpa`
  files

---

## Architecture & Governance

Project intent, contributor rules, and documentation contracts live in the local repo meta layer:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [RELEASE.md](./RELEASE.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [docs/specs/README.md](./docs/specs/README.md)
- [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md)
- [docs/architecture/README.md](./docs/architecture/README.md)
- [docs/meta/README.md](./docs/meta/README.md)
- [docs/quality/README.md](./docs/quality/README.md)

The file-shape contract for `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` is defined in [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).

Run the local document guard before committing:

```bash
npm run check:docs
```

---

## Community & Contribution

Issues and pull requests are welcome:

https://github.com/koppajs/koppajs-vscode-extension/issues

Contributor workflow details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

Community expectations live in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## License

Apache License 2.0 — © 2026 KoppaJS, Bastian Bensch
