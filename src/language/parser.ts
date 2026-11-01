import type { KpaBlockKind, KpaBlockNode, KpaDocument, KpaTagToken } from './ast';
import { createLineStarts, createLocatedRange } from './sourcePositions';

const blockTagPattern = /\[(\/?)([a-zA-Z0-9]+)\]/g;

export function parseKpaDocument(text: string): KpaDocument {
  const lineStarts = createLineStarts(text);
  const tags: KpaTagToken[] = [];
  const blocks: KpaBlockNode[] = [];
  const openTags: KpaTagToken[] = [];

  let match: RegExpExecArray | null;

  while ((match = blockTagPattern.exec(text)) !== null) {
    const rawText = match[0];
    const isClosing = match[1] === '/';
    const name = match[2];
    const startOffset = match.index;
    const endOffset = startOffset + rawText.length;
    const tag = {
      name,
      isClosing,
      rawText,
      range: createLocatedRange(lineStarts, startOffset, endOffset),
    } satisfies KpaTagToken;

    tags.push(tag);

    if (!isClosing) {
      openTags.push(tag);
      continue;
    }

    const lastOpenTag = openTags[openTags.length - 1];

    if (!lastOpenTag || lastOpenTag.name !== name) {
      continue;
    }

    openTags.pop();
    blocks.push(createBlockNode(lineStarts, text.length, lastOpenTag, tag));
  }

  while (openTags.length > 0) {
    const unclosedTag = openTags.pop();

    if (!unclosedTag) {
      continue;
    }

    blocks.push(createBlockNode(lineStarts, text.length, unclosedTag));
  }

  blocks.sort((left, right) => {
    const startOffsetDifference =
      left.openTag.range.start.offset - right.openTag.range.start.offset;

    if (startOffsetDifference !== 0) {
      return startOffsetDifference;
    }

    return left.range.end.offset - right.range.end.offset;
  });

  return {
    text,
    lineStarts,
    tags,
    blocks,
  };
}

function createBlockNode(
  lineStarts: readonly number[],
  textLength: number,
  openTag: KpaTagToken,
  closeTag?: KpaTagToken,
): KpaBlockNode {
  const rangeStartOffset = openTag.range.start.offset;
  const rangeEndOffset = closeTag?.range.end.offset ?? textLength;
  const contentStartOffset = openTag.range.end.offset;
  const contentEndOffset = closeTag?.range.start.offset ?? textLength;

  return {
    name: openTag.name,
    kind: classifyBlockKind(openTag.name),
    openTag,
    closeTag,
    range: createLocatedRange(lineStarts, rangeStartOffset, rangeEndOffset),
    contentRange: createLocatedRange(lineStarts, contentStartOffset, contentEndOffset),
    isClosed: closeTag !== undefined,
  };
}

function classifyBlockKind(name: string): KpaBlockKind {
  switch (name) {
    case 'template':
      return 'template';
    case 'ts':
      return 'script-ts';
    case 'js':
      return 'script-js';
    case 'css':
      return 'style-css';
    case 'scss':
      return 'style-scss';
    case 'sass':
      return 'style-sass';
    case 'html':
      return 'alias-html';
    case 'tpl':
      return 'alias-tpl';
    default:
      return 'unknown';
  }
}
