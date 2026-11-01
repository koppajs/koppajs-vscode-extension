import { isOffsetInsideBlockNames } from '../language/documentModel';
import { parseKpaDocument } from '../language/parser';

export function isOffsetInsideSpecificBlock(
  text: string,
  offset: number,
  koppaBlocks: readonly string[],
): boolean {
  return isOffsetInsideBlockNames(parseKpaDocument(text), offset, koppaBlocks);
}
