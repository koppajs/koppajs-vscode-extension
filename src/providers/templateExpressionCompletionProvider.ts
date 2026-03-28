import * as vscode from 'vscode';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';
import {
  getTemplateSemanticCompletions,
  type TemplateSemanticCompletion,
} from '../language/templateSemantics';
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

        const semanticCompletions = getTemplateSemanticCompletions(
          templateExpressionContext.document,
          document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
          offset,
        );

        if (semanticCompletions && semanticCompletions.length > 0) {
          return semanticCompletions.map((completion) => createSemanticCompletionItem(completion));
        }

        const wordRange = document.getWordRangeAtPosition(position, identifierPattern);
        return getUniqueTemplateVisibleSymbols(
          collectLocalScriptSymbols(templateExpressionContext.document).templateVisible,
        ).map((symbol) => createCompletionItem(symbol, wordRange));
      },
    },
    '{',
    '.',
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

function createSemanticCompletionItem(completion: TemplateSemanticCompletion) {
  const item = new vscode.CompletionItem(
    completion.name,
    mapTypeScriptCompletionItemKind(completion.kind),
  );

  item.detail = completion.detail;
  item.documentation = completion.documentation
    ? new vscode.MarkdownString(completion.documentation)
    : undefined;
  item.insertText = completion.name;

  if (completion.replacementRange) {
    item.range = new vscode.Range(
      completion.replacementRange.start.line,
      completion.replacementRange.start.character,
      completion.replacementRange.end.line,
      completion.replacementRange.end.character,
    );
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

function mapTypeScriptCompletionItemKind(kind: string): vscode.CompletionItemKind {
  switch (kind) {
    case 'class':
      return vscode.CompletionItemKind.Class;
    case 'const':
    case 'let':
    case 'var':
    case 'local var':
      return vscode.CompletionItemKind.Variable;
    case 'enum':
      return vscode.CompletionItemKind.Enum;
    case 'function':
    case 'method':
      return vscode.CompletionItemKind.Function;
    case 'getter':
    case 'setter':
    case 'property':
      return vscode.CompletionItemKind.Property;
    case 'interface':
      return vscode.CompletionItemKind.Interface;
    case 'module':
    case 'alias':
      return vscode.CompletionItemKind.Module;
    case 'type':
      return vscode.CompletionItemKind.TypeParameter;
    case 'keyword':
      return vscode.CompletionItemKind.Keyword;
    case 'warning':
      return vscode.CompletionItemKind.Issue;
    default:
      return vscode.CompletionItemKind.Text;
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
