import ts from 'typescript';
import type { KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import { getBlockAtOffset } from './documentModel';
import { createLocatedRange } from './sourcePositions';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from './symbols';
import {
  collectCanonicalTemplateIdentifierReferences,
  getCanonicalTemplateIdentifierReferenceAtOffset,
} from './templateExpressions';

type ScriptBlock = KpaBlockNode & { kind: 'script-ts' | 'script-js' };

interface ScriptSemanticModel {
  block: ScriptBlock;
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
}

export interface KpaLocalSymbolOccurrence {
  range: KpaLocatedRange;
  symbols: readonly KpaScriptSymbol[];
}

export function resolveLocalSymbolOccurrenceAtOffset(
  document: KpaDocument,
  offset: number,
): KpaLocalSymbolOccurrence | undefined {
  const scriptOccurrence = resolveScriptSymbolOccurrenceAtOffset(document, offset);

  if (scriptOccurrence) {
    return {
      range: scriptOccurrence.range,
      symbols: [scriptOccurrence.symbol],
    };
  }

  const templateReference = getCanonicalTemplateIdentifierReferenceAtOffset(document, offset);

  if (!templateReference) {
    return undefined;
  }

  return {
    range: templateReference.range,
    symbols: collectLocalScriptSymbols(document).templateVisible.filter(
      (symbol) => symbol.name === templateReference.name,
    ),
  };
}

export function collectLocalReferenceRangesForSymbols(
  document: KpaDocument,
  symbols: readonly KpaScriptSymbol[],
): readonly KpaLocatedRange[] {
  const ranges = [
    ...symbols.flatMap((symbol) => collectScriptReferenceRangesForSymbol(document, symbol)),
    ...collectTemplateReferenceRangesForSymbols(document, symbols),
  ];

  return deduplicateRanges(ranges);
}

interface ScriptSymbolOccurrence {
  symbol: KpaScriptSymbol;
  range: KpaLocatedRange;
}

function resolveScriptSymbolOccurrenceAtOffset(
  document: KpaDocument,
  offset: number,
): ScriptSymbolOccurrence | undefined {
  const block = getScriptBlockAtOffset(document, offset);

  if (!block) {
    return undefined;
  }

  const semanticModel = createScriptSemanticModel(document, block);
  const blockOffset = offset - block.contentRange.start.offset;
  const occurrenceNode = findIdentifierNodeAtOffset(semanticModel.sourceFile, blockOffset);

  if (!occurrenceNode) {
    return undefined;
  }

  const occurrenceSymbol = semanticModel.checker.getSymbolAtLocation(occurrenceNode);

  if (!occurrenceSymbol) {
    return undefined;
  }

  const localSymbols = collectLocalScriptSymbols(document).all.filter((symbol) =>
    isSymbolInsideBlock(symbol, block),
  );

  for (const symbol of localSymbols) {
    const declarationNode = findIdentifierNodeForSymbol(semanticModel, symbol);

    if (!declarationNode) {
      continue;
    }

    const declarationSymbol = semanticModel.checker.getSymbolAtLocation(declarationNode);

    if (declarationSymbol === occurrenceSymbol) {
      return {
        symbol,
        range: toDocumentRange(
          document,
          block,
          occurrenceNode.getStart(semanticModel.sourceFile),
          occurrenceNode.end,
        ),
      };
    }
  }

  return undefined;
}

function collectScriptReferenceRangesForSymbol(
  document: KpaDocument,
  symbol: KpaScriptSymbol,
): readonly KpaLocatedRange[] {
  const block = findScriptBlockForSymbol(document, symbol);

  if (!block) {
    return [symbol.range];
  }

  const semanticModel = createScriptSemanticModel(document, block);
  const declarationNode = findIdentifierNodeForSymbol(semanticModel, symbol);

  if (!declarationNode) {
    return [symbol.range];
  }

  const declarationSymbol = semanticModel.checker.getSymbolAtLocation(declarationNode);

  if (!declarationSymbol) {
    return [symbol.range];
  }

  const references: KpaLocatedRange[] = [];

  visit(semanticModel.sourceFile);

  return references;

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node)) {
      const nodeSymbol = semanticModel.checker.getSymbolAtLocation(node);

      if (nodeSymbol === declarationSymbol) {
        references.push(
          toDocumentRange(
            document,
            semanticModel.block,
            node.getStart(semanticModel.sourceFile),
            node.end,
          ),
        );
      }
    }

    ts.forEachChild(node, visit);
  }
}

