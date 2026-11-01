import ts from 'typescript';
import type { KpaBlockKind, KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import { createLocatedRange } from './sourcePositions';

type ScriptBlockKind = Extract<KpaBlockKind, 'script-ts' | 'script-js'>;

export type KpaScriptSymbolKind =
  | 'class'
  | 'enum'
  | 'function'
  | 'import'
  | 'import-type'
  | 'interface'
  | 'type-alias'
  | 'variable';

export interface KpaScriptSymbol {
  name: string;
  kind: KpaScriptSymbolKind;
  blockName: string;
  blockKind: ScriptBlockKind;
  isExported: boolean;
  isTemplateVisible: boolean;
  range: KpaLocatedRange;
}

export interface KpaLocalScriptSymbolTable {
  all: readonly KpaScriptSymbol[];
  exported: readonly KpaScriptSymbol[];
  templateVisible: readonly KpaScriptSymbol[];
}

type MutableKpaScriptSymbol = KpaScriptSymbol;

interface BlockSymbolContext {
  block: KpaBlockNode & { kind: ScriptBlockKind };
  document: KpaDocument;
  sourceFile: ts.SourceFile;
  symbols: MutableKpaScriptSymbol[];
  symbolsByName: Map<string, MutableKpaScriptSymbol[]>;
}

export function collectLocalScriptSymbols(document: KpaDocument): KpaLocalScriptSymbolTable {
  const allSymbols = document.blocks.flatMap((block) =>
    isScriptBlock(block) ? collectSymbolsFromScriptBlock(document, block) : [],
  );

  return {
    all: allSymbols,
    exported: allSymbols.filter((symbol) => symbol.isExported),
    templateVisible: allSymbols.filter((symbol) => symbol.isTemplateVisible),
  };
}

function collectSymbolsFromScriptBlock(
  document: KpaDocument,
  block: KpaBlockNode & { kind: ScriptBlockKind },
): MutableKpaScriptSymbol[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const sourceFile = ts.createSourceFile(
    createEmbeddedFileName(block.kind),
    content,
    ts.ScriptTarget.Latest,
    true,
    block.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const symbols: MutableKpaScriptSymbol[] = [];
  const symbolsByName = new Map<string, MutableKpaScriptSymbol[]>();
  const context: BlockSymbolContext = {
    block,
    document,
    sourceFile,
    symbols,
    symbolsByName,
  };

  for (const statement of sourceFile.statements) {
    collectDeclaredSymbols(statement, context);
  }

  for (const statement of sourceFile.statements) {
    applyExportListMetadata(statement, symbolsByName);
  }

  return symbols;
}

function collectDeclaredSymbols(statement: ts.Statement, context: BlockSymbolContext): void {
  if (ts.isImportDeclaration(statement)) {
    collectImportDeclarationSymbols(statement, context);
    return;
  }

  if (ts.isImportEqualsDeclaration(statement)) {
    addSymbol(
      context,
      statement.name,
      statement.isTypeOnly ? 'import-type' : 'import',
      hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    );
    return;
  }

  if (ts.isVariableStatement(statement)) {
    const isExported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);

    for (const declaration of statement.declarationList.declarations) {
      collectBindingNameSymbols(declaration.name, context, 'variable', isExported);
    }

    return;
  }

  if (ts.isFunctionDeclaration(statement) && statement.name) {
    addSymbol(
      context,
      statement.name,
      'function',
      hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    );
    return;
  }

  if (ts.isClassDeclaration(statement) && statement.name) {
    addSymbol(
      context,
      statement.name,
      'class',
      hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    );
    return;
  }

  if (ts.isEnumDeclaration(statement)) {
    addSymbol(context, statement.name, 'enum', hasModifier(statement, ts.SyntaxKind.ExportKeyword));
    return;
  }

  if (ts.isInterfaceDeclaration(statement)) {
    addSymbol(
      context,
      statement.name,
      'interface',
      hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    );
    return;
  }

  if (ts.isTypeAliasDeclaration(statement)) {
    addSymbol(
      context,
      statement.name,
      'type-alias',
      hasModifier(statement, ts.SyntaxKind.ExportKeyword),
    );
  }
}

function collectImportDeclarationSymbols(
  statement: ts.ImportDeclaration,
  context: BlockSymbolContext,
): void {
  const importClause = statement.importClause;

  if (!importClause) {
    return;
  }

  if (importClause.name) {
    addSymbol(context, importClause.name, importClause.isTypeOnly ? 'import-type' : 'import');
  }

  if (!importClause.namedBindings) {
    return;
  }

  if (ts.isNamespaceImport(importClause.namedBindings)) {
    addSymbol(
      context,
      importClause.namedBindings.name,
      importClause.isTypeOnly ? 'import-type' : 'import',
    );
    return;
  }

  for (const element of importClause.namedBindings.elements) {
    addSymbol(
      context,
      element.name,
      importClause.isTypeOnly || element.isTypeOnly ? 'import-type' : 'import',
    );
  }
}

function collectBindingNameSymbols(
  name: ts.BindingName,
  context: BlockSymbolContext,
  kind: Extract<KpaScriptSymbolKind, 'variable'>,
  isExported: boolean,
): void {
  if (ts.isIdentifier(name)) {
    addSymbol(context, name, kind, isExported);
    return;
  }

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    collectBindingNameSymbols(element.name, context, kind, isExported);
  }
}

