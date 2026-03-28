import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import {
  kpaDiagnosticCodes,
  type MissingComponentPropDiagnosticData,
  type UnresolvedComponentTagDiagnosticData,
} from './diagnosticCodes';
import type { KpaBlockDiagnostic } from './diagnosticsRules';
import { collectLocalReferenceRangesForSymbols } from './localSymbolReferences';
import { parseKpaDocument } from './parser';
import { resolveWorkspaceImportPath } from './projectConfig';
import { createLocatedRange } from './sourcePositions';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from './symbols';

type ScriptBlock = KpaBlockNode & { kind: 'script-ts' | 'script-js' };
type KpaTemplateAttributeKind = 'boolean' | 'expression' | 'spread' | 'string' | 'unquoted';
type InferredAttributeType = 'array' | 'boolean' | 'null' | 'number' | 'object' | 'string';

interface ParsedTemplateAttribute {
  kind: KpaTemplateAttributeKind;
  name: string;
  nameEnd: number;
  nameStart: number;
  valueEnd?: number;
  valueStart?: number;
  valueText?: string;
}

interface TemplateTagMatch {
  attributes: readonly ParsedTemplateAttribute[];
  insertionIndex: number;
  isClosing: boolean;
  isSelfClosing: boolean;
  name: string;
  nameEnd: number;
  nameStart: number;
  tagEnd: number;
}

export interface KpaImportedComponent {
  importPath: string;
  importRange: KpaLocatedRange;
  name: string;
  resolvedFilePath?: string;
  tagNames: readonly string[];
}

export interface KpaTemplateTag {
  block: KpaBlockNode;
  isClosing: boolean;
  name: string;
  range: KpaLocatedRange;
}

export interface ResolvedKpaTemplateComponent {
  component: KpaImportedComponent;
  tag: KpaTemplateTag;
}

export interface NormalizedComponentRenameTarget {
  kebabTagName: string;
  symbolName: string;
}

export interface KpaComponentApiEntry {
  name: string;
  optional: boolean;
  typeText?: string;
}

export interface KpaImportedComponentApi {
  emits: readonly KpaComponentApiEntry[];
  props: readonly KpaComponentApiEntry[];
  slots: readonly KpaComponentApiEntry[];
}

export interface KpaTemplateAttribute {
  kind: KpaTemplateAttributeKind;
  name: string;
  range: KpaLocatedRange;
  valueRange?: KpaLocatedRange;
  valueText?: string;
}

export interface KpaCanonicalTemplateComponentUsage {
  attributes: readonly KpaTemplateAttribute[];
  component: KpaImportedComponent;
  insertOffset: number;
  tag: KpaTemplateTag;
}

interface KpaTemplateSlotUsage {
  name: string;
  range: KpaLocatedRange;
}

interface KpaCanonicalTemplateComponentCallSite extends KpaCanonicalTemplateComponentUsage {
  eventAttributes: readonly KpaTemplateAttribute[];
  hasDefaultSlotContent: boolean;
  slotUsages: readonly KpaTemplateSlotUsage[];
}

export interface KpaWorkspaceTemplateComponentUsage {
  component: KpaImportedComponent;
  symbolRanges: readonly KpaLocatedRange[];
  tags: readonly KpaTemplateTag[];
}

const componentApiCache = new Map<
  string,
  {
    api: KpaImportedComponentApi;
    mtimeMs: number;
  }
>();

const allowedPassthroughComponentAttributes = new Set([
  'aria-label',
  'class',
  'id',
  'key',
  'ref',
  'slot',
  'style',
]);

export function collectImportedKpaComponents(
  document: KpaDocument,
  sourcePath: string | undefined,
): readonly KpaImportedComponent[] {
  return document.blocks.flatMap((block) =>
    isScriptBlock(block) ? collectComponentsFromScriptBlock(document, block, sourcePath) : [],
  );
}

export function collectCanonicalTemplateTags(document: KpaDocument): readonly KpaTemplateTag[] {
  return document.blocks.flatMap((block) =>
    block.name === canonicalTemplateBlock
      ? collectTemplateTagMatchesFromBlock(document, block).map((match) =>
          createTemplateTag(document, block, match),
        )
      : [],
  );
}

export function collectCanonicalTemplateComponentUsages(
  document: KpaDocument,
  sourcePath: string | undefined,
): readonly KpaCanonicalTemplateComponentUsage[] {
  const componentsByTagName = new Map<string, KpaImportedComponent>();

  for (const component of collectImportedKpaComponents(document, sourcePath)) {
    for (const tagName of component.tagNames) {
      componentsByTagName.set(tagName, component);
    }
  }

  return document.blocks.flatMap((block) => {
    if (block.name !== canonicalTemplateBlock) {
      return [];
    }

    return collectTemplateTagMatchesFromBlock(document, block).flatMap((match) => {
      if (match.isClosing) {
        return [];
      }

      const component = componentsByTagName.get(match.name);

      if (!component) {
        return [];
      }

      return [
        {
          attributes: match.attributes.map((attribute) =>
            createTemplateAttribute(document, block, attribute),
          ),
          component,
          insertOffset: block.contentRange.start.offset + match.insertionIndex,
          tag: createTemplateTag(document, block, match),
        } satisfies KpaCanonicalTemplateComponentUsage,
      ];
    });
  });
}

