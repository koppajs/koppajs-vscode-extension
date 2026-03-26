import { canonicalTemplateBlock } from '../data/kpaBlocks';
import type { KpaBlockNode, KpaDocument, KpaLocatedRange } from './ast';
import { createLocatedRange } from './sourcePositions';

const simpleTemplateRootReferencePattern =
  /^([A-Za-z_$][\w$]*)(?:(?:\??\.[A-Za-z_$][\w$]*)|\[[^[\]]*\]|\([^()]*\))*$/;

export interface KpaTemplateExpression {
  block: KpaBlockNode;
  range: KpaLocatedRange;
  contentRange: KpaLocatedRange;
  text: string;
  contentText: string;
}

export interface KpaTemplateRootReference {
  name: string;
  range: KpaLocatedRange;
  expression: KpaTemplateExpression;
}

export function collectCanonicalTemplateExpressions(
  document: KpaDocument,
): readonly KpaTemplateExpression[] {
  return document.blocks.flatMap((block) =>
    block.name === canonicalTemplateBlock ? collectExpressionsFromBlock(document, block) : [],
  );
}

export function getCanonicalTemplateExpressionAtOffset(
  document: KpaDocument,
  offset: number,
): KpaTemplateExpression | undefined {
  return collectCanonicalTemplateExpressions(document).find(
    (expression) => offset > expression.range.start.offset && offset < expression.range.end.offset,
  );
}

export function getTemplateExpressionRootReference(
  document: KpaDocument,
  expression: KpaTemplateExpression,
): KpaTemplateRootReference | undefined {
  const leadingWhitespaceLength = expression.contentText.match(/^\s*/)?.[0].length ?? 0;
  const trimmedContent = expression.contentText.trim();

  if (trimmedContent.length === 0) {
    return undefined;
  }

  const match = simpleTemplateRootReferencePattern.exec(trimmedContent);

  if (!match) {
    return undefined;
  }

  const name = match[1];
  const startOffset = expression.contentRange.start.offset + leadingWhitespaceLength;

  return {
    name,
    range: createLocatedRange(document.lineStarts, startOffset, startOffset + name.length),
    expression,
  };
}

function collectExpressionsFromBlock(
  document: KpaDocument,
  block: KpaBlockNode,
): readonly KpaTemplateExpression[] {
  const content = document.text.slice(
    block.contentRange.start.offset,
    block.contentRange.end.offset,
  );
  const expressions: KpaTemplateExpression[] = [];
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

        if (startOffset !== undefined && expressionStack.length === 0) {
          expressions.push(createTemplateExpression(document, block, startOffset, index + 1));
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

  const unclosedExpressionStartOffset = expressionStack[0];

  if (unclosedExpressionStartOffset !== undefined) {
    expressions.push(
      createTemplateExpression(document, block, unclosedExpressionStartOffset, content.length),
    );
  }

  return expressions;
}

function createTemplateExpression(
  document: KpaDocument,
  block: KpaBlockNode,
  startOffsetInBlock: number,
  endOffsetInBlock: number,
): KpaTemplateExpression {
  const blockStartOffset = block.contentRange.start.offset;
  const startOffset = blockStartOffset + startOffsetInBlock;
  const endOffset = blockStartOffset + endOffsetInBlock;
  const hasClosingBrace = document.text[endOffset - 1] === '}';
  const contentEndOffset = hasClosingBrace ? endOffset - 1 : endOffset;

  return {
    block,
    range: createLocatedRange(document.lineStarts, startOffset, endOffset),
    contentRange: createLocatedRange(document.lineStarts, startOffset + 1, contentEndOffset),
    text: document.text.slice(startOffset, endOffset),
    contentText: document.text.slice(startOffset + 1, contentEndOffset),
  };
}
