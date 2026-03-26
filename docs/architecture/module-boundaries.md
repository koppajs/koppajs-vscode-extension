# Module Boundaries

## Folder Responsibilities

| Path                       | Responsibility                                                                       | Allowed Dependencies                          | Must Not Depend On                     |
| -------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------- |
| `src/extension.ts`         | Composition root, event wiring, activation/deactivation                              | `vscode`, providers, diagnostics              | feature modules depending back on it   |
| `src/providers/`           | Completion logic for blocks, tags, and attributes                                    | `vscode`, `src/utils/`, `src/data/`           | `src/extension.ts`                     |
| `src/language/`            | Parser, document model, source positions, diagnostics rules, local symbol extraction | `src/data/` if required by block contracts    | `vscode`, provider modules             |
| `src/diagnosticsEngine.ts` | Pure diagnostics entrypoint over parsed documents                                    | `src/data/`, `src/language/`                  | `vscode`, provider modules             |
| `src/diagnostics.ts`       | VS Code diagnostic emission and collection management                                | `vscode`, `src/diagnosticsEngine.ts`          | provider modules                       |
| `src/utils/`               | Shared helper logic for block and position analysis                                  | `src/language/` or other pure utility modules | runtime stateful modules               |
| `src/data/`                | Static completion catalogs and block-name contracts                                  | none                                          | `vscode`, providers, diagnostics       |
| `src/test/unit/`           | Unit tests for pure helpers and parser logic                                         | pure runtime modules, Vitest                  | production modules importing test code |
| `src/test/integration/`    | VS Code host integration tests                                                       | runtime modules, `vscode` test APIs           | production modules importing test code |
| `syntaxes/`                | TextMate grammar definitions                                                         | none                                          | TypeScript runtime modules             |
| root JSON/tooling files    | build and editor configuration                                                       | none                                          | application runtime imports            |

## Boundary Rules

- Keep completion logic in provider modules; do not spread it across `extension.ts`.
- Keep `.kpa` parsing and document-shape logic in `src/language/`; do not duplicate it across helpers.
- Keep pure diagnostics entrypoints in `src/diagnosticsEngine.ts`; keep VS Code object creation in `src/diagnostics.ts`.
- Compatibility aliases may affect structural context without automatically gaining canonical template completions or diagnostics.
- Keep canonical behavior decisions documented when grammar aliases and runtime behavior differ.
- If a module begins serving more than one distinct responsibility, split it and document the new boundary.

## Current Architectural Pressure Points

- Syntax aliases are broader than canonical template intelligence; only structural suppression is currently shared.
- The parser-backed document model is still internal and has not yet been extracted into shared language packages.
- Local script symbol extraction is still internal and not yet wired into completion or hover features.
- Integration tests still use inline document creation even though unit-level fixtures now exist for parser coverage.
