import * as vscode from 'vscode';
import { htmlAttributes } from '../data/htmlAttributes';
import { isOffsetInsideOpeningHtmlTag } from '../utils/htmlUtils';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
} from '../utils/templateContext';

function createCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

export function registerHtmlAttributeProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider('kpa', {
    provideCompletionItems(document, position) {
      const text = document.getText();
      const offset = document.offsetAt(position);
      const templateContext = getCanonicalTemplateContext(text, offset);

      if (
        !templateContext ||
        getTemplateExpressionContext(text, offset, templateContext) ||
        !isOffsetInsideOpeningHtmlTag(text, offset)
      ) {
        return undefined;
      }

      return htmlAttributes.map((attribute) =>
        createCompletionItem(attribute.label, attribute.snippet, attribute.documentation),
      );
    },
  });

  context.subscriptions.push(provider);
}
