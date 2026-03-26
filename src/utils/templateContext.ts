import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument } from '../language/ast';
import { getBlockAtOffset } from '../language/documentModel';
import { parseKpaDocument } from '../language/parser';

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

  const content = templateContext.document.text.slice(
    templateContext.block.contentRange.start.offset,
    templateContext.block.contentRange.end.offset,
  );
  const offsetInBlock = offset - templateContext.block.contentRange.start.offset;
  const expressionRange = findExpressionRange(content, offsetInBlock);

  if (!expressionRange) {
    return undefined;
  }

  return {
    ...templateContext,
    expressionRange: {
      startOffset: templateContext.block.contentRange.start.offset + expressionRange.startOffset,
      endOffset: templateContext.block.contentRange.start.offset + expressionRange.endOffset,
    },
  };
}

export function isOffsetInsideTemplateExpression(text: string, offset: number): boolean {
  return getTemplateExpressionContext(text, offset) !== undefined;
}

function findExpressionRange(
  content: string,
  offset: number,
): { startOffset: number; endOffset: number } | undefined {
  const expressionStack: number[] = [];
  let insideTag = false;
  let tagQuote: '"' | "'" | undefined;
  let expressionQuote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];

    if (expressionStack.length > 0) {
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
        expressionStack.push(index);
        continue;
      }

      if (character === '}') {
        const startOffset = expressionStack.pop();

        if (
          startOffset !== undefined &&
          expressionStack.length === 0 &&
          offset > startOffset &&
          offset <= index
        ) {
          return {
            startOffset,
            endOffset: index + 1,
          };
        }
      }

      continue;
    }

    if (tagQuote) {
      if (character === tagQuote) {
        tagQuote = undefined;
      }

      continue;
    }

    if (insideTag) {
      if (character === "'" || character === '"') {
        tagQuote = character;
        continue;
      }

      if (character === '>') {
        insideTag = false;
        continue;
      }

      if (character === '{') {
        expressionStack.push(index);
      }

      continue;
    }

    if (character === '<') {
      insideTag = true;
      continue;
    }

    if (character === '{') {
      expressionStack.push(index);
    }
  }

  const startOffset = expressionStack[0];

  if (startOffset !== undefined && offset > startOffset) {
    return {
      startOffset,
      endOffset: content.length,
    };
  }

  return undefined;
}
