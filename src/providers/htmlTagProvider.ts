import * as vscode from 'vscode';
import { canonicalTemplateBlock } from '../data/kpaBlocks';
import { htmlTags } from '../data/htmlTags';
import { isOffsetInsideSpecificBlock } from '../utils/blockUtils';

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
        if (
          !isOffsetInsideSpecificBlock(document.getText(), document.offsetAt(position), [
            canonicalTemplateBlock,
          ])
        ) {
          return undefined;
        }

        return htmlTags.map((tag) => createCompletionItem(tag.name, tag.pattern, tag.description));
      },
    },
    '<',
  );

  context.subscriptions.push(provider);
}
