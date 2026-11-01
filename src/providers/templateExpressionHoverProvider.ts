import * as vscode from 'vscode';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';
import { getTemplateSemanticHover } from '../language/templateSemantics';
import { getCanonicalTemplateIdentifierReferenceAtOffset } from '../language/templateExpressions';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
} from '../utils/templateContext';

export function registerTemplateExpressionHoverProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerHoverProvider('kpa', {
    provideHover(document, position) {
      const text = document.getText();
      const offset = document.offsetAt(position);
      const templateContext = getCanonicalTemplateContext(text, offset);

      if (!templateContext) {
        return undefined;
      }

      const templateExpressionContext = getTemplateExpressionContext(text, offset, templateContext);

      if (!templateExpressionContext || templateExpressionContext.isRuntimeExpression) {
        return undefined;
      }

      const identifierReference = getCanonicalTemplateIdentifierReferenceAtOffset(
        templateExpressionContext.document,
        offset,
      );

      const matchingSymbols = identifierReference
        ? collectLocalScriptSymbols(templateExpressionContext.document).templateVisible.filter(
            (symbol) => symbol.name === identifierReference.name,
          )
        : [];
      const semanticHover = getTemplateSemanticHover(
        templateExpressionContext.document,
        document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
        offset,
      );

      if (semanticHover) {
        const contents = [createSemanticHoverContents(semanticHover)];

        if (matchingSymbols.length > 0) {
          contents.push(...matchingSymbols.map((symbol) => createHoverContents(symbol)));
        }

        return new vscode.Hover(
          contents,
          new vscode.Range(
            semanticHover.range.start.line,
            semanticHover.range.start.character,
            semanticHover.range.end.line,
            semanticHover.range.end.character,
          ),
        );
      }

      if (!identifierReference || matchingSymbols.length === 0) {
        return undefined;
      }

      return new vscode.Hover(
        matchingSymbols.map((symbol) => createHoverContents(symbol)),
        new vscode.Range(
          identifierReference.range.start.line,
          identifierReference.range.start.character,
          identifierReference.range.end.line,
          identifierReference.range.end.character,
        ),
      );
    },
  });

  context.subscriptions.push(provider);
}

function createHoverContents(symbol: KpaScriptSymbol): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString();

  markdown.appendCodeblock(`${symbol.kind} ${symbol.name}`, 'typescript');
  markdown.appendMarkdown(
    `Template-visible local ${symbol.kind} from \`[${symbol.blockName}]\` block.`,
  );

  if (symbol.isExported) {
    markdown.appendMarkdown('\n\nExported from this file.');
  }

  markdown.isTrusted = false;

  return markdown;
}

function createSemanticHoverContents(hover: {
  displayText: string;
  documentation?: string;
}): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString();

  markdown.appendCodeblock(hover.displayText, 'typescript');

  if (hover.documentation) {
    markdown.appendMarkdown(`\n\n${hover.documentation}`);
  }

  markdown.isTrusted = false;

  return markdown;
}
