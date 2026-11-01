import path from 'path';
import ts from 'typescript';
import type { KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import { createLineStarts, createLocatedRange } from './sourcePositions';
import { collectLocalScriptSymbols } from './symbols';
import {
  getCanonicalTemplateExpressionAtOffset,
  type KpaTemplateExpression,
} from './templateExpressions';

type ScriptBlock = KpaBlockNode & { kind: 'script-ts' | 'script-js' };

interface VirtualSegment {
  kind: 'script' | 'expression';
  virtualStart: number;
  virtualEnd: number;
  sourceStart: number;
  sourceEnd: number;
}

interface TemplateSemanticContext {
  document: KpaDocument;
  expression: KpaTemplateExpression;
  virtualFileName: string;
  virtualSourceText: string;
  cursorVirtualOffset: number;
  segments: readonly VirtualSegment[];
  visibleNames: ReadonlySet<string>;
  lineStartsByFileName: ReadonlyMap<string, readonly number[]>;
}

export interface TemplateSemanticCompletion {
  name: string;
  kind: ts.ScriptElementKind;
  detail?: string;
  documentation?: string;
  replacementRange?: KpaLocatedRange;
}

export interface TemplateSemanticHover {
  range: KpaLocatedRange;
  displayText: string;
  documentation?: string;
}

export interface TemplateSemanticDefinition {
  fileName: string;
  range: KpaLocatedRange;
}

export interface TemplateSemanticReference {
  fileName: string;
  range: KpaLocatedRange;
  isDefinition: boolean;
}

export interface TemplateSemanticRenameRange {
  fileName: string;
  range: KpaLocatedRange;
}

export interface TemplateSemanticRenameInfo {
  range: KpaLocatedRange;
  placeholder: string;
}

export function createTemplateSemanticVirtualFileName(sourcePath: string | undefined): string {
  if (sourcePath && sourcePath.length > 0) {
    return `${sourcePath}.template.ts`;
  }

  return path.join(process.cwd(), '__kpa_virtual__', 'untitled.kpa.template.ts');
}

export function getTemplateSemanticCompletions(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): readonly TemplateSemanticCompletion[] | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const completions = languageService.getCompletionsAtPosition(
    context.virtualFileName,
    context.cursorVirtualOffset,
    {
      includeInsertTextCompletions: true,
      includeCompletionsWithInsertText: true,
    },
  );

  if (!completions) {
    return undefined;
  }

  const expressionOffset = offset - context.expression.contentRange.start.offset;
  const rootContext = !isMemberCompletionContext(
    context.expression.contentText.slice(0, expressionOffset),
  );
  const filteredEntries = rootContext
    ? completions.entries.filter((entry) => context.visibleNames.has(entry.name))
    : completions.entries;

  return filteredEntries.map((entry) => {
    const details = languageService.getCompletionEntryDetails(
      context.virtualFileName,
      context.cursorVirtualOffset,
      entry.name,
      {},
      entry.source,
      {},
      entry.data,
    );

    return {
      name: entry.name,
      kind: entry.kind,
      detail: details ? ts.displayPartsToString(details.displayParts) : undefined,
      documentation: details ? ts.displayPartsToString(details.documentation) : undefined,
      replacementRange: entry.replacementSpan
        ? mapVirtualTextSpanToKpaRange(context, entry.replacementSpan)
        : undefined,
    } satisfies TemplateSemanticCompletion;
  });
}

export function getTemplateSemanticHover(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): TemplateSemanticHover | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const quickInfo = languageService.getQuickInfoAtPosition(
    context.virtualFileName,
    context.cursorVirtualOffset,
  );

  if (!quickInfo) {
    return undefined;
  }

  const range = mapVirtualTextSpanToKpaRange(context, quickInfo.textSpan);

  if (!range) {
    return undefined;
  }

  return {
    range,
    displayText: ts.displayPartsToString(quickInfo.displayParts),
    documentation: ts.displayPartsToString(quickInfo.documentation),
  };
}

export function getTemplateSemanticDefinitions(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): readonly TemplateSemanticDefinition[] | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const definitions = languageService.getDefinitionAtPosition(
    context.virtualFileName,
    context.cursorVirtualOffset,
  );

  if (!definitions) {
    return undefined;
  }

  return definitions.flatMap((definition) => {
    const mappedRange = mapFileTextSpanToRange(context, definition.fileName, definition.textSpan);

    return mappedRange
      ? [
          {
            fileName: definition.fileName,
            range: mappedRange,
          } satisfies TemplateSemanticDefinition,
        ]
      : [];
  });
}

