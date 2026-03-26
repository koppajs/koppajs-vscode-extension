import * as vscode from 'vscode';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';
import { getTemplateExpressionContext } from '../utils/templateContext';

const identifierPattern = /[A-Za-z_$][\w$]*/;

export function registerTemplateExpressionCompletionProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider(
    'kpa',
    {
      provideCompletionItems(document, position) {
        const text = document.getText();
        const offset = document.offsetAt(position);
        const templateExpressionContext = getTemplateExpressionContext(text, offset);

        if (!templateExpressionContext) {
          return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position, identifierPattern);

        return getUniqueTemplateVisibleSymbols(
          collectLocalScriptSymbols(templateExpressionContext.document).templateVisible,
        ).map((symbol) => createCompletionItem(symbol, wordRange));
      },
    },
    '{',
  );

  context.subscriptions.push(provider);
}

function createCompletionItem(symbol: KpaScriptSymbol, range?: vscode.Range) {
  const item = new vscode.CompletionItem(symbol.name, mapCompletionItemKind(symbol.kind));

  item.detail = `Local ${symbol.kind} from [${symbol.blockName}]`;
  item.documentation = new vscode.MarkdownString(createDocumentation(symbol));
  item.insertText = symbol.name;

  if (range) {
    item.range = range;
  }

  return item;
}

function mapCompletionItemKind(kind: KpaScriptSymbol['kind']): vscode.CompletionItemKind {
  switch (kind) {
    case 'class':
      return vscode.CompletionItemKind.Class;
    case 'enum':
      return vscode.CompletionItemKind.Enum;
    case 'function':
      return vscode.CompletionItemKind.Function;
    case 'import':
    case 'import-type':
      return vscode.CompletionItemKind.Module;
    case 'interface':
    case 'type-alias':
    case 'variable':
      return vscode.CompletionItemKind.Variable;
  }
}

function createDocumentation(symbol: KpaScriptSymbol): string {
  const exportText = symbol.isExported ? ' Exported from this file.' : '';

  return `Template-visible local ${symbol.kind} from \`[${symbol.blockName}]\` block.${exportText}`;
}

function getUniqueTemplateVisibleSymbols(
  symbols: readonly KpaScriptSymbol[],
): readonly KpaScriptSymbol[] {
  const seenNames = new Set<string>();

  return symbols.filter((symbol) => {
    if (seenNames.has(symbol.name)) {
      return false;
    }

    seenNames.add(symbol.name);
    return true;
  });
}
