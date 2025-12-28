// src/providers/htmlAttributeProvider.ts

import * as vscode from 'vscode';
import { isCursorInSpecificBlock } from '../utils/blockUtils';
import { htmlAttributes } from '../data/htmlAttributes';

/**
 * Prüft, ob der Cursor noch zwischen `<tag` und `>` steht (ohne `</`).
 */
function isCursorInHtmlTag(document: vscode.TextDocument, position: vscode.Position): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  let startTagOpenOffset = -1;
  let startTagCloseOffset = -1;

  // Rückwärts suchen nach '<' (kein Slash danach)
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '<' && text[i + 1] !== '/') {
      startTagOpenOffset = i;
      break;
    }
  }
  if (startTagOpenOffset === -1) {
    return false;
  }

  // Vorwärts suchen nach '>'
  for (let i = startTagOpenOffset + 1; i < text.length; i++) {
    if (text[i] === '>') {
      startTagCloseOffset = i;
      break;
    }
  }
  if (startTagCloseOffset === -1) {
    return false;
  }

  // Ist der Cursor vor dem schließenden '>'?
  return offset <= startTagCloseOffset;
}

function createCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

export function registerHtmlAttributeProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider('kpa', {
    provideCompletionItems(document, position) {
      // Nur, wenn wir im [template]-Block SIND
      // UND der Cursor im Start-Tag steht
      if (
        !isCursorInSpecificBlock(document, position, ['template']) ||
        !isCursorInHtmlTag(document, position)
      ) {
        return undefined;
      }

      return htmlAttributes.map(attr => createCompletionItem(attr.label, attr.snippet, attr.documentation));
    },
  });

  context.subscriptions.push(provider);
}