function collectCanonicalTemplateComponentCallSites(
  document: KpaDocument,
  sourcePath: string | undefined,
): readonly KpaCanonicalTemplateComponentCallSite[] {
  const componentsByTagName = new Map<string, KpaImportedComponent>();

  for (const component of collectImportedKpaComponents(document, sourcePath)) {
    for (const tagName of component.tagNames) {
      componentsByTagName.set(tagName, component);
    }
  }

  return document.blocks.flatMap((block) => {
    if (block.name !== canonicalTemplateBlock) {
      return [];
    }

    const matches = collectTemplateTagMatchesFromBlock(document, block);
    const callSites: KpaCanonicalTemplateComponentCallSite[] = [];
    const openTagStack: Array<{
      component: KpaImportedComponent;
      match: TemplateTagMatch;
    }> = [];

    for (const match of matches) {
      const component = componentsByTagName.get(match.name);

      if (!component) {
        continue;
      }

      if (match.isClosing) {
        const matchingOpenIndex = findMatchingOpenComponentIndex(
          openTagStack,
          component,
          match.name,
        );

        if (matchingOpenIndex === -1) {
          continue;
        }

        const openTag = openTagStack.splice(matchingOpenIndex, 1)[0];
        const openingUsage = createCanonicalTemplateComponentCallSite(
          document,
          block,
          openTag.match,
          component,
          match,
        );

        callSites.push(openingUsage);
        continue;
      }

      if (match.isSelfClosing) {
        callSites.push(createCanonicalTemplateComponentCallSite(document, block, match, component));
        continue;
      }

      openTagStack.push({
        component,
        match,
      });
    }

    for (const openTag of openTagStack) {
      callSites.push(
        createCanonicalTemplateComponentCallSite(document, block, openTag.match, openTag.component),
      );
    }

    return callSites;
  });
}

export function collectWorkspaceTemplateComponentUsagesForResolvedFile(
  document: KpaDocument,
  sourcePath: string | undefined,
  resolvedFilePath: string,
): readonly KpaWorkspaceTemplateComponentUsage[] {
  return collectImportedKpaComponents(document, sourcePath)
    .filter((component) => component.resolvedFilePath === resolvedFilePath)
    .map((component) => ({
      component,
      symbolRanges: deduplicateRanges(
        collectLocalReferenceRangesForSymbols(
          document,
          getImportedKpaComponentLocalSymbols(document, sourcePath, component),
        ),
      ),
      tags: collectCanonicalTemplateTagsForComponent(document, component),
    }));
}

export function getCanonicalTemplateTagAtOffset(
  document: KpaDocument,
  offset: number,
): KpaTemplateTag | undefined {
  return collectCanonicalTemplateTags(document).find(
    (tag) => offset >= tag.range.start.offset && offset <= tag.range.end.offset,
  );
}

export function resolveCanonicalTemplateComponentAtOffset(
  document: KpaDocument,
  sourcePath: string | undefined,
  offset: number,
): ResolvedKpaTemplateComponent | undefined {
  const tag = getCanonicalTemplateTagAtOffset(document, offset);

  if (!tag) {
    return undefined;
  }

  const component = collectImportedKpaComponents(document, sourcePath).find((candidate) =>
    candidate.tagNames.includes(tag.name),
  );

  if (!component) {
    return undefined;
  }

  return {
    component,
    tag,
  };
}

export function findImportedKpaComponentForSymbol(
  document: KpaDocument,
  sourcePath: string | undefined,
  symbol: KpaScriptSymbol,
): KpaImportedComponent | undefined {
  return collectImportedKpaComponents(document, sourcePath).find(
    (component) =>
      component.name === symbol.name &&
      component.importRange.start.offset === symbol.range.start.offset &&
      component.importRange.end.offset === symbol.range.end.offset,
  );
}

export function getImportedKpaComponentLocalSymbols(
  document: KpaDocument,
  sourcePath: string | undefined,
  component: KpaImportedComponent,
): readonly KpaScriptSymbol[] {
  return collectLocalScriptSymbols(document).all.filter(
    (symbol) =>
      symbol.kind === 'import' &&
      findImportedKpaComponentForSymbol(document, sourcePath, symbol)?.name === component.name,
  );
}

export function collectCanonicalTemplateTagsForComponent(
  document: KpaDocument,
  component: KpaImportedComponent,
): readonly KpaTemplateTag[] {
  return collectCanonicalTemplateTags(document).filter((tag) =>
    component.tagNames.includes(tag.name),
  );
}

export function normalizeComponentRenameTarget(
  requestedName: string,
): NormalizedComponentRenameTarget {
  const trimmedName = requestedName.trim();
  const symbolName = trimmedName.includes('-') ? toPascalCase(trimmedName) : trimmedName;

  if (!/^[A-Za-z_$][\w$]*$/.test(symbolName)) {
    throw new Error(
      `Komponentenname [${requestedName}] ist ungueltig. Erwartet wird ein gueltiger Bezeichner oder Kebab-Case.`,
    );
  }

  return {
    kebabTagName: toKebabCase(symbolName),
    symbolName,
  };
}

