import * as vscode from 'vscode';
import type { KpaBlockKind, KpaBlockNode, KpaLocatedRange } from '../language/ast';
import { parseKpaDocument } from '../language/parser';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';

export function registerDocumentSymbolProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerDocumentSymbolProvider('kpa', {
    provideDocumentSymbols(document) {
      const kpaDocument = parseKpaDocument(document.getText());
      const scriptSymbols = collectLocalScriptSymbols(kpaDocument).all;

      return kpaDocument.blocks.map((block) => createBlockDocumentSymbol(block, scriptSymbols));
    },
  });

  context.subscriptions.push(provider);
}

function createBlockDocumentSymbol(
  block: KpaBlockNode,
  scriptSymbols: readonly KpaScriptSymbol[],
): vscode.DocumentSymbol {
  const documentSymbol = new vscode.DocumentSymbol(
    `[${block.name}]`,
    describeBlockKind(block.kind),
    mapBlockSymbolKind(block.kind),
    toVsCodeRange(block.range),
    toVsCodeRange(block.openTag.range),
  );

  documentSymbol.children = scriptSymbols
    .filter((symbol) => isSymbolInsideBlock(symbol, block))
    .map(createScriptDocumentSymbol);

  return documentSymbol;
}

function createScriptDocumentSymbol(symbol: KpaScriptSymbol): vscode.DocumentSymbol {
  return new vscode.DocumentSymbol(
    symbol.name,
    symbol.kind,
    mapScriptSymbolKind(symbol.kind),
    toVsCodeRange(symbol.range),
    toVsCodeRange(symbol.range),
  );
}

function isSymbolInsideBlock(symbol: KpaScriptSymbol, block: KpaBlockNode): boolean {
  return (
    symbol.range.start.offset >= block.contentRange.start.offset &&
    symbol.range.end.offset <= block.contentRange.end.offset
  );
}

function mapBlockSymbolKind(kind: KpaBlockKind): vscode.SymbolKind {
  switch (kind) {
    case 'template':
      return vscode.SymbolKind.Namespace;
    case 'script-ts':
    case 'script-js':
      return vscode.SymbolKind.Module;
    case 'style-css':
    case 'style-sass':
    case 'style-scss':
      return vscode.SymbolKind.Package;
    case 'alias-html':
    case 'alias-tpl':
      return vscode.SymbolKind.Namespace;
    case 'unknown':
      return vscode.SymbolKind.Object;
  }
}

function mapScriptSymbolKind(kind: KpaScriptSymbol['kind']): vscode.SymbolKind {
  switch (kind) {
    case 'class':
      return vscode.SymbolKind.Class;
    case 'enum':
      return vscode.SymbolKind.Enum;
    case 'function':
      return vscode.SymbolKind.Function;
    case 'import':
    case 'import-type':
      return vscode.SymbolKind.Module;
    case 'interface':
      return vscode.SymbolKind.Interface;
    case 'type-alias':
      return vscode.SymbolKind.TypeParameter;
    case 'variable':
      return vscode.SymbolKind.Variable;
  }
}

function describeBlockKind(kind: KpaBlockKind): string {
  switch (kind) {
    case 'template':
      return 'Canonical template block';
    case 'script-ts':
      return 'TypeScript block';
    case 'script-js':
      return 'JavaScript block';
    case 'style-css':
      return 'CSS block';
    case 'style-sass':
      return 'Sass block';
    case 'style-scss':
      return 'SCSS block';
    case 'alias-html':
      return 'Compatibility HTML alias block';
    case 'alias-tpl':
      return 'Compatibility template alias block';
    case 'unknown':
      return 'Unknown block';
  }
}

function toVsCodeRange(range: KpaLocatedRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
