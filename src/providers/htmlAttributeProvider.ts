import * as vscode from 'vscode';
import { htmlAttributes } from '../data/htmlAttributes';
import {
  collectImportedKpaComponents,
  getImportedKpaComponentApi,
} from '../language/templateComponents';
import { getOpeningHtmlTagNameAtOffset, isOffsetInsideOpeningHtmlTag } from '../utils/htmlUtils';
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

function createComponentPropCompletionItem(prop: {
  name: string;
  typeText?: string;
  optional: boolean;
}) {
  const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
  item.insertText = new vscode.SnippetString(`${prop.name}={$1}`);
  item.detail = prop.typeText
    ? `Component prop${prop.optional ? ' (optional)' : ''}: ${prop.typeText}`
    : `Component prop${prop.optional ? ' (optional)' : ''}`;
  item.documentation = new vscode.MarkdownString(
    `Imported component prop \`${prop.name}\`${prop.typeText ? ` of type \`${prop.typeText}\`` : ''}.`,
  );
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

      const tagName = getOpeningHtmlTagNameAtOffset(text, offset);
      const completions: vscode.CompletionItem[] = [];
      const seenLabels = new Set<string>();

      if (tagName) {
        const component = collectImportedKpaComponents(
          templateContext.document,
          document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
        ).find((candidate) => candidate.tagNames.includes(tagName));
        const componentApi = component ? getImportedKpaComponentApi(component) : undefined;

        for (const prop of componentApi?.props ?? []) {
          if (seenLabels.has(prop.name)) {
            continue;
          }

          seenLabels.add(prop.name);
          completions.push(createComponentPropCompletionItem(prop));
        }
      }

      for (const attribute of htmlAttributes) {
        if (seenLabels.has(attribute.label)) {
          continue;
        }

        seenLabels.add(attribute.label);
        completions.push(
          createCompletionItem(attribute.label, attribute.snippet, attribute.documentation),
        );
      }

      return completions;
    },
  });

  context.subscriptions.push(provider);
}
