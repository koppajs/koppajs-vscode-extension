import path from 'path';
import * as vscode from 'vscode';
import type { KpaWorkspaceSymbolEntry } from '../language/core';
import { getWorkspaceIndex } from './workspaceIndexService';

export function registerWorkspaceSymbolProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerWorkspaceSymbolProvider({
    async provideWorkspaceSymbols(query) {
      return getWorkspaceIndex()
        .collectWorkspaceSymbols(query)
        .map(
          (entry) =>
            new vscode.SymbolInformation(
              entry.name,
              toVsCodeSymbolKind(entry),
              vscode.workspace.asRelativePath(path.dirname(entry.filePath)),
              new vscode.Location(vscode.Uri.file(entry.filePath), toVsCodeRange(entry.range)),
            ),
        );
    },
  });

  context.subscriptions.push(provider);
}

function toVsCodeSymbolKind(entry: KpaWorkspaceSymbolEntry): vscode.SymbolKind {
  switch (entry.kind) {
    case 'component':
      return vscode.SymbolKind.Class;
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

function toVsCodeRange(range: KpaWorkspaceSymbolEntry['range']): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
