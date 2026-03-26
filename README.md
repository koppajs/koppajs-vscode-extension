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
    <i>Syntax support, snippets, and structural diagnostics for the KoppaJS editing experience.</i>
  </p>
</div>

<br>

<div align="center">
  <p align="center">
    <a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-core">KoppaJS Core</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vite-plugin">Vite Plugin</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vscode-extension/issues">Issues</a>
  </p>
</div>

<br>

<details>
<summary>Table of Contents</summary>
  <ol>
    <li><a href="#what-is-this-extension">What is this extension?</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#supported-blocks">Supported Blocks</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#requirements">Requirements</a></li>
    <li><a href="#architecture--governance">Architecture & Governance</a></li>
    <li><a href="#community--contribution">Community & Contribution</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## What is this extension?

`koppajs-vscode-extension` is the official Visual Studio Code extension for the
KoppaJS `.kpa` authoring format.

It focuses on editor support, not framework runtime behavior:

- syntax highlighting for `.kpa` blocks
- snippets for common block patterns
- HTML completions in the canonical template block
- structural diagnostics for incorrectly opened or closed blocks

---

## Features

- syntax highlighting for KoppaJS blocks and embedded languages
- snippets for common KoppaJS block structures
- HTML tag and attribute completion inside the canonical `[template]` block
- warnings for incomplete or mismatched canonical blocks

---

## Supported Blocks

Full editor support:

- `[template]`
- `[ts]`
- `[js]`
- `[css]`
- `[sass]`
- `[scss]`

Grammar-compatible legacy HTML-like aliases:

- `[html]`
- `[tpl]`

`[html]` and `[tpl]` are currently supported for syntax highlighting, but they
are not treated as fully equivalent aliases for completions and diagnostics.

---

## Installation

There are two supported paths:

1. Marketplace installation after a public release.
2. Local `.vsix` packaging and installation for development or manual testing.

Local packaging details live in [DEVELOPMENT_README.md](./DEVELOPMENT_README.md).

---

## Usage

Open a `.kpa` file in Visual Studio Code.
The extension activates automatically for the `kpa` language mode.

Example:

```plaintext
[template]
  <div>
    <p>Hello Koppa!</p>
  </div>
[/template]

[ts]
  const msg: string = "Hello TypeScript in Koppa!";
  console.log(msg);
[/ts]

[css]
  div {
    color: red;
  }
[/css]
```

---

## Requirements

For users:

- Visual Studio Code `^1.82.0`

For local repository work:

- the repo toolchain defined by `package.json`
- a local install path capable of building and testing the extension bundle

---

## Architecture & Governance

Architecture, testing, and contributor workflow documents live in the repo root
and under `docs/`:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [ROADMAP.md](./ROADMAP.md)
- [DEVELOPMENT_README.md](./DEVELOPMENT_README.md)
- [docs/meta/tooling-baseline.md](./docs/meta/tooling-baseline.md)
- [docs/specs/kpa-editing-core.md](./docs/specs/kpa-editing-core.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## Community & Contribution

Issues and pull requests are welcome:

https://github.com/koppajs/koppajs-vscode-extension/issues

Contributor workflow details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

Apache License 2.0 — © 2026 KoppaJS, Bastian Bensch
