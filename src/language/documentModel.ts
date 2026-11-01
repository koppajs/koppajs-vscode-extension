import type { KpaBlockNode, KpaDocument } from './ast';

export function getBlockAtOffset(
  document: KpaDocument,
  offset: number,
  blockNames?: readonly string[],
): KpaBlockNode | undefined {
  const matchingBlocks = document.blocks.filter((block) => {
    if (blockNames && !blockNames.includes(block.name)) {
      return false;
    }

    return isOffsetInsideBlockContext(document, block, offset);
  });

  return matchingBlocks
    .slice()
    .sort(
      (left, right) =>
        right.openTag.range.start.offset - left.openTag.range.start.offset ||
        getBlockContextEndOffset(right, document.text.length) -
          getBlockContextEndOffset(left, document.text.length),
    )[0];
}

export function isOffsetInsideBlockNames(
  document: KpaDocument,
  offset: number,
  blockNames: readonly string[],
): boolean {
  return getBlockAtOffset(document, offset, blockNames) !== undefined;
}

function isOffsetInsideBlockContext(
  document: KpaDocument,
  block: KpaBlockNode,
  offset: number,
): boolean {
  const contextStartOffset = block.openTag.range.end.offset;
  const contextEndOffset = getBlockContextEndOffset(block, document.text.length);

  return offset >= contextStartOffset && offset < contextEndOffset;
}

function getBlockContextEndOffset(block: KpaBlockNode, textLength: number): number {
  return block.closeTag?.range.end.offset ?? textLength;
}
