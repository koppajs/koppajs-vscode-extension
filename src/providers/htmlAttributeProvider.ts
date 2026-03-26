import * as vscode from 'vscode';
import { canonicalTemplateBlock } from '../data/kpaBlocks';
import { htmlAttributes } from '../data/htmlAttributes';
import { isOffsetInsideSpecificBlock } from '../utils/blockUtils';
import { isOffsetInsideOpeningHtmlTag } from '../utils/htmlUtils';

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

      if (
        !isOffsetInsideSpecificBlock(text, offset, [canonicalTemplateBlock]) ||
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