export function getImportedKpaComponentApi(
  component: KpaImportedComponent,
): KpaImportedComponentApi | undefined {
  if (!component.resolvedFilePath) {
    return undefined;
  }

  try {
    const fileStats = fs.statSync(component.resolvedFilePath);
    const cachedEntry = componentApiCache.get(component.resolvedFilePath);

    if (cachedEntry && cachedEntry.mtimeMs === fileStats.mtimeMs) {
      return cachedEntry.api;
    }

    const text = fs.readFileSync(component.resolvedFilePath, 'utf8');
    const document = parseKpaDocument(text);
    const api = extractComponentApiFromDocument(document);

    componentApiCache.set(component.resolvedFilePath, {
      api,
      mtimeMs: fileStats.mtimeMs,
    });

    return api;
  } catch {
    return undefined;
  }
}

export function collectCanonicalTemplateComponentDiagnostics(
  document: KpaDocument,
  sourcePath: string | undefined,
): readonly KpaBlockDiagnostic[] {
  const importedComponents = collectImportedKpaComponents(document, sourcePath);
  const knownComponentTags = new Set(importedComponents.flatMap((component) => component.tagNames));
  const diagnostics: KpaBlockDiagnostic[] = [];

  for (const component of importedComponents) {
    if (!component.importPath.endsWith('.kpa') || component.resolvedFilePath) {
      continue;
    }

    diagnostics.push({
      code: kpaDiagnosticCodes.unresolvedComponentImport,
      message: `Komponenten-Import [${component.name}] verweist auf [${component.importPath}], konnte aber nicht im Workspace aufgeloest werden.`,
      range: toDiagnosticRange(component.importRange),
    });
  }

  for (const tag of collectCanonicalTemplateTags(document)) {
    if (tag.isClosing || !looksLikeComponentTagName(tag.name) || knownComponentTags.has(tag.name)) {
      continue;
    }

    diagnostics.push({
      code: kpaDiagnosticCodes.unresolvedComponentTag,
      data: {
        componentName: tag.name.includes('-') ? toPascalCase(tag.name) : tag.name,
        tagName: tag.name,
      } satisfies UnresolvedComponentTagDiagnosticData,
      message: `Komponente [${tag.name}] wurde im [template]-Block verwendet, aber nicht als .kpa-Import gefunden.`,
      range: toDiagnosticRange(tag.range),
    });
  }

  for (const callSite of collectCanonicalTemplateComponentCallSites(document, sourcePath)) {
    const componentApi = getImportedKpaComponentApi(callSite.component);

    if (!componentApi) {
      continue;
    }

    const providedProps = new Set<string>();
    const propsByAlias = new Map<string, KpaComponentApiEntry>();

    for (const prop of componentApi.props) {
      for (const alias of createComponentPropAliases(prop.name)) {
        propsByAlias.set(alias, prop);
      }
    }

    const hasSpreadAttribute = callSite.attributes.some((attribute) => attribute.kind === 'spread');

    for (const attribute of callSite.attributes) {
      if (attribute.kind === 'spread') {
        continue;
      }

      const prop = propsByAlias.get(attribute.name);

      if (!prop) {
        if (shouldWarnUnknownComponentAttribute(attribute.name)) {
          diagnostics.push({
            code: kpaDiagnosticCodes.unknownComponentProp,
            message: `Attribut [${attribute.name}] ist kein bekanntes Prop von Komponente [${callSite.component.name}].`,
            range: toDiagnosticRange(attribute.range),
          });
        }

        continue;
      }

      providedProps.add(prop.name);
      const isExpressionAssignable =
        prop.typeText &&
        attribute.kind === 'expression' &&
        isExpressionAttributeAssignableToPropType(document, sourcePath, attribute, prop.typeText);
      const inferredValueType =
        isExpressionAssignable === undefined ? inferAttributeType(attribute) : undefined;

      if (
        prop.typeText &&
        ((isExpressionAssignable === false && attribute.kind === 'expression') ||
          (inferredValueType && !isCompatiblePropType(prop.typeText, inferredValueType)))
      ) {
        diagnostics.push({
          code: kpaDiagnosticCodes.invalidComponentPropType,
          message: `Prop [${prop.name}] an Komponente [${callSite.component.name}] erwartet [${prop.typeText}], erhalten wurde [${
            attribute.kind === 'expression'
              ? attribute.valueText?.trim() || 'Ausdruck'
              : (inferredValueType ?? 'unbekannt')
          }].`,
          range: toDiagnosticRange(attribute.range),
        });
      }
    }

    if (componentApi.emits.length > 0) {
      const knownEmitNames = new Set(componentApi.emits.map((entry) => entry.name));

      for (const attribute of callSite.eventAttributes) {
        const emitName = getEventNameFromAttribute(attribute.name);

        if (!emitName || knownEmitNames.has(emitName)) {
          continue;
        }

        diagnostics.push({
          code: kpaDiagnosticCodes.unknownComponentEmit,
          message: `Event-Handler [${attribute.name}] verweist auf unbekanntes Emit [${emitName}] von Komponente [${callSite.component.name}].`,
          range: toDiagnosticRange(attribute.range),
        });
      }
    }

    if (componentApi.slots.length > 0) {
      const providedSlots = new Set(callSite.slotUsages.map((slotUsage) => slotUsage.name));
      const knownSlotNames = new Set(componentApi.slots.map((entry) => entry.name));

      if (callSite.hasDefaultSlotContent) {
        providedSlots.add('default');
      }

      for (const slotUsage of callSite.slotUsages) {
        if (knownSlotNames.has(slotUsage.name)) {
          continue;
        }

        diagnostics.push({
          code: kpaDiagnosticCodes.unknownComponentSlot,
          message: `Slot [${slotUsage.name}] ist kein bekannter Slot von Komponente [${callSite.component.name}].`,
          range: toDiagnosticRange(slotUsage.range),
        });
      }

      for (const requiredSlot of componentApi.slots.filter((slot) => !slot.optional)) {
        if (providedSlots.has(requiredSlot.name)) {
          continue;
        }

        diagnostics.push({
          code: kpaDiagnosticCodes.missingComponentSlot,
          message: `Required Slot [${requiredSlot.name}] fehlt an Komponente [${callSite.component.name}].`,
          range: toDiagnosticRange(callSite.tag.range),
        });
      }
    }

    if (hasSpreadAttribute) {
      continue;
    }

    for (const requiredProp of componentApi.props.filter((prop) => !prop.optional)) {
      if (providedProps.has(requiredProp.name)) {
        continue;
      }

      diagnostics.push({
        code: kpaDiagnosticCodes.missingComponentProp,
        data: {
          componentName: callSite.component.name,
          insertOffset: callSite.insertOffset,
          propName: requiredProp.name,
          propTypeText: requiredProp.typeText,
        } satisfies MissingComponentPropDiagnosticData,
        message: `Required Prop [${requiredProp.name}] fehlt an Komponente [${callSite.component.name}].`,
        range: toDiagnosticRange(callSite.tag.range),
      });
    }
  }

  return diagnostics;
}

