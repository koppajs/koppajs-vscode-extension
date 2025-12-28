// src/providers/blockProvider.ts

import * as vscode from 'vscode';
import { isCursorInSpecificBlock } from '../utils/blockUtils';

function createCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

export function registerBlockProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider(
    'kpa',
    {
      provideCompletionItems(document, position) {
        // Bist du in einem vorhandenen Block? -> dann keine Vorschläge
        if (
          isCursorInSpecificBlock(document, position, [
            'template', 'ts', 'js', 'css', 'scss', 'sass'
          ])
        ) {
          return undefined;
        }

        // Ansonsten folgende Snippets für neue Blöcke:
        const blocks = [
          { label: 'template', snippet: '[template]\n\t$0\n[/template]', documentation: 'Fügt einen Koppa Template-Block ein.' },
          { label: 'ts',       snippet: '[ts]\n\t$0\n[/ts]',             documentation: 'Fügt einen Koppa TS-Block ein.' },
          { label: 'js',       snippet: '[js]\n\t$0\n[/js]',             documentation: 'Fügt einen Koppa JS-Block ein.' },
          { label: 'css',      snippet: '[css]\n\t$0\n[/css]',           documentation: 'Fügt einen Koppa CSS-Block ein.' },
          { label: 'sass',     snippet: '[sass]\n\t$0\n[/sass]',         documentation: 'Fügt einen Koppa SASS-Block ein.' },
          { label: 'scss',     snippet: '[scss]\n\t$0\n[/scss]',         documentation: 'Fügt einen Koppa SCSS-Block ein.' }
        ];

        return blocks.map(({ label, snippet, documentation }) =>
          createCompletionItem(label, snippet, documentation)
        );
      },
    }
  );

  context.subscriptions.push(provider);
}