export function getTemplateSemanticReferences(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): readonly TemplateSemanticReference[] | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const references = languageService.getReferencesAtPosition(
    context.virtualFileName,
    context.cursorVirtualOffset,
  );
  const definitionLocationKeys = new Set(
    (
      languageService.getDefinitionAtPosition(
        context.virtualFileName,
        context.cursorVirtualOffset,
      ) ?? []
    ).map(
      (definition) =>
        `${definition.fileName}:${definition.textSpan.start}:${definition.textSpan.length}`,
    ),
  );

  if (!references) {
    return undefined;
  }

  return deduplicateSemanticFileRanges(
    references.flatMap((reference) => {
      const mappedRange = mapFileTextSpanToRange(context, reference.fileName, reference.textSpan);

      return mappedRange
        ? [
            {
              fileName: reference.fileName,
              range: mappedRange,
              isDefinition: definitionLocationKeys.has(
                `${reference.fileName}:${reference.textSpan.start}:${reference.textSpan.length}`,
              ),
            } satisfies TemplateSemanticReference,
          ]
        : [];
    }),
  );
}

export function getTemplateSemanticRenameInfo(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): TemplateSemanticRenameInfo | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const renameInfo = languageService.getRenameInfo(
    context.virtualFileName,
    context.cursorVirtualOffset,
    {
      allowRenameOfImportPath: false,
    },
  );

  if (!renameInfo.canRename) {
    return undefined;
  }

  const range = mapFileTextSpanToRange(context, context.virtualFileName, renameInfo.triggerSpan);

  if (!range) {
    return undefined;
  }

  return {
    range,
    placeholder: renameInfo.displayName,
  };
}

export function getTemplateSemanticRenameRanges(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): readonly TemplateSemanticRenameRange[] | undefined {
  const context = createTemplateSemanticContext(document, sourcePath, offset);

  if (!context) {
    return undefined;
  }

  const languageService = createTemplateLanguageService(context);
  const renameLocations = languageService.findRenameLocations(
    context.virtualFileName,
    context.cursorVirtualOffset,
    false,
    false,
    true,
  );

  if (!renameLocations) {
    return undefined;
  }

  return deduplicateSemanticFileRanges(
    renameLocations.flatMap((location) => {
      const mappedRange = mapFileTextSpanToRange(context, location.fileName, location.textSpan);

      return mappedRange
        ? [
            {
              fileName: location.fileName,
              range: mappedRange,
            } satisfies TemplateSemanticRenameRange,
          ]
        : [];
    }),
  );
}

function createTemplateSemanticContext(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): TemplateSemanticContext | undefined {
  const expression = getCanonicalTemplateExpressionAtOffset(document, offset);

  if (!expression) {
    return undefined;
  }

  const visibleNames = new Set(
    collectUniqueTemplateVisibleNames(
      collectLocalScriptSymbols(document).templateVisible.map((symbol) => symbol.name),
    ),
  );
  const virtualFileName = createTemplateSemanticVirtualFileName(sourcePath);
  const lineStartsByFileName = new Map<string, readonly number[]>();
  const parts: string[] = [];
  const segments: VirtualSegment[] = [];
  const scriptBlocks = document.blocks.filter(isScriptBlock);

  lineStartsByFileName.set(virtualFileName, []);

  for (const block of scriptBlocks) {
    const content = document.text.slice(
      block.contentRange.start.offset,
      block.contentRange.end.offset,
    );
    const virtualStart = getCombinedLength(parts);
    parts.push(content);
    const virtualEnd = getCombinedLength(parts);

    segments.push({
      kind: 'script',
      virtualStart,
      virtualEnd,
      sourceStart: block.contentRange.start.offset,
      sourceEnd: block.contentRange.end.offset,
    });

    parts.push('\n');
  }

  parts.push('function __kpa_template__() {\n');
  parts.push('  return (\n');

  const expressionVirtualStart = getCombinedLength(parts);
  parts.push(expression.contentText);
  const expressionVirtualEnd = getCombinedLength(parts);

  segments.push({
    kind: 'expression',
    virtualStart: expressionVirtualStart,
    virtualEnd: expressionVirtualEnd,
    sourceStart: expression.contentRange.start.offset,
    sourceEnd: expression.contentRange.end.offset,
  });

  parts.push('\n  );\n');
  parts.push('}\n');

  const virtualSourceText = parts.join('');
  const cursorVirtualOffset =
    expressionVirtualStart + (offset - expression.contentRange.start.offset);

  lineStartsByFileName.set(virtualFileName, createLineStarts(virtualSourceText));

  return {
    document,
    expression,
    virtualFileName,
    virtualSourceText,
    cursorVirtualOffset,
    segments,
    visibleNames,
    lineStartsByFileName,
  };
}