function collectComponentsFromScriptBlock(
  document: KpaDocument,
  block: ScriptBlock,
  sourcePath: string | undefined,
): readonly KpaImportedComponent[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const sourceFile = ts.createSourceFile(
    createEmbeddedFileName(block.kind),
    content,
    ts.ScriptTarget.Latest,
    true,
    block.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return [];
    }

    const importClause = statement.importClause;

    if (!importClause || importClause.isTypeOnly) {
      return [];
    }

    const importPath = statement.moduleSpecifier.text;
    const resolvedFilePath = resolveComponentImportPath(importPath, sourcePath);
    const isExplicitKpaImport = importPath.endsWith('.kpa');
    const isResolvedKpaImport = resolvedFilePath?.endsWith('.kpa') === true;

    if (!isExplicitKpaImport && !isResolvedKpaImport) {
      return [];
    }

    const importedBindings: ts.Identifier[] = [];

    if (importClause.name) {
      importedBindings.push(importClause.name);
    }

    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (!element.isTypeOnly) {
          importedBindings.push(element.name);
        }
      }
    }

    return importedBindings.map((binding) => ({
      importPath,
      importRange: createDocumentRange(document, block, binding.getStart(sourceFile), binding.end),
      name: binding.text,
      resolvedFilePath,
      tagNames: createComponentTagNames(binding.text),
    }));
  });
}

function collectTemplateTagMatchesFromBlock(
  document: KpaDocument,
  block: KpaBlockNode,
): readonly TemplateTagMatch[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const tags: TemplateTagMatch[] = [];
  let expressionDepth = 0;
  let expressionQuote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];

    if (expressionDepth > 0) {
      if (expressionQuote) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (character === '\\') {
          escaped = true;
          continue;
        }

        if (character === expressionQuote) {
          expressionQuote = undefined;
        }

        continue;
      }

      if (character === "'" || character === '"' || character === '`') {
        expressionQuote = character;
        continue;
      }

      if (character === '{') {
        expressionDepth++;
        continue;
      }

      if (character === '}') {
        expressionDepth--;
      }

      continue;
    }

    if (character === '{') {
      expressionDepth = 1;
      continue;
    }

    if (character !== '<') {
      continue;
    }

    const tagMatch = readTagAt(content, index);

    if (!tagMatch) {
      continue;
    }

    tags.push(tagMatch);
    index = Math.max(index, tagMatch.tagEnd - 1);
  }

  return tags;
}

