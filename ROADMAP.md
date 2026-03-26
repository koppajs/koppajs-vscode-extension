# Roadmap

## Objective

Evolve KoppaJS tooling from a narrow VS Code extension into a stable language
tooling layer for the broader KoppaJS ecosystem without rewriting working
systems or introducing speculative architecture too early.

The benchmark is not "more snippets". The benchmark is the maturity pattern used
by ecosystems such as Vue and Svelte:

- a canonical parser and document model
- a reusable language core
- a language server and CLI checks
- editor clients that are thin adapters on top of shared semantic truth

## Current Position

As of this repository state, KoppaJS has:

- a VS Code extension with grammar support
- an internal parser-backed `.kpa` document model inside this repository
- top-level block snippets
- HTML tag and attribute completion inside canonical `[template]`
- lightweight structural diagnostics for canonical blocks

KoppaJS does not yet have:

- a reusable language core consumed by more than the extension
- a language server
- workspace-wide semantic analysis
- cross-file navigation, rename, or symbol intelligence
- a CLI equivalent to IDE diagnostics

## Target End State

The intended long-term shape is:

- `koppajs-core` remains the runtime and compiler truth
- `koppajs-vite-plugin` remains build-tool integration
- a dedicated language-tooling layer owns parsing, source maps, semantic checks,
  and editor-facing analysis
- the VS Code extension becomes a thin presentation client over shared language
  services

This repository should only remain the place for core language infrastructure
until there is real duplication pressure. Extraction should happen only when at
least two consumers need the same semantics.

## Stage 1: Language Foundation Inside the Extension Repo

### Goal

Replace heuristic-only editor behavior with a real internal language foundation,
while keeping scope inside this repository until the interfaces stabilize.

### Scope

- introduce a canonical `.kpa` parser for block structure and positions
- define a small AST and document model for `.kpa` files
- replace regex and offset heuristics where the parser provides clearer truth
- move diagnostics and completion context decisions onto parsed structure
- add fixture-driven tests for representative `.kpa` documents
- keep the public VS Code extension contract stable during the transition

### Expected Internal Modules

- `src/language/parser.ts`
- `src/language/ast.ts`
- `src/language/documentModel.ts`
- `src/language/sourcePositions.ts`
- `src/language/diagnosticsRules.ts`

These remain internal at Stage 1. Do not publish them as stable packages yet.

### Ecosystem Dependencies

- read canonical block semantics from KoppaJS documentation and runtime rules
- align template/script/style block meaning with `koppajs-core`
- document any mismatches explicitly instead of papering over them in the editor

### Exit Criteria

- structural diagnostics no longer depend primarily on ad-hoc regex scanning
- completion suppression and block-context logic are parser-backed
- representative `.kpa` fixtures cover valid, malformed, and alias cases
- the extension contract in `docs/specs/` remains accurate
- no new public API is introduced without a real second consumer

## Stage 2: Shared Language Core and Language Server

### Goal

Promote the stabilized language foundation into a shared tooling layer once
there are at least two real consumers, expected to be the VS Code extension plus
CLI checks or build tooling.

### Trigger for Extraction

Create a separate tooling repo or package workspace only when one of these is
true:

- the extension and a CLI need the same parser and diagnostics
- the extension and `koppajs-vite-plugin` need the same source-map or semantic layer
- another editor client or automation consumer appears

### Recommended Package Split

- `@koppajs/language-core`
- `@koppajs/language-server`
- `@koppajs/kpa-check`

### Responsibilities

`@koppajs/language-core`:

- parse `.kpa` files
- expose AST, document model, block ranges, and source maps
- provide completion context, symbol extraction, and diagnostics primitives
- remain independent from VS Code APIs

`@koppajs/language-server`:

- expose LSP features over the shared language core
- support diagnostics, hover, definitions, references, document symbols, and rename
- coordinate workspace analysis and file invalidation

`@koppajs/kpa-check`:

- provide CLI diagnostics equivalent to the shared editor diagnostics
- allow CI and local validation without VS Code

### Extension Role After Extraction

This repository then narrows to:

- grammar and language configuration
- VS Code client wiring
- completion/diagnostic presentation adapters
- integration tests for the actual extension host behavior

### Exit Criteria

- VS Code diagnostics and CLI diagnostics are produced by the same semantic rules
- the parser and semantic engine are no longer owned only by the extension
- go-to-definition, hover, and document symbols work for core `.kpa` constructs
- the extension becomes a consumer of shared tooling rather than the owner of all logic

## Stage 3: Ecosystem-Grade Semantic Tooling

### Goal

Reach the level where KoppaJS tooling feels comparable to modern Vue and Svelte
ergonomics for day-to-day authoring.

### Capabilities to Add

- virtual-file generation for embedded TypeScript and template intelligence
- cross-file component and import resolution
- typed completions with symbol and type information
- symbol-aware rename and references
- hover documentation for KoppaJS constructs
- workspace-wide diagnostics with incremental invalidation
- code actions and safe quick fixes for common structural errors
- a formatter strategy, either native or clearly delegated
- richer completion based on actual KoppaJS semantics instead of static HTML-only catalogs

### Likely Additional Packages or Adapters

- `@koppajs/typescript-plugin` or equivalent TS bridge
- component metadata extraction shared with docs or build tooling
- optional editor adapters beyond VS Code if LSP adoption becomes valuable

### Dependencies on the Wider Ecosystem

This stage requires stable truth from outside the extension:

- compiler-facing semantics from `koppajs-core`
- import and transform behavior from `koppajs-vite-plugin`
- a documented project configuration contract for workspace analysis

Without those contracts, Stage 3 will produce editor behavior that guesses
instead of knowing.

### Exit Criteria

- cross-file KoppaJS navigation is reliable
- template and script intelligence use shared semantic truth
- editor diagnostics, CLI diagnostics, and build-time semantics no longer drift
- the VS Code extension is only one client among potentially several consumers

## Deliberate Non-Goals for Now

Do not prioritize these before Stage 2 is stable:

- browser preview tooling
- component inspector or devtools UI
- Playwright or browser-E2E layers for this repo
- broad abstraction of every future editor integration before LSP is real
- speculative formatting subsystems without a settled document model

## Immediate Next Actions

- decide canonical block semantics for `[template]`, `[html]`, and `[tpl]`
- define local script-to-template symbol visibility for `.kpa` files
- prototype virtual-file generation for one narrow typed-completion path
- identify the minimum semantic contracts that must come from `koppajs-core`
- define when `koppajs-vite-plugin` and editor tooling should share source-map logic

## Meta Layer Maintenance

- Keep governance documents in sync with real code structure after every architectural change.
- Record major architecture decisions as ADRs instead of letting rationale stay implicit.
- Re-run a repository-level meta-layer audit whenever module boundaries, workflows, or public behavior change.
- When Stage 2 starts, add an ADR that explains why extraction is now justified by real reuse.
