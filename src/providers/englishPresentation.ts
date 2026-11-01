import type * as vscode from 'vscode';
import { htmlAttributes } from '../data/htmlAttributes';
import { htmlTags } from '../data/htmlTags';
import { toEnglishMessage } from '../language/englishMessages.cjs';

const documentationBySnippet = new Map([
  ...htmlTags.map((tag) => [tag.pattern, tag.description] as const),
  ...htmlAttributes.map((attribute) => [attribute.snippet, attribute.documentation] as const),
]);

export function toEnglishCompletionItem(item: vscode.CompletionItem): vscode.CompletionItem {
  // Shared HTML items have no semantic detail. Do not replace component or user documentation.
  if (!item.detail) {
    const snippet = typeof item.insertText === 'string' ? item.insertText : item.insertText?.value;
    const documentation = snippet === undefined ? undefined : documentationBySnippet.get(snippet);
    if (documentation !== undefined) {
      item.documentation = documentation;
    }
  }
  return item;
}

export function toEnglishDiagnostic(diagnostic: vscode.Diagnostic): vscode.Diagnostic {
  if (diagnostic.source === 'koppa-diagnostics') {
    diagnostic.message = toEnglishMessage(diagnostic.message);
  }
  return diagnostic;
}

export async function withEnglishErrors<T>(request: () => T | PromiseLike<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof Error) {
      error.message = toEnglishMessage(error.message);
    }
    throw error;
  }
}
