import * as vscode from 'vscode';
import { isLocalSymbolRequest } from './providerOwnership';
import {
  collectLocalReferenceRangesForSymbols,
  resolveLocalSymbolOccurrenceAtOffset,
} from '../language/localSymbolReferences';
import type { KpaLocatedRange } from '../language/ast';
import { parseKpaDocument } from '../language/parser';
import {
  collectCanonicalTemplateTagsForComponent,
  findImportedKpaComponentForSymbol,
  getImportedKpaComponentLocalSymbols,
  resolveCanonicalTemplateComponentAtOffset,
  type KpaImportedComponent,
} from '../language/templateComponents';
import {
  createTemplateSemanticVirtualFileName,
  getTemplateSemanticReferences,
} from '../language/templateSemantics';
import { collectWorkspaceResolvedComponentUsages } from './workspaceComponentSupport';

export function registerLocalReferencesProvider(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerReferenceProvider('kpa', {
    async provideReferences(document, position, referenceContext) {
      if (!isLocalSymbolRequest(document.getText(), document.offsetAt(position))) {
        return undefined;
      }

      const kpaDocument = parseKpaDocument(document.getText());
      const sourcePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const componentReference = resolveCanonicalTemplateComponentAtOffset(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (componentReference) {
        return provideComponentReferences(
          document,
          kpaDocument,
          sourcePath,
          componentReference.component,
          referenceContext.includeDeclaration,
        );
      }

      const currentVirtualFileName = createTemplateSemanticVirtualFileName(sourcePath);
      const semanticReferences = getTemplateSemanticReferences(
        kpaDocument,
        sourcePath,
        document.offsetAt(position),
      );

      if (semanticReferences && semanticReferences.length > 0) {
        return semanticReferences
          .filter((reference) => referenceContext.includeDeclaration || !reference.isDefinition)
          .map(
            (reference) =>
              new vscode.Location(
                reference.fileName === currentVirtualFileName
                  ? document.uri
                  : vscode.Uri.file(reference.fileName),
                toVsCodeRange(reference.range),
              ),
          );
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
          return provideComponentReferences(
            document,
            kpaDocument,
            sourcePath,
            component,
            referenceContext.includeDeclaration,
            componentSymbols,
          );
        }
      }

      const declarationOffsets = new Set(
        occurrence.symbols.map(
          (symbol) => `${symbol.range.start.offset}:${symbol.range.end.offset}`,
        ),
      );
      const references = collectLocalReferenceRangesForSymbols(kpaDocument, occurrence.symbols)
        .filter(
          (range) =>
            referenceContext.includeDeclaration ||
            !declarationOffsets.has(`${range.start.offset}:${range.end.offset}`),
        )
        .map((range) => new vscode.Location(document.uri, toVsCodeRange(range)));

      return references;
    },
  });

  context.subscriptions.push(provider);
}

async function provideComponentReferences(
  document: vscode.TextDocument,
  kpaDocument: ReturnType<typeof parseKpaDocument>,
  sourcePath: string | undefined,
  component: KpaImportedComponent,
  includeDeclaration: boolean,
  componentSymbols = getImportedKpaComponentLocalSymbols(kpaDocument, sourcePath, component),
): Promise<vscode.Location[]> {
  const locations: vscode.Location[] = [];
  const localDeclarationOffsets = new Set(
    componentSymbols.map((symbol) => `${symbol.range.start.offset}:${symbol.range.end.offset}`),
  );

  for (const range of deduplicateRanges([
    ...collectLocalReferenceRangesForSymbols(kpaDocument, componentSymbols),
    ...collectCanonicalTemplateTagsForComponent(kpaDocument, component).map((tag) => tag.range),
  ])) {
    if (
      !includeDeclaration &&
      localDeclarationOffsets.has(`${range.start.offset}:${range.end.offset}`)
    ) {
      continue;
    }

    locations.push(new vscode.Location(document.uri, toVsCodeRange(range)));
  }

  if (component.resolvedFilePath) {
    const workspaceUsages = await collectWorkspaceResolvedComponentUsages(
      component.resolvedFilePath,
    );

    for (const workspaceUsage of workspaceUsages) {
      for (const usage of workspaceUsage.usages) {
        const declarationOffsetKey = `${usage.component.importRange.start.offset}:${usage.component.importRange.end.offset}`;

        for (const range of usage.symbolRanges) {
          if (
            !includeDeclaration &&
            range.start.offset === usage.component.importRange.start.offset &&
            range.end.offset === usage.component.importRange.end.offset
          ) {
            continue;
          }

          locations.push(new vscode.Location(workspaceUsage.document.uri, toVsCodeRange(range)));
        }

        for (const tag of usage.tags) {
          if (
            !includeDeclaration &&
            `${tag.range.start.offset}:${tag.range.end.offset}` === declarationOffsetKey
          ) {
            continue;
          }

          locations.push(
            new vscode.Location(workspaceUsage.document.uri, toVsCodeRange(tag.range)),
          );
        }
      }
    }
  }

  return deduplicateLocations(locations);
}

function toVsCodeRange(range: KpaLocatedRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}

function deduplicateRanges(ranges: readonly KpaLocatedRange[]): readonly KpaLocatedRange[] {
  const seenRanges = new Set<string>();

  return ranges.filter((range) => {
    const key = `${range.start.offset}:${range.end.offset}`;

    if (seenRanges.has(key)) {
      return false;
    }

    seenRanges.add(key);
    return true;
  });
}

function deduplicateLocations(locations: readonly vscode.Location[]): vscode.Location[] {
  const seenLocations = new Set<string>();

  return locations.filter((location) => {
    const key = `${location.uri.toString()}:${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`;

    if (seenLocations.has(key)) {
      return false;
    }

    seenLocations.add(key);
    return true;
  });
}
