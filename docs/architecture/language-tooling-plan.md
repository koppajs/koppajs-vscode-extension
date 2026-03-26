# Language Tooling Plan

## Purpose

Define the concrete technical path from the current VS Code extension to the
kind of developer experience users expect from mature ecosystems such as Vue and
Svelte: typed completions, hover details, semantic diagnostics, go-to-definition,
references, rename, and workspace-aware editor feedback.

## Desired Developer Experience

The extension should eventually provide:

- completions that show symbols, types, and origin information
- hover content for KoppaJS constructs, component APIs, and inferred types
- semantic diagnostics instead of only structural block warnings
- go-to-definition for components, imports, and exported symbols
- find references and safe rename
- document symbols and workspace symbols
- quick fixes for common structural and semantic issues
- consistency between editor diagnostics and CLI diagnostics

This is not achievable with grammar files and static completion catalogs alone.

## Capability Ladder

### Level 0: Current State

Current repository behavior:

- syntax highlighting
- an internal parser-backed document model for `.kpa` block structure
- an internal local symbol extractor for top-level `[ts]` and `[js]` bindings
- static block snippets
- static HTML tag and attribute completions inside canonical `[template]`
- structural canonical-block diagnostics

Missing:

- a symbol model beyond local file scope
- type model
- cross-file analysis
- deep semantic understanding of embedded TS/JS
- editor features built on reusable language truth

### Level 1: Parsed Document Intelligence

Minimum foundation required before typed features:

- a parser for `.kpa` block structure
- a stable AST and document model
- block ranges and source-position mapping
- extracted embedded regions for template, script, and style blocks
- parser-backed diagnostics and completion context

At this level, the extension can become reliable about where the user is, but
it still cannot offer type-aware completions.

### Level 2: Virtual Files and Semantic Analysis

Minimum foundation required for "nice" editor features:

- generate virtual TypeScript/JavaScript representations from `.kpa` documents
- map positions between `.kpa` source and virtual files
- feed those virtual files into a semantic engine
- resolve imports, components, and project config at workspace scope

At this level, the extension can begin to offer:

- typed completions
- hover with inferred types
- go-to-definition
- references
- rename
- richer diagnostics

### Level 3: Shared Tooling Platform

For ecosystem-grade maturity, the semantic engine must become shared
infrastructure:

- `@koppajs/language-core` owns parse, AST, source maps, symbols, semantic rules
- `@koppajs/language-server` exposes those capabilities over LSP
- `@koppajs/kpa-check` exposes the same diagnostics in CI and CLI workflows

At this level, the VS Code extension becomes a client instead of the primary
owner of semantic logic.

## What Is Needed for Typed Completions

Typed completions are the first major feature users will perceive as
"professional tooling". To support them, KoppaJS needs all of the following:

### 1. Embedded Script Understanding

If a `.kpa` file contains `[ts]` or `[js]`, the tooling must know:

- which declarations exist
- which exports exist
- which imports are in scope
- how template expressions can see those bindings

Without that, completions can only be static snippets.

### 2. Template-to-Script Binding Model

The tooling must define:

- which script bindings are visible in `[template]`
- whether components are imported, globally registered, or file-local
- what props, events, or slots a component exposes

This is a KoppaJS language contract question, not a VS Code question.

### 3. Virtual File Generation

The tooling needs to project a `.kpa` document into one or more machine-friendly
virtual representations, for example:

- a virtual TS file for script-visible symbols
- a virtual TS file representing template expressions
- optional supporting metadata for component boundaries

This is how ecosystems like Vue and Svelte unlock TypeScript-powered editor
intelligence.

### 4. Source Maps

Once virtual files exist, the tooling must map:

- original `.kpa` position -> virtual file position
- semantic result in virtual file -> original `.kpa` range

Without source maps, diagnostics and hover data cannot be shown correctly in the
editor.

### 5. Workspace Resolution

Typed completions become much more useful only when the tooling can resolve:

- imports
- project configuration
- aliases
- external component metadata
- neighboring `.kpa` modules

## Recommended Build Order

### Step 1: Parser and Document Model

Build first:

- `parseKpaDocument(text)`
- `KpaDocument`
- `KpaBlock`
- stable ranges and offsets
- fixture-based parser tests

Output of this step:

- reliable block understanding
- safer diagnostics
- safer completion context detection

Current status:

- this step has started inside the extension repository and is still internal

### Step 2: Symbol Extraction for Local Files

Build next:

- extract symbols from `[ts]` and `[js]`
- expose file-local bindings
- define which bindings are visible in `[template]`

Output of this step:

- local template completions for script-defined names
- basic hover for local bindings

Current status:

- a first internal local symbol extractor exists for top-level `[ts]` and `[js]` bindings
- script-to-template visibility is currently modeled only at the local file level

### Step 3: Virtual Files and TS Bridge

Build next:

- virtual-file generation
- source maps
- TS language-service bridge or equivalent shared semantic adapter

Output of this step:

- typed completions
- hover types
- definition and references for local and imported symbols

### Step 4: Workspace Graph

Build next:

- project config reading
- import resolution
- component graph
- invalidation and caching

Output of this step:

- cross-file completion and navigation
- workspace diagnostics
- rename and references that work across the project

### Step 5: Language Server / CLI Extraction

Build next:

- extract stable shared language logic
- expose it through LSP and `kpa-check`

Output of this step:

- editor and CLI parity
- reuse beyond VS Code
- less semantic drift across the ecosystem

## Suggested Internal API Shape

Stage 1 should aim for a small internal API, not a public package yet.

Possible internal surfaces:

```ts
export interface KpaDocument {
  text: string;
  blocks: KpaBlock[];
  getBlockAt(offset: number): KpaBlock | undefined;
}

export interface KpaBlock {
  kind:
    | 'template'
    | 'script-ts'
    | 'script-js'
    | 'style-css'
    | 'style-scss'
    | 'style-sass'
    | 'alias-html'
    | 'alias-tpl';
  name: string;
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
}

export function parseKpaDocument(text: string): KpaDocument;
export function collectKpaDiagnostics(document: KpaDocument): KpaDiagnostic[];
export function getCompletionContext(document: KpaDocument, offset: number): CompletionContext;
```

Stage 2 can later wrap this with:

```ts
export interface SemanticDocument {
  kpa: KpaDocument;
  virtualFiles: VirtualFile[];
  sourceMaps: SourceMap[];
}

export function createSemanticDocument(fileName: string, text: string): SemanticDocument;
```

## Dependencies on Other KoppaJS Repositories

The extension cannot invent these rules safely. They must come from the wider
KoppaJS ecosystem:

- what a canonical `.kpa` component contract is
- what script symbols are visible to the template
- how components are imported and resolved
- whether there are props, emits, slots, stores, or other special contracts
- which project config files control resolution

If those are not yet explicit in `koppajs-core` or ecosystem docs, they need to
be defined before Stage 2 can succeed cleanly.

## Immediate Recommendation

If the near-term goal is "show types and useful completions", the best next move
is not to add more static completion providers.

The best next move is:

1. extend the new parser-backed document model into a local symbol model
2. define local script-to-template symbol visibility
3. prototype virtual files for one narrow happy path
4. only then add typed completion and hover features

That path is slower than adding snippets, but it is the shortest path to real
tooling.
