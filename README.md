# KoppaJS VS Code Extension

## Purpose

`koppajs-vscode-extension` provides editor support for KoppaJS `.kpa` files in
Visual Studio Code. It is an editor-integration package, not a KoppaJS runtime,
compiler, or bundler.

## Repository Classification

- Type: VS Code extension plugin
- Runtime responsibility: register `.kpa` language support, completions, and
  structural diagnostics inside the VS Code host
- Build-time responsibility: bundle the extension, compile integration tests,
  and validate repository quality gates
- UI surface: no standalone UI; the only product surface is the VS Code editor
- Maturity: pre-1.0, narrow in scope, with explicit governance and specs

## Ownership Boundaries

This repository owns:

- `.kpa` language registration and grammar wiring
- editor completions for KoppaJS block insertion
- HTML tag and attribute completions in the canonical template block
- local script-symbol completions and hover in canonical template expressions
- warning diagnostics for missing local template bindings in canonical template expressions
- local go-to-definition and document symbols for parser-backed `.kpa` structure
- warning diagnostics for malformed canonical block structure

This repository does not own:

- KoppaJS runtime execution
- build output for `.kpa` applications
- framework compilation or bundler integration
- browser UI behavior outside the VS Code host

## Public Contract

The supported editor contract is intentionally small:

- `.kpa` files are registered as the `kpa` language and activate the extension
  through the explicit `onLanguage:kpa` activation event
- top-level Koppa block snippets are offered only outside recognized structural
  blocks
- HTML tag completions are offered only inside the canonical `[template]` block
  after `<`
- HTML attribute completions are offered only while editing an opening HTML tag
  inside `[template]`
- local template-visible top-level bindings from `[ts]` and `[js]` are offered
  as completion items inside `{...}` expressions within canonical `[template]`
- hover inside canonical template expressions can describe local
  template-visible bindings from `[ts]` and `[js]`
- canonical template expressions can navigate to local `[ts]` and `[js]`
  declarations via go-to-definition
- document symbols expose parsed blocks and local top-level script bindings
- simple missing local bindings inside canonical template expressions emit warning diagnostics
- warning diagnostics are emitted only for malformed canonical blocks
  recognized by the diagnostics engine

Current block behavior:

- Canonical runtime blocks: `[template]`, `[ts]`, `[js]`, `[css]`, `[sass]`,
  `[scss]`
- Compatibility aliases: `[html]`, `[tpl]`

`[html]` and `[tpl]` are structural compatibility aliases. They suppress
top-level block insertion inside the alias block, but they do not receive
template-specific HTML completions, local symbol intelligence, or runtime block
diagnostics.

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

## Installation

Supported paths:

1. Install from the VS Code Marketplace after a public release.
2. Build and install a local `.vsix` for development or manual verification.

Local packaging details live in [DEVELOPMENT_README.md](./DEVELOPMENT_README.md).

## Ecosystem Fit

This extension complements the rest of the KoppaJS ecosystem:

- KoppaJS core defines runtime semantics
- KoppaJS build tooling owns compilation and bundler integration
- this repository owns editor-time feedback and authoring ergonomics for `.kpa`
  files

## Governance

The repository is governed through the root meta layer and supporting `docs/`
directories:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [ROADMAP.md](./ROADMAP.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [DEVELOPMENT_README.md](./DEVELOPMENT_README.md)
- [docs/specs/kpa-editing-core.md](./docs/specs/kpa-editing-core.md)
- [docs/architecture/module-boundaries.md](./docs/architecture/module-boundaries.md)
- [docs/quality/quality-gates.md](./docs/quality/quality-gates.md)
- [docs/meta/README.md](./docs/meta/README.md)

## License

Apache License 2.0. See [LICENSE](./LICENSE).
