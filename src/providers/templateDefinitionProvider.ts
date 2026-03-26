import * as vscode from 'vscode';
import { collectLocalScriptSymbols } from '../language/symbols';
import { getTemplateExpressionContext } from '../utils/templateContext';

const identifierPattern = /[A-Za-z_$][\w$]*/;

export function registerTemplateDefinitionProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerDefinitionProvider('kpa', {
    provideDefinition(document, position) {
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

      return matchingSymbols.map(
        (symbol) => new vscode.Location(document.uri, toVsCodeRange(symbol.range)),
      );
    },
  });

  context.subscriptions.push(provider);
}

function toVsCodeRange(range: {
  start: { line: number; character: number };
  end: { line: number; character: number };
}): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
