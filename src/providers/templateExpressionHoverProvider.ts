import * as vscode from 'vscode';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from '../language/symbols';
import {
  getImportedKpaComponentApi,
  resolveCanonicalTemplateComponentAtOffset,
} from '../language/templateComponents';
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

      const componentReference = resolveCanonicalTemplateComponentAtOffset(
        templateContext.document,
        document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
        offset,
      );

      if (componentReference) {
        return new vscode.Hover(
          createComponentHoverContents(
            componentReference.component,
            getImportedKpaComponentApi(componentReference.component),
          ),
          new vscode.Range(
            componentReference.tag.range.start.line,
            componentReference.tag.range.start.character,
            componentReference.tag.range.end.line,
            componentReference.tag.range.end.character,
          ),
        );
      }

      const templateExpressionContext = getTemplateExpressionContext(text, offset, templateContext);

      if (!templateExpressionContext) {
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

function createComponentHoverContents(
  component: {
    name: string;
    tagNames: readonly string[];
    importPath: string;
    resolvedFilePath?: string;
  },
  api?: {
    props: readonly { name: string; typeText?: string; optional: boolean }[];
    emits: readonly { name: string }[];
    slots: readonly { name: string }[];
  },
): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString();

  markdown.appendCodeblock(`component ${component.name}`, 'typescript');
  markdown.appendMarkdown(`Imported Koppa component from \`${component.importPath}\`.`);

  if (component.tagNames.length > 1) {
    markdown.appendMarkdown(
      `\n\nTemplate tag aliases: ${component.tagNames.map((tagName) => `\`${tagName}\``).join(', ')}.`,
    );
  }

  if (component.resolvedFilePath) {
    markdown.appendMarkdown(`\n\nResolved workspace file: \`${component.resolvedFilePath}\`.`);
  } else {
    markdown.appendMarkdown('\n\nWorkspace file could not be resolved.');
  }

  if (api) {
    if (api.props.length > 0) {
      markdown.appendMarkdown(
        `\n\nProps: ${api.props
          .map(
            (prop) =>
              `\`${prop.name}${prop.optional ? '?' : ''}\`${prop.typeText ? `: \`${prop.typeText}\`` : ''}`,
          )
          .join(', ')}.`,
      );
    }

    if (api.emits.length > 0) {
      markdown.appendMarkdown(
        `\n\nEmits: ${api.emits.map((entry) => `\`${entry.name}\``).join(', ')}.`,
      );
    }

    if (api.slots.length > 0) {
      markdown.appendMarkdown(
        `\n\nSlots: ${api.slots.map((entry) => `\`${entry.name}\``).join(', ')}.`,
      );
    }
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