function applyExportListMetadata(
  statement: ts.Statement,
  symbolsByName: Map<string, MutableKpaScriptSymbol[]>,
): void {
  if (ts.isExportDeclaration(statement)) {
    if (
      statement.moduleSpecifier ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      return;
    }

    for (const element of statement.exportClause.elements) {
      const localName = element.propertyName?.text ?? element.name.text;
      markSymbolsAsExported(symbolsByName, localName);
    }

    return;
  }

  if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
    markSymbolsAsExported(symbolsByName, statement.expression.text);
  }
}

function addSymbol(
  context: BlockSymbolContext,
  node: ts.Identifier,
  kind: KpaScriptSymbolKind,
  isExported = false,
): void {
  const symbol: MutableKpaScriptSymbol = {
    name: node.text,
    kind,
    blockName: context.block.name,
    blockKind: context.block.kind,
    isExported,
    isTemplateVisible: isTemplateVisible(kind),
    range: createDocumentRange(
      context.document,
      context.block,
      node.getStart(context.sourceFile),
      node.end,
    ),
  };

  context.symbols.push(symbol);

  const symbolsForName = context.symbolsByName.get(symbol.name);

  if (symbolsForName) {
    symbolsForName.push(symbol);
    return;
  }

  context.symbolsByName.set(symbol.name, [symbol]);
}

function createDocumentRange(
  document: KpaDocument,
  block: KpaBlockNode,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaLocatedRange {
  const blockStartOffset = block.contentRange.start.offset;

  return createLocatedRange(
    document.lineStarts,
    blockStartOffset + startOffsetInBlock,
    blockStartOffset + endOffsetInBlock,
  );
}

function markSymbolsAsExported(
  symbolsByName: Map<string, MutableKpaScriptSymbol[]>,
  name: string,
): void {
  const symbols = symbolsByName.get(name);

  if (!symbols) {
    return;
  }

  for (const symbol of symbols) {
    symbol.isExported = true;
  }
}

function isTemplateVisible(kind: KpaScriptSymbolKind): boolean {
  return kind !== 'import-type' && kind !== 'interface' && kind !== 'type-alias';
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }

  return ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false;
}

function isScriptBlock(block: KpaBlockNode): block is KpaBlockNode & { kind: ScriptBlockKind } {
  return block.kind === 'script-ts' || block.kind === 'script-js';
}

function createEmbeddedFileName(kind: ScriptBlockKind): string {
  return kind === 'script-ts' ? 'embedded.kpa.ts' : 'embedded.kpa.js';
}