function readTagAt(content: string, index: number): TemplateTagMatch | undefined {
  let cursor = index + 1;
  let isClosing = false;

  if (content[cursor] === '/') {
    isClosing = true;
    cursor++;
  }

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  const nameStart = cursor;

  if (!isTagNameStart(content[cursor])) {
    return undefined;
  }

  cursor++;

  while (isTagNameCharacter(content[cursor])) {
    cursor++;
  }

  const nameEnd = cursor;
  const attributes: ParsedTemplateAttribute[] = [];

  while (cursor < content.length) {
    while (isWhitespace(content[cursor])) {
      cursor++;
    }

    if (content[cursor] === '>') {
      return {
        attributes,
        insertionIndex: trimTagInsertionIndex(content, nameEnd, cursor),
        isClosing,
        isSelfClosing: false,
        name: content.slice(nameStart, nameEnd),
        nameEnd,
        nameStart,
        tagEnd: cursor + 1,
      };
    }

    if (content[cursor] === '/' && content[cursor + 1] === '>') {
      return {
        attributes,
        insertionIndex: trimTagInsertionIndex(content, nameEnd, cursor),
        isClosing,
        isSelfClosing: true,
        name: content.slice(nameStart, nameEnd),
        nameEnd,
        nameStart,
        tagEnd: cursor + 2,
      };
    }

    const parsedAttribute = readAttributeAt(content, cursor);

    if (!parsedAttribute) {
      cursor++;
      continue;
    }

    attributes.push(parsedAttribute.attribute);
    cursor = parsedAttribute.nextIndex;
  }

  return {
    attributes,
    insertionIndex: trimTagInsertionIndex(content, nameEnd, cursor),
    isClosing,
    isSelfClosing: false,
    name: content.slice(nameStart, nameEnd),
    nameEnd,
    nameStart,
    tagEnd: cursor,
  };
}

function readAttributeAt(
  content: string,
  index: number,
):
  | {
      attribute: ParsedTemplateAttribute;
      nextIndex: number;
    }
  | undefined {
  if (content[index] === '{') {
    const bracedValue = readBracedValue(content, index);

    if (!bracedValue) {
      return undefined;
    }

    const normalizedValueText = bracedValue.valueText.trim();

    if (!normalizedValueText.startsWith('...')) {
      return {
        attribute: {
          kind: 'expression',
          name: normalizedValueText,
          nameEnd: bracedValue.end,
          nameStart: index,
          valueEnd: bracedValue.end - 1,
          valueStart: index + 1,
          valueText: bracedValue.valueText,
        },
        nextIndex: bracedValue.end,
      };
    }

    return {
      attribute: {
        kind: 'spread',
        name: normalizedValueText,
        nameEnd: bracedValue.end,
        nameStart: index,
        valueEnd: bracedValue.end - 1,
        valueStart: index + 1,
        valueText: bracedValue.valueText,
      },
      nextIndex: bracedValue.end,
    };
  }

  if (!isAttributeNameStart(content[index])) {
    return undefined;
  }

  let cursor = index + 1;

  while (isAttributeNameCharacter(content[cursor])) {
    cursor++;
  }

  const nameStart = index;
  const nameEnd = cursor;
  const name = content.slice(nameStart, nameEnd);

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  if (content[cursor] !== '=') {
    return {
      attribute: {
        kind: 'boolean',
        name,
        nameEnd,
        nameStart,
      },
      nextIndex: cursor,
    };
  }

  cursor++;

  while (isWhitespace(content[cursor])) {
    cursor++;
  }

  if (content[cursor] === "'" || content[cursor] === '"') {
    const quote = content[cursor];
    const valueStart = cursor + 1;
    cursor++;

    while (cursor < content.length && content[cursor] !== quote) {
      cursor++;
    }

    const valueEnd = cursor;

    return {
      attribute: {
        kind: 'string',
        name,
        nameEnd,
        nameStart,
        valueEnd,
        valueStart,
        valueText: content.slice(valueStart, valueEnd),
      },
      nextIndex: cursor < content.length ? cursor + 1 : cursor,
    };
  }

  if (content[cursor] === '{') {
    const bracedValue = readBracedValue(content, cursor);

    if (!bracedValue) {
      return undefined;
    }

    return {
      attribute: {
        kind: 'expression',
        name,
        nameEnd,
        nameStart,
        valueEnd: bracedValue.end - 1,
        valueStart: cursor + 1,
        valueText: bracedValue.valueText,
      },
      nextIndex: bracedValue.end,
    };
  }

  const valueStart = cursor;

  while (
    cursor < content.length &&
    !isWhitespace(content[cursor]) &&
    content[cursor] !== '>' &&
    !(content[cursor] === '/' && content[cursor + 1] === '>')
  ) {
    cursor++;
  }

  return {
    attribute: {
      kind: 'unquoted',
      name,
      nameEnd,
      nameStart,
      valueEnd: cursor,
      valueStart,
      valueText: content.slice(valueStart, cursor),
    },
    nextIndex: cursor,
  };
}

function readBracedValue(
  content: string,
  startIndex: number,
):
  | {
      end: number;
      valueText: string;
    }
  | undefined {
  let cursor = startIndex + 1;
  let depth = 1;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  while (cursor < content.length) {
    const character = content[cursor];

    if (quote) {
      if (escaped) {
        escaped = false;
        cursor++;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        cursor++;
        continue;
      }

      if (character === quote) {
        quote = undefined;
      }

      cursor++;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      cursor++;
      continue;
    }

    if (character === '{') {
      depth++;
      cursor++;
      continue;
    }

    if (character === '}') {
      depth--;

      if (depth === 0) {
        return {
          end: cursor + 1,
          valueText: content.slice(startIndex + 1, cursor),
        };
      }
    }

    cursor++;
  }

  return undefined;
}

function trimTagInsertionIndex(
  content: string,
  minimumIndex: number,
  closingIndex: number,
): number {
  let insertionIndex = closingIndex;

  while (insertionIndex > minimumIndex && isWhitespace(content[insertionIndex - 1])) {
    insertionIndex--;
  }

  return insertionIndex;
}

