// src/providers/htmlTagProvider.ts

import * as vscode from 'vscode';
import { isCursorInSpecificBlock } from '../utils/blockUtils';
import { htmlTags } from '../data/htmlTags'; // angenommen du hast htmlTags ausgelagert

function createCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

export function registerHtmlTagProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider('kpa', {
    provideCompletionItems(document, position) {
      // Nur in [template]
      if (!isCursorInSpecificBlock(document, position, ['template'])) {
        return undefined;
      }

      return htmlTags.map(tag => createCompletionItem(tag.name, tag.pattern, tag.description));
    },
  },
  '<'  // <-- Trigger-Character
);

  context.subscriptions.push(provider);
}
