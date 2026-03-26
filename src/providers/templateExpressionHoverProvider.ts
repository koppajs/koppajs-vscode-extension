import * as vscode from 'vscode';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';
import { getTemplateExpressionContext } from '../utils/templateContext';

const identifierPattern = /[A-Za-z_$][\w$]*/;

export function registerTemplateExpressionHoverProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerHoverProvider('kpa', {
    provideHover(document, position) {
      const text = document.getText();
      const offset = document.offsetAt(position);
      const templateExpressionContext = getTemplateExpressionContext(text, offset);

      if (!templateExpressionContext) {
        return undefined;
      }

      const wordRange = document.getWordRangeAtPosition(position, identifierPattern);

      if (!wordRange) {
        return undefined;
      }

      const symbolName = document.getText(wordRange);
      const matchingSymbols = collectLocalScriptSymbols(
        templateExpressionContext.document,
      ).templateVisible.filter((symbol) => symbol.name === symbolName);

      if (matchingSymbols.length === 0) {
        return undefined;
      }

      return new vscode.Hover(
        matchingSymbols.map((symbol) => createHoverContents(symbol)),
        wordRange,
      );
    },
  });

  context.subscriptions.push(provider);
}

function createHoverContents(symbol: KpaScriptSymbol): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString();

  markdown.appendCodeblock(`${symbol.kind} ${symbol.name}`, 'typescript');
  markdown.appendMarkdown(
    `Template-visible local ${symbol.kind} from \`[${symbol.blockName}]\` block.`,
  );

  if (symbol.isExported) {
    markdown.appendMarkdown('\n\nExported from this file.');
  }

  markdown.isTrusted = false;

  return markdown;
}