function createTemplateTag(
  document: KpaDocument,
  block: KpaBlockNode,
  match: TemplateTagMatch,
): KpaTemplateTag {
  return {
    block,
    isClosing: match.isClosing,
    name: match.name,
    range: createLocatedRange(
      document.lineStarts,
      block.contentRange.start.offset + match.nameStart,
      block.contentRange.start.offset + match.nameEnd,
    ),
  };
}

function createTemplateAttribute(
  document: KpaDocument,
  block: KpaBlockNode,
  attribute: ParsedTemplateAttribute,
): KpaTemplateAttribute {
  return {
    kind: attribute.kind,
    name: attribute.name,
    range: createLocatedRange(
      document.lineStarts,
      block.contentRange.start.offset + attribute.nameStart,
      block.contentRange.start.offset + attribute.nameEnd,
    ),
    valueRange:
      attribute.valueStart !== undefined && attribute.valueEnd !== undefined
        ? createLocatedRange(
            document.lineStarts,
            block.contentRange.start.offset + attribute.valueStart,
            block.contentRange.start.offset + attribute.valueEnd,
          )
        : undefined,
    valueText: attribute.valueText,
  };
}

function createCanonicalTemplateComponentCallSite(
  document: KpaDocument,
  block: KpaBlockNode,
  openingMatch: TemplateTagMatch,
  component: KpaImportedComponent,
  closingMatch?: TemplateTagMatch,
): KpaCanonicalTemplateComponentCallSite {
  const openingTag = createTemplateTag(document, block, openingMatch);
  const bodyStartOffset = block.contentRange.start.offset + openingMatch.tagEnd;
  const bodyEndOffset = closingMatch
    ? block.contentRange.start.offset + closingMatch.nameStart - 1
    : bodyStartOffset;
  const slotUsages =
    closingMatch && bodyEndOffset >= bodyStartOffset
      ? collectSlotUsagesFromContent(document, block, bodyStartOffset, bodyEndOffset)
      : [];
  const eventAttributes = openingMatch.attributes
    .map((attribute) => createTemplateAttribute(document, block, attribute))
    .filter((attribute) => isEventBindingAttribute(attribute.name));

  return {
    attributes: openingMatch.attributes.map((attribute) =>
      createTemplateAttribute(document, block, attribute),
    ),
    component,
    eventAttributes,
    hasDefaultSlotContent:
      closingMatch !== undefined &&
      hasDefaultSlotBodyContent(document, bodyStartOffset, bodyEndOffset),
    insertOffset: block.contentRange.start.offset + openingMatch.insertionIndex,
    slotUsages,
    tag: openingTag,
  };
}

function findMatchingOpenComponentIndex(
  openTagStack: ReadonlyArray<{
    component: KpaImportedComponent;
    match: TemplateTagMatch;
  }>,
  component: KpaImportedComponent,
  closingTagName: string,
): number {
  for (let index = openTagStack.length - 1; index >= 0; index--) {
    const candidate = openTagStack[index];

    if (
      candidate.component.name === component.name &&
      candidate.component.tagNames.includes(closingTagName)
    ) {
      return index;
    }
  }

  return -1;
}

function collectSlotUsagesFromContent(
  document: KpaDocument,
  block: KpaBlockNode,
  bodyStartOffset: number,
  bodyEndOffset: number,
): readonly KpaTemplateSlotUsage[] {
  const relativeStart = bodyStartOffset - block.contentRange.start.offset;
  const content = document.text.slice(bodyStartOffset, bodyEndOffset);
  const slotUsages: KpaTemplateSlotUsage[] = [];
  const slotPattern = /\bslot\s*=\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))/g;
  let match: RegExpExecArray | null;

  while ((match = slotPattern.exec(content)) !== null) {
    const slotName = match[1] ?? match[2] ?? match[3];

    if (!slotName) {
      continue;
    }

    const slotNamePrefix = match[0].slice(0, match[0].indexOf(slotName));
    const slotNameStart = relativeStart + match.index + slotNamePrefix.length;
    const slotNameEnd = slotNameStart + slotName.length;

    slotUsages.push({
      name: slotName,
      range: createLocatedRange(
        document.lineStarts,
        block.contentRange.start.offset + slotNameStart,
        block.contentRange.start.offset + slotNameEnd,
      ),
    });
  }

  return slotUsages;
}

function hasDefaultSlotBodyContent(
  document: KpaDocument,
  bodyStartOffset: number,
  bodyEndOffset: number,
): boolean {
  if (bodyEndOffset <= bodyStartOffset) {
    return false;
  }

  const bodyContent = document.text.slice(bodyStartOffset, bodyEndOffset);

  if (!/\S/.test(bodyContent)) {
    return false;
  }

  const strippedNamedSlotContent = bodyContent.replace(
    /<([A-Za-z][A-Za-z0-9:_-]*)([^>]*)\bslot\s*=\s*(?:"[^"]+"|'[^']+'|[A-Za-z_$][\w$-]*)([^>]*)>[\s\S]*?<\/\1\s*>/g,
    '',
  );

  return /\S/.test(strippedNamedSlotContent);
}

function isEventBindingAttribute(attributeName: string): boolean {
  return (
    attributeName.startsWith('@') ||
    attributeName.startsWith('on:') ||
    /^on[A-Z]/.test(attributeName)
  );
}

