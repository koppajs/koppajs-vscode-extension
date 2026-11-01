import * as vscode from 'vscode';
import { htmlTags } from '../data/htmlTags';
import { collectImportedKpaComponents } from '../language/templateComponents';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
} from '../utils/templateContext';

function createHtmlCompletionItem(label: string, snippet: string, documentation: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(snippet);
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

function createComponentCompletionItem(label: string, importPath: string) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Module);
  item.insertText = new vscode.SnippetString(`<${label}>$0</${label}>`);
  item.detail = 'Imported Koppa component';
  item.documentation = new vscode.MarkdownString(
    `Imported Koppa component from \`${importPath}\`.`,
  );
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

        const completions: vscode.CompletionItem[] = [];
        const seenLabels = new Set<string>();
        const importedComponents = collectImportedKpaComponents(
          templateContext.document,
          document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
        );

        for (const component of importedComponents) {
          for (const tagName of component.tagNames) {
            if (seenLabels.has(tagName)) {
              continue;
            }

            seenLabels.add(tagName);
            completions.push(createComponentCompletionItem(tagName, component.importPath));
          }
        }

        for (const tag of htmlTags) {
          if (seenLabels.has(tag.name)) {
            continue;
          }

          seenLabels.add(tag.name);
          completions.push(createHtmlCompletionItem(tag.name, tag.pattern, tag.description));
        }

        return completions;
      },
    },
    '<',
  );

  context.subscriptions.push(provider);
}
