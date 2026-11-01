# Module Boundaries

## Folder Responsibilities

| Path                       | Responsibility                                                                                                                       | Allowed Dependencies                                                           | Must Not Depend On                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------- |
| `src/extension.ts`         | Hybrid composition root: local registrations, LSP client/middleware, event wiring, activation/deactivation                           | `vscode`, `vscode-languageclient/node`, Node path APIs, providers, diagnostics | feature modules depending back on it   |
| `src/providers/`           | Local block/HTML/legacy completions, hover/definition/references/rename, component code actions, symbols and workspace-index service | `vscode`, `src/utils/`, `src/data/`, `src/language/`                           | `src/extension.ts`                     |
| `src/language/`            | Parser, document model, source positions, diagnostics rules, local symbol extraction, template-expression analysis                   | sibling language modules, `src/data/`, Node filesystem/path APIs, TypeScript   | `vscode`, provider modules             |
| `src/diagnosticsEngine.ts` | Pure diagnostics entrypoint over parsed documents                                                                                    | `src/data/`, `src/language/`                                                   | `vscode`, provider modules             |
| `src/diagnostics.ts`       | Local collection publishing only uncoded legacy missing-binding warnings                                                             | `vscode`, `src/diagnosticsEngine.ts`                                           | provider modules                       |
| `src/utils/`               | Shared helper logic for block, template-context, and position analysis                                                               | `src/language/` or other pure utility modules                                  | runtime stateful modules               |
| `src/data/`                | Static completion catalogs and block-name contracts                                                                                  | none                                                                           | `vscode`, providers, diagnostics       |
| `src/test/unit/`           | Unit tests for pure helpers and parser logic                                                                                         | pure runtime modules, Vitest                                                   | production modules importing test code |
| `src/test/integration/`    | VS Code host integration tests                                                                                                       | runtime modules, `vscode` test APIs                                            | production modules importing test code |
| `syntaxes/`                | TextMate grammar definitions                                                                                                         | none                                                                           | TypeScript runtime modules             |
| root JSON/tooling files    | build and editor configuration                                                                                                       | none                                                                           | application runtime imports            |

## Boundary Rules

- `src/providers/englishPresentation.ts` owns English rendering of known server diagnostic messages, rename errors and matching HTML completion documentation. `src/language/englishMessages.cjs` provides a pure message mapping shared with `scripts/kpa-check.mjs`. These adapters preserve semantic results and user content; installed shared packages are not rewritten.

- `scripts/prepare-languageclient.mjs` owns only the guarded installation-time client/minimatch API adaptation. It must not grow into a fork of client matching or shared language behavior; see ADR 0006.
- Keep completion logic in provider modules; do not spread it across `extension.ts`.
- Keep hover presentation logic in provider modules; do not move editor-facing markdown shaping into the language layer.
- Keep retained local parsing and document-shape logic in `src/language/`; do not duplicate it across helpers. Shared runtime language services live in the published language packages bundled into `dist/language-server.js`.
- Keep template-expression parsing and semantic diagnostics in pure language modules so providers stay thin adapters.
- Keep pure diagnostics entrypoints in `src/diagnosticsEngine.ts`; keep VS Code object creation in `src/diagnostics.ts`.
- Compatibility aliases may affect structural context without automatically gaining canonical template completions or diagnostics.
- Keep canonical behavior decisions documented when grammar aliases and runtime behavior differ.
- If a module begins serving more than one distinct responsibility, split it and document the new boundary.

## Current Architectural Pressure Points

- Syntax aliases are broader than canonical template intelligence; only structural suppression is currently shared.
- Published shared language packages already serve LSP and CLI consumers, but retained local parser/symbol/semantic modules still serve compatibility providers. This is a hybrid migration, not a completed removal of local language logic.
- Local component references and rename traverse workspace importer documents; local binding rename remains file-scoped. Component importer rename does not rename the component source.
- `src/providers/providerOwnership.ts` defines matching local reference/rename boundaries for the client middleware and providers. Completion/hover/definition for legacy expressions stays local; runtime expressions, HTML/component completions and document symbols stay server-owned. Workspace symbols use the local adapter only without workspace folders.
- Component quick fixes remain local: Prop/import diagnostics are filtered from duplicate server code-action requests, and slot/emit repairs are checked against current shared diagnostics before proposing edits.
- Local `src/diagnostics.ts` filters engine results to legacy missing-binding warnings. This collection is an explicit CLI-parity exception; it is not a second publisher of all structural/component diagnostics.
- Integration tests still use inline document creation even though unit-level fixtures now exist for parser coverage.