function getEventNameFromAttribute(attributeName: string): string | undefined {
  if (attributeName.startsWith('@')) {
    return attributeName.slice(1);
  }

  if (attributeName.startsWith('on:')) {
    return attributeName.slice(3);
  }

  if (/^on[A-Z]/.test(attributeName)) {
    return attributeName[2].toLowerCase() + attributeName.slice(3);
  }

  return undefined;
}

function createComponentTagNames(name: string): readonly string[] {
  const tagNames = [name];
  const kebabAlias = toKebabCase(name);

  if (kebabAlias !== name && kebabAlias.includes('-')) {
    tagNames.push(kebabAlias);
  }

  return tagNames;
}

function createComponentPropAliases(name: string): readonly string[] {
  const aliases = [name];
  const kebabAlias = toKebabCase(name);

  if (kebabAlias !== name) {
    aliases.push(kebabAlias);
  }

  return aliases;
}

function extractComponentApiFromDocument(document: KpaDocument): KpaImportedComponentApi {
  const props = new Map<string, KpaComponentApiEntry>();
  const emits = new Map<string, KpaComponentApiEntry>();
  const slots = new Map<string, KpaComponentApiEntry>();

  for (const block of document.blocks) {
    if (!isScriptBlock(block)) {
      continue;
    }

    const content = document.text.slice(
      block.contentRange.start.offset,
      block.contentRange.end.offset,
    );
    const sourceFile = ts.createSourceFile(
      createEmbeddedFileName(block.kind),
      content,
      ts.ScriptTarget.Latest,
      true,
      block.kind === 'script-ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
    );

    for (const statement of sourceFile.statements) {
      if (ts.isInterfaceDeclaration(statement) && isPropsInterfaceName(statement.name.text)) {
        for (const entry of collectInterfaceEntries(statement, sourceFile)) {
          props.set(entry.name, entry);
        }

        continue;
      }

      if (ts.isInterfaceDeclaration(statement) && isSlotsInterfaceName(statement.name.text)) {
        for (const entry of collectInterfaceEntries(statement, sourceFile)) {
          slots.set(entry.name, entry);
        }

        continue;
      }

      if (ts.isTypeAliasDeclaration(statement) && isEmitsTypeName(statement.name.text)) {
        for (const entry of collectTypeLiteralEntries(statement.type, sourceFile)) {
          emits.set(entry.name, entry);
        }
      }
    }
  }

  return {
    emits: [...emits.values()],
    props: [...props.values()],
    slots: [...slots.values()],
  };
}

function collectInterfaceEntries(
  declaration: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
): readonly KpaComponentApiEntry[] {
  const entries: KpaComponentApiEntry[] = [];

  for (const member of declaration.members) {
    if (
      (ts.isPropertySignature(member) || ts.isMethodSignature(member)) &&
      getComponentMemberName(member.name)
    ) {
      const name = getComponentMemberName(member.name);

      if (!name) {
        continue;
      }

      entries.push({
        name,
        optional: Boolean(member.questionToken),
        typeText: member.type ? member.type.getText(sourceFile).trim() : undefined,
      });
    }
  }

  return entries;
}

function collectTypeLiteralEntries(
  node: ts.TypeNode,
  sourceFile: ts.SourceFile,
): readonly KpaComponentApiEntry[] {
  if (!ts.isTypeLiteralNode(node)) {
    return [];
  }

  const entries: KpaComponentApiEntry[] = [];

  for (const member of node.members) {
    if (
      (ts.isPropertySignature(member) || ts.isMethodSignature(member)) &&
      getComponentMemberName(member.name)
    ) {
      const name = getComponentMemberName(member.name);

      if (!name) {
        continue;
      }

      entries.push({
        name,
        optional: Boolean(member.questionToken),
        typeText: member.type ? member.type.getText(sourceFile).trim() : undefined,
      });
    }
  }

  return entries;
}

function getComponentMemberName(name: ts.PropertyName | undefined): string | undefined {
  if (!name) {
    return undefined;
  }

  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function isPropsInterfaceName(name: string): boolean {
  return name === 'Props' || name.endsWith('Props');
}

function isSlotsInterfaceName(name: string): boolean {
  return name === 'Slots' || name.endsWith('Slots');
}

function isEmitsTypeName(name: string): boolean {
  return name === 'Emits' || name.endsWith('Emits');
}

function isExpressionAttributeAssignableToPropType(
  document: KpaDocument,
  sourcePath: string | undefined,
  attribute: KpaTemplateAttribute,
  propTypeText: string,
): boolean | undefined {
  const valueText = attribute.valueText?.trim();

  if (!valueText) {
    return undefined;
  }

  const virtualFileName = createComponentTypecheckVirtualFileName(sourcePath);
  const compilerOptions = loadTypecheckCompilerOptions(virtualFileName);
  const virtualSourceText = createComponentTypecheckSource(document, valueText, propTypeText);
  const languageServiceHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => path.dirname(virtualFileName),
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
      directoryName === path.dirname(virtualFileName) || ts.sys.directoryExists(directoryName),
    getDirectories: ts.sys.getDirectories,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getNewLine: () => ts.sys.newLine,
  };
  const languageService = ts.createLanguageService(languageServiceHost);
  const diagnostics = languageService.getSemanticDiagnostics(virtualFileName);

  if (
    diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 2304 || diagnostic.code === 2552 || diagnostic.code === 2693,
    )
  ) {
    return undefined;
  }

  return diagnostics.length === 0;
}