function createTemplateLanguageService(context: TemplateSemanticContext): ts.LanguageService {
  const compilerOptions = loadCompilerOptions(context.virtualFileName);
  const virtualFileName = context.virtualFileName;
  const virtualSourceText = context.virtualSourceText;
  const currentDirectory = path.dirname(virtualFileName);

  const languageServiceHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => currentDirectory,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [virtualFileName],
    getScriptVersion: () => '0',
    getScriptSnapshot: (fileName) => {
      if (fileName === virtualFileName) {
        return ts.ScriptSnapshot.fromString(virtualSourceText);
      }

      const sourceText = ts.sys.readFile(fileName);
      return sourceText !== undefined ? ts.ScriptSnapshot.fromString(sourceText) : undefined;
    },
    fileExists: (fileName) => fileName === virtualFileName || ts.sys.fileExists(fileName),
    readFile: (fileName) =>
      fileName === virtualFileName ? virtualSourceText : ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: (directoryName) =>
      directoryName === currentDirectory || ts.sys.directoryExists(directoryName),
    getDirectories: ts.sys.getDirectories,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getNewLine: () => ts.sys.newLine,
  };

  return ts.createLanguageService(languageServiceHost);
}

function loadCompilerOptions(virtualFileName: string): ts.CompilerOptions {
  const configFile = ts.findConfigFile(path.dirname(virtualFileName), ts.sys.fileExists);

  if (configFile) {
    const configFileResult = ts.readConfigFile(configFile, ts.sys.readFile);

    if (!configFileResult.error) {
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFileResult.config,
        ts.sys,
        path.dirname(configFile),
      );

      return {
        ...parsedConfig.options,
        allowJs: true,
        checkJs: true,
      };
    }
  }

  return {
    allowJs: true,
    checkJs: true,
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
}

function mapVirtualTextSpanToKpaRange(
  context: TemplateSemanticContext,
  textSpan: ts.TextSpan,
): KpaLocatedRange | undefined {
  const start = textSpan.start;
  const end = textSpan.start + textSpan.length;
  const segment = context.segments.find(
    (candidate) => start >= candidate.virtualStart && end <= candidate.virtualEnd,
  );

  if (!segment) {
    return undefined;
  }

  const sourceStart = segment.sourceStart + (start - segment.virtualStart);
  const sourceEnd = sourceStart + textSpan.length;

  return createLocatedRange(context.document.lineStarts, sourceStart, sourceEnd);
}

function mapFileTextSpanToRange(
  context: TemplateSemanticContext,
  fileName: string,
  textSpan: ts.TextSpan,
): KpaLocatedRange | undefined {
  if (fileName === context.virtualFileName) {
    return mapVirtualTextSpanToKpaRange(context, textSpan);
  }

  const sourceText = ts.sys.readFile(fileName);

  if (sourceText === undefined) {
    return undefined;
  }

  const fileLineStarts = getOrCreateFileLineStarts(
    context.lineStartsByFileName,
    fileName,
    sourceText,
  );

  return createLocatedRange(fileLineStarts, textSpan.start, textSpan.start + textSpan.length);
}

function getCombinedLength(parts: readonly string[]): number {
  return parts.reduce((length, part) => length + part.length, 0);
}

function isMemberCompletionContext(prefixText: string): boolean {
  const trimmedPrefixText = prefixText.replace(/\s+$/, '');
  return trimmedPrefixText.endsWith('.') || trimmedPrefixText.endsWith('?.');
}

function collectUniqueTemplateVisibleNames(names: readonly string[]): readonly string[] {
  const seenNames = new Set<string>();

  return names.filter((name) => {
    if (seenNames.has(name)) {
      return false;
    }

    seenNames.add(name);
    return true;
  });
}

function getOrCreateFileLineStarts(
  lineStartsByFileName: ReadonlyMap<string, readonly number[]>,
  fileName: string,
  sourceText: string,
): readonly number[] {
  const existingLineStarts = lineStartsByFileName.get(fileName);

  if (existingLineStarts) {
    return existingLineStarts;
  }

  return createLineStarts(sourceText);
}

function isScriptBlock(block: KpaBlockNode): block is ScriptBlock {
  return block.kind === 'script-ts' || block.kind === 'script-js';
}

function deduplicateSemanticFileRanges<T extends { fileName: string; range: KpaLocatedRange }>(
  ranges: readonly T[],
): readonly T[] {
  const seen = new Set<string>();

  return ranges.filter((range) => {
    const key = `${range.fileName}:${range.range.start.offset}:${range.range.end.offset}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
