import ts from 'typescript';
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

export interface KpaTemplateIdentifierReference {
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

export function collectCanonicalTemplateIdentifierReferences(
  document: KpaDocument,
): readonly KpaTemplateIdentifierReference[] {
  return collectCanonicalTemplateExpressions(document).flatMap((expression) =>
    collectTemplateIdentifierReferences(document, expression),
  );
}

export function getCanonicalTemplateIdentifierReferenceAtOffset(
  document: KpaDocument,
  offset: number,
): KpaTemplateIdentifierReference | undefined {
  return collectCanonicalTemplateIdentifierReferences(document).find(
    (reference) => offset >= reference.range.start.offset && offset <= reference.range.end.offset,
  );
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

function collectTemplateIdentifierReferences(
  document: KpaDocument,
  expression: KpaTemplateExpression,
): readonly KpaTemplateIdentifierReference[] {
  const wrappedExpressionText = `(${expression.contentText})`;
  const sourceFile = ts.createSourceFile(
    'embedded.kpa.template.ts',
    wrappedExpressionText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const [statement] = sourceFile.statements;

  if (!statement || !ts.isExpressionStatement(statement)) {
    return [];
  }

  const rootExpression = unwrapParenthesizedExpression(statement.expression);
  const references: KpaTemplateIdentifierReference[] = [];

  visit(rootExpression);

  return references;

  function visit(node: ts.Node): void {
    if (node !== rootExpression && isNestedTemplateScopeBoundary(node)) {
      return;
    }

    if (ts.isIdentifier(node) && isTemplateIdentifierReferenceNode(node)) {
      references.push({
        name: node.text,
        range: toExpressionDocumentRange(document, expression, node, sourceFile),
        expression,
      });
      return;
    }

    ts.forEachChild(node, visit);
  }
}

function unwrapParenthesizedExpression(expression: ts.Expression): ts.Expression {
  let currentExpression = expression;

  while (ts.isParenthesizedExpression(currentExpression)) {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

function isNestedTemplateScopeBoundary(node: ts.Node): boolean {
  return ts.isFunctionLike(node) || ts.isClassLike(node);
}

function isTemplateIdentifierReferenceNode(node: ts.Identifier): boolean {
  const parent = node.parent;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }

  if (ts.isBindingElement(parent) && (parent.name === node || parent.propertyName === node)) {
    return false;
  }

  if (ts.isParameter(parent) && parent.name === node) {
    return false;
  }

  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isFunctionExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isClassExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isClassDeclaration(parent) && parent.name === node) {
    return false;
  }

  if (ts.isLabeledStatement(parent) && parent.label === node) {
    return false;
  }

  if (
    ts.isTypeReferenceNode(parent) ||
    ts.isExpressionWithTypeArguments(parent) ||
    ts.isTypePredicateNode(parent) ||
    ts.isQualifiedName(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isEnumDeclaration(parent) ||
    ts.isEnumMember(parent)
  ) {
    return false;
  }

  return true;
}

function toExpressionDocumentRange(
  document: KpaDocument,
  expression: KpaTemplateExpression,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): KpaLocatedRange {
  const parsePrefixLength = 1;
  const startOffset =
    expression.contentRange.start.offset + node.getStart(sourceFile) - parsePrefixLength;
  const endOffset = expression.contentRange.start.offset + node.end - parsePrefixLength;

  return createLocatedRange(document.lineStarts, startOffset, endOffset);
}