function createComponentTypecheckVirtualFileName(sourcePath: string | undefined): string {
  if (sourcePath) {
    return `${sourcePath}.component-check.ts`;
  }

  return path.join(process.cwd(), '__kpa_virtual__', 'untitled.kpa.component-check.ts');
}

function createComponentTypecheckSource(
  document: KpaDocument,
  valueText: string,
  propTypeText: string,
): string {
  const parts: string[] = [];

  for (const block of document.blocks.filter(isScriptBlock)) {
    parts.push(
      document.text.slice(block.contentRange.start.offset, block.contentRange.end.offset),
      '\n',
    );
  }

  parts.push(`type __KpaTarget = ${propTypeText};\n`);
  parts.push(`const __kpa_value__ = (${valueText});\n`);
  parts.push('const __kpa_assign__: __KpaTarget = __kpa_value__;\n');

  return parts.join('');
}

function loadTypecheckCompilerOptions(virtualFileName: string): ts.CompilerOptions {
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

function inferAttributeType(attribute: KpaTemplateAttribute): InferredAttributeType | undefined {
  switch (attribute.kind) {
    case 'boolean':
      return 'boolean';
    case 'string':
    case 'unquoted':
      return 'string';
    case 'expression': {
      const valueText = attribute.valueText?.trim();

      if (!valueText) {
        return undefined;
      }

      if (/^(true|false)$/.test(valueText)) {
        return 'boolean';
      }

      if (/^-?\d+(?:\.\d+)?$/.test(valueText)) {
        return 'number';
      }

      if (/^(["'`]).*\1$/s.test(valueText)) {
        return 'string';
      }

      if (valueText === 'null') {
        return 'null';
      }

      if (/^\[.*\]$/s.test(valueText)) {
        return 'array';
      }

      if (/^\{.*\}$/s.test(valueText)) {
        return 'object';
      }

      return undefined;
    }
    case 'spread':
      return undefined;
  }
}

function isCompatiblePropType(typeText: string, inferredType: InferredAttributeType): boolean {
  const normalizedTypeText = typeText.replace(/\s+/g, '');

  if (
    normalizedTypeText.includes('any') ||
    normalizedTypeText.includes('unknown') ||
    normalizedTypeText.includes('never')
  ) {
    return true;
  }

  switch (inferredType) {
    case 'string':
      return (
        normalizedTypeText.includes('string') ||
        /'[^']*'|"[^"]*"/.test(typeText) ||
        normalizedTypeText.includes('String')
      );
    case 'number':
      return normalizedTypeText.includes('number');
    case 'boolean':
      return (
        normalizedTypeText.includes('boolean') ||
        normalizedTypeText.includes('true') ||
        normalizedTypeText.includes('false')
      );
    case 'null':
      return normalizedTypeText.includes('null');
    case 'array':
      return normalizedTypeText.includes('[]') || normalizedTypeText.includes('Array<');
    case 'object':
      return (
        normalizedTypeText.includes('{') ||
        normalizedTypeText.includes('object') ||
        normalizedTypeText.includes('Record<')
      );
  }
}

function shouldWarnUnknownComponentAttribute(name: string): boolean {
  if (allowedPassthroughComponentAttributes.has(name)) {
    return false;
  }

  return !(
    name.startsWith('aria-') ||
    name.startsWith('bind:') ||
    name.startsWith('class:') ||
    name.startsWith('data-') ||
    name.startsWith('on:') ||
    name.startsWith('style:') ||
    name.startsWith('use:')
  );
}

export function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function resolveComponentImportPath(
  importPath: string,
  sourcePath: string | undefined,
): string | undefined {
  return resolveWorkspaceImportPath(importPath, sourcePath, ['.kpa']);
}

function createDocumentRange(
  document: KpaDocument,
  block: KpaBlockNode,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaLocatedRange {
  const startOffset = block.contentRange.start.offset + startOffsetInBlock;
  const endOffset = block.contentRange.start.offset + endOffsetInBlock;

  return createLocatedRange(document.lineStarts, startOffset, endOffset);
}

function isScriptBlock(block: KpaBlockNode): block is ScriptBlock {
  return block.kind === 'script-ts' || block.kind === 'script-js';
}

function createEmbeddedFileName(kind: ScriptBlock['kind']): string {
  return kind === 'script-ts' ? 'embedded.kpa.ts' : 'embedded.kpa.js';
}

function looksLikeComponentTagName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function isTagNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z]/.test(character);
}

function isTagNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9:_-]/.test(character);
}

function isAttributeNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_:@]/.test(character);
}

function isAttributeNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_:@.-]/.test(character);
}

function isWhitespace(character: string | undefined): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

function toDiagnosticRange(range: KpaLocatedRange): KpaBlockDiagnostic['range'] {
  return {
    endChar: range.end.character,
    line: range.start.line,
    startChar: range.start.character,
  };
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
