import * as vscode from 'vscode';
import { collectLocalScriptSymbols } from '../language/symbols';
import { resolveCanonicalTemplateComponentAtOffset } from '../language/templateComponents';
import {
  createTemplateSemanticVirtualFileName,
  getTemplateSemanticDefinitions,
} from '../language/templateSemantics';
import { getCanonicalTemplateIdentifierReferenceAtOffset } from '../language/templateExpressions';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
} from '../utils/templateContext';

export function registerTemplateDefinitionProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerDefinitionProvider('kpa', {
    provideDefinition(document, position) {
      const text = document.getText();
      const offset = document.offsetAt(position);
      const templateContext = getCanonicalTemplateContext(text, offset);

      if (!templateContext) {
        return undefined;
      }

      const sourcePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const componentReference = resolveCanonicalTemplateComponentAtOffset(
        templateContext.document,
        sourcePath,
        offset,
      );

      if (componentReference?.component.resolvedFilePath) {
        return new vscode.Location(
          vscode.Uri.file(componentReference.component.resolvedFilePath),
          new vscode.Position(0, 0),
        );
      }

      const templateExpressionContext = getTemplateExpressionContext(text, offset, templateContext);

      if (!templateExpressionContext) {
        return undefined;
      }

      const currentVirtualFileName = createTemplateSemanticVirtualFileName(sourcePath);
      const semanticDefinitions = getTemplateSemanticDefinitions(
        templateExpressionContext.document,
        sourcePath,
        offset,
      );

      if (semanticDefinitions && semanticDefinitions.length > 0) {
        return semanticDefinitions.map(
          (definition) =>
            new vscode.Location(
              definition.fileName === currentVirtualFileName
                ? document.uri
                : vscode.Uri.file(definition.fileName),
              toVsCodeRange(definition.range),
            ),
        );
      }

      const identifierReference = getCanonicalTemplateIdentifierReferenceAtOffset(
        templateExpressionContext.document,
        offset,
      );

      if (!identifierReference) {
        return undefined;
      }

      const matchingSymbols = collectLocalScriptSymbols(
        templateExpressionContext.document,
      ).templateVisible.filter((symbol) => symbol.name === identifierReference.name);

      if (matchingSymbols.length === 0) {
        return undefined;
      }

      return matchingSymbols.map(
        (symbol) => new vscode.Location(document.uri, toVsCodeRange(symbol.range)),
      );
    },
  });

  context.subscriptions.push(provider);
}

function toVsCodeRange(range: {
  start: { line: number; character: number };
  end: { line: number; character: number };
}): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
