import * as vscode from 'vscode';
import type { KpaDocument, KpaLocatedRange } from '../language/ast';
import {
  collectLocalReferenceRangesForSymbols,
  resolveLocalSymbolOccurrenceAtOffset,
} from '../language/localSymbolReferences';
import { parseKpaDocument } from '../language/parser';
import {
  collectCanonicalTemplateTagsForComponent,
  findImportedKpaComponentForSymbol,
  getImportedKpaComponentLocalSymbols,
  normalizeComponentRenameTarget,
  resolveCanonicalTemplateComponentAtOffset,
  type KpaImportedComponent,
  type KpaTemplateTag,
} from '../language/templateComponents';
import {
  createTemplateSemanticVirtualFileName,
  getTemplateSemanticRenameInfo,
  getTemplateSemanticRenameRanges,
} from '../language/templateSemantics';
import { collectWorkspaceResolvedComponentUsages } from './workspaceComponentSupport';

export function registerLocalRenameProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerRenameProvider('kpa', {
    async provideRenameEdits(document, position, newName) {
      const kpaDocument = parseKpaDocument(document.getText());
      const sourcePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const componentReference = resolveCanonicalTemplateComponentAtOffset(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (componentReference) {
        return createComponentRenameEdit(
          document.uri,
          kpaDocument,
          sourcePath,
          componentReference.component,
          newName,
        );
      }

      const currentVirtualFileName = createTemplateSemanticVirtualFileName(sourcePath);
      const semanticRenameRanges = getTemplateSemanticRenameRanges(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (semanticRenameRanges && semanticRenameRanges.length > 0) {
        const edit = new vscode.WorkspaceEdit();

        for (const range of semanticRenameRanges) {
          edit.replace(
            range.fileName === currentVirtualFileName
              ? document.uri
              : vscode.Uri.file(range.fileName),
            toVsCodeRange(range.range),
            newName,
          );
        }

        return edit;
      }

      const occurrence = resolveLocalSymbolOccurrenceAtOffset(
        kpaDocument,
        document.offsetAt(position),
      );

      if (!occurrence || occurrence.symbols.length === 0) {
        return undefined;
      }

      const componentSymbols = occurrence.symbols.filter((symbol) =>
        Boolean(findImportedKpaComponentForSymbol(kpaDocument, sourcePath, symbol)),
      );

      if (componentSymbols.length > 0) {
        const component = findImportedKpaComponentForSymbol(
          kpaDocument,
          sourcePath,
          componentSymbols[0],
        );

        if (component) {
          return createComponentRenameEdit(
            document.uri,
            kpaDocument,
            sourcePath,
            component,
            newName,
            componentSymbols,
          );
        }
      }

      if (occurrence.symbols.length > 1) {
        throw new Error(
          `Template symbol [${occurrence.symbols[0].name}] ist mehrdeutig und kann nicht sicher umbenannt werden.`,
        );
      }

      const edit = new vscode.WorkspaceEdit();

      for (const range of collectLocalReferenceRangesForSymbols(kpaDocument, occurrence.symbols)) {
        edit.replace(document.uri, toVsCodeRange(range), newName);
      }

      return edit;
    },

    prepareRename(document, position) {
      const kpaDocument = parseKpaDocument(document.getText());
      const sourcePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const componentReference = resolveCanonicalTemplateComponentAtOffset(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (componentReference) {
        return {
          placeholder: componentReference.tag.name,
          range: toVsCodeRange(componentReference.tag.range),
        };
      }

      const semanticRenameInfo = getTemplateSemanticRenameInfo(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (semanticRenameInfo) {
        return {
          placeholder: semanticRenameInfo.placeholder,
          range: toVsCodeRange(semanticRenameInfo.range),
        };
      }

      const occurrence = resolveLocalSymbolOccurrenceAtOffset(
        kpaDocument,
        document.offsetAt(position),
      );

      if (!occurrence || occurrence.symbols.length === 0) {
        return undefined;
      }

      const componentSymbols = occurrence.symbols.filter((symbol) =>
        Boolean(findImportedKpaComponentForSymbol(kpaDocument, sourcePath, symbol)),
      );

      if (componentSymbols.length > 0) {
        return {
          placeholder: occurrence.symbols[0].name,
          range: toVsCodeRange(occurrence.range),
        };
      }

      if (occurrence.symbols.length > 1) {
        throw new Error(
          `Template symbol [${occurrence.symbols[0].name}] ist mehrdeutig und kann nicht sicher umbenannt werden.`,
        );
      }

      return {
        placeholder: occurrence.symbols[0].name,
        range: toVsCodeRange(occurrence.range),
      };
    },
  });

  context.subscriptions.push(provider);
}

function toVsCodeRange(range: KpaLocatedRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}

async function createComponentRenameEdit(
  documentUri: vscode.Uri,
  document: KpaDocument,
  sourcePath: string | undefined,
  component: KpaImportedComponent,
  newName: string,
  componentSymbols = getImportedKpaComponentLocalSymbols(document, sourcePath, component),
): Promise<vscode.WorkspaceEdit> {
  const normalizedTarget = normalizeComponentRenameTarget(newName);
  const edit = new vscode.WorkspaceEdit();

  applyComponentRenameEdits(
    edit,
    documentUri,
    collectLocalReferenceRangesForSymbols(document, componentSymbols),
    collectCanonicalTemplateTagsForComponent(document, component),
    normalizedTarget.symbolName,
    normalizedTarget.kebabTagName,
  );

  if (component.resolvedFilePath) {
    const workspaceUsages = await collectWorkspaceResolvedComponentUsages(
      component.resolvedFilePath,
    );

    for (const workspaceUsage of workspaceUsages) {
      if (workspaceUsage.document.uri.toString() === documentUri.toString()) {
        continue;
      }

      for (const usage of workspaceUsage.usages) {
        applyComponentRenameEdits(
          edit,
          workspaceUsage.document.uri,
          usage.symbolRanges,
          usage.tags,
          normalizedTarget.symbolName,
          normalizedTarget.kebabTagName,
        );
      }
    }
  }

  return edit;
}

function applyComponentRenameEdits(
  edit: vscode.WorkspaceEdit,
  documentUri: vscode.Uri,
  symbolRanges: readonly KpaLocatedRange[],
  tags: readonly KpaTemplateTag[],
  symbolName: string,
  kebabTagName: string,
): void {
  for (const range of symbolRanges) {
    edit.replace(documentUri, toVsCodeRange(range), symbolName);
  }

  for (const tag of tags) {
    edit.replace(
      documentUri,
      toVsCodeRange(tag.range),
      tag.name.includes('-') ? kebabTagName : symbolName,
    );
  }
}
