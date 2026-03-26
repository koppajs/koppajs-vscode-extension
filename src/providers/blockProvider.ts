import * as vscode from 'vscode';
import { kpaBlockSnippets, structuralKpaBlocks } from '../data/kpaBlocks';
import { isOffsetInsideSpecificBlock } from '../utils/blockUtils';

function createCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

export function registerBlockProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider('kpa', {
    provideCompletionItems(document, position) {
      if (
        isOffsetInsideSpecificBlock(
          document.getText(),
          document.offsetAt(position),
          structuralKpaBlocks,
        )
      ) {
        return undefined;
      }

      return kpaBlockSnippets.map(({ label, snippet, documentation }) =>
        createCompletionItem(label, snippet, documentation),
      );
    },
  });

  context.subscriptions.push(provider);
}