function collectTemplateReferenceRangesForSymbols(
  document: KpaDocument,
  symbols: readonly KpaScriptSymbol[],
): readonly KpaLocatedRange[] {
  const templateVisibleNames = new Set(
    symbols.filter((symbol) => symbol.isTemplateVisible).map((symbol) => symbol.name),
  );

  if (templateVisibleNames.size === 0) {
    return [];
  }

  return collectCanonicalTemplateIdentifierReferences(document)
    .filter((reference) => templateVisibleNames.has(reference.name))
    .map((reference) => reference.range);
}

function createScriptSemanticModel(document: KpaDocument, block: ScriptBlock): ScriptSemanticModel {
  const fileName = block.kind === 'script-ts' ? 'embedded.kpa.ts' : 'embedded.kpa.js';
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    block.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const compilerOptions: ts.CompilerOptions = {
    allowJs: block.kind === 'script-js',
    checkJs: block.kind === 'script-js',
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const compilerHost = ts.createCompilerHost(compilerOptions, true);

  compilerHost.getSourceFile = (requestedFileName) =>
    requestedFileName === fileName ? sourceFile : undefined;
  compilerHost.readFile = (requestedFileName) =>
    requestedFileName === fileName ? content : undefined;
  compilerHost.fileExists = (requestedFileName) => requestedFileName === fileName;
  compilerHost.writeFile = () => undefined;
  compilerHost.getDefaultLibFileName = () => 'lib.d.ts';
  compilerHost.getCurrentDirectory = () => '';
  compilerHost.getDirectories = () => [];
  compilerHost.getCanonicalFileName = (requestedFileName) => requestedFileName;
  compilerHost.useCaseSensitiveFileNames = () => true;
  compilerHost.getNewLine = () => '\n';

  const program = ts.createProgram([fileName], compilerOptions, compilerHost);

  return {
    block,
    sourceFile,
    checker: program.getTypeChecker(),
  };
}

function findIdentifierNodeForSymbol(
  semanticModel: ScriptSemanticModel,
  symbol: KpaScriptSymbol,
): ts.Identifier | undefined {
  const startOffset = symbol.range.start.offset - semanticModel.block.contentRange.start.offset;
  const endOffset = symbol.range.end.offset - semanticModel.block.contentRange.start.offset;

  return findIdentifierNodeByExactRange(semanticModel.sourceFile, startOffset, endOffset);
}

function findIdentifierNodeAtOffset(
  sourceFile: ts.SourceFile,
  offset: number,
): ts.Identifier | undefined {
  let matchingNode: ts.Identifier | undefined;

  visit(sourceFile);

  return matchingNode;

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && offset >= node.getStart(sourceFile) && offset <= node.end) {
      matchingNode = node;
    }

    ts.forEachChild(node, visit);
  }
}

function findIdentifierNodeByExactRange(
  sourceFile: ts.SourceFile,
  startOffset: number,
  endOffset: number,
): ts.Identifier | undefined {
  let matchingNode: ts.Identifier | undefined;

  visit(sourceFile);

  return matchingNode;

  function visit(node: ts.Node): void {
    if (
      ts.isIdentifier(node) &&
      node.getStart(sourceFile) === startOffset &&
      node.end === endOffset
    ) {
      matchingNode = node;
      return;
    }

    ts.forEachChild(node, visit);
  }
}

function toDocumentRange(
  document: KpaDocument,
  block: ScriptBlock,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaLocatedRange {
  return createLocatedRange(
    document.lineStarts,
    block.contentRange.start.offset + startOffsetInBlock,
    block.contentRange.start.offset + endOffsetInBlock,
  );
}

function getScriptBlockAtOffset(document: KpaDocument, offset: number): ScriptBlock | undefined {
  const block = getBlockAtOffset(document, offset, ['ts', 'js']);

  if (!block) {
    return undefined;
  }

  if (block.kind !== 'script-ts' && block.kind !== 'script-js') {
    return undefined;
  }

  return block as ScriptBlock;
}

function findScriptBlockForSymbol(
  document: KpaDocument,
  symbol: KpaScriptSymbol,
): ScriptBlock | undefined {
  return document.blocks.find(
    (block): block is ScriptBlock =>
      (block.kind === 'script-ts' || block.kind === 'script-js') &&
      isSymbolInsideBlock(symbol, block),
  );
}

function isSymbolInsideBlock(symbol: KpaScriptSymbol, block: KpaBlockNode): boolean {
  return (
    symbol.range.start.offset >= block.contentRange.start.offset &&
    symbol.range.end.offset <= block.contentRange.end.offset
  );
}

function deduplicateRanges(ranges: readonly KpaLocatedRange[]): readonly KpaLocatedRange[] {
  const seen = new Set<string>();

  return ranges.filter((range) => {
    const key = `${range.start.offset}:${range.end.offset}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
