import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument } from '../language/ast';
import { getBlockAtOffset } from '../language/documentModel';
import { parseKpaDocument } from '../language/parser';
import { getCanonicalTemplateExpressionAtOffset } from '../language/templateExpressions';

export interface CanonicalTemplateContext {
  document: KpaDocument;
  block: KpaBlockNode;
}

export interface TemplateExpressionContext extends CanonicalTemplateContext {
  expressionRange: {
    startOffset: number;
    endOffset: number;
  };
}

export function getCanonicalTemplateContext(
  text: string,
  offset: number,
): CanonicalTemplateContext | undefined {
  const document = parseKpaDocument(text);
  const block = getBlockAtOffset(document, offset, [canonicalTemplateBlock]);

  if (!block) {
    return undefined;
  }

  return {
    document,
    block,
  };
}

export function getTemplateExpressionContext(
  text: string,
  offset: number,
  templateContext = getCanonicalTemplateContext(text, offset),
): TemplateExpressionContext | undefined {
  if (!templateContext) {
    return undefined;
  }

  const expression = getCanonicalTemplateExpressionAtOffset(templateContext.document, offset);

  if (
    !expression ||
    expression.block.range.start.offset !== templateContext.block.range.start.offset
  ) {
    return undefined;
  }

  return {
    ...templateContext,
    expressionRange: {
      startOffset: expression.range.start.offset,
      endOffset: expression.range.end.offset,
    },
  };
}

export function isOffsetInsideTemplateExpression(text: string, offset: number): boolean {
  return getTemplateExpressionContext(text, offset) !== undefined;
}
