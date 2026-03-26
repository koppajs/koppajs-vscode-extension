import * as vscode from 'vscode';
import { htmlTags } from '../data/htmlTags';
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

export function registerHtmlTagProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider(
    'kpa',
    {
      provideCompletionItems(document, position) {
        const text = document.getText();
        const offset = document.offsetAt(position);
        const templateContext = getCanonicalTemplateContext(text, offset);

        if (!templateContext || getTemplateExpressionContext(text, offset, templateContext)) {
          return undefined;
        }

        return htmlTags.map((tag) => createCompletionItem(tag.name, tag.pattern, tag.description));
      },
    },
    '<',
  );

  context.subscriptions.push(provider);
}
