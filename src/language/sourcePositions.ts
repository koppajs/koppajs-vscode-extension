import type { KpaLocatedRange, KpaSourcePosition } from './ast';

export function createLineStarts(text: string): number[] {
  const lineStarts = [0];

  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

export function offsetToPosition(lineStarts: readonly number[], offset: number): KpaSourcePosition {
  const normalizedOffset = Math.max(0, offset);
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const currentLineStart = lineStarts[middle];
    const nextLineStart =
      middle + 1 < lineStarts.length ? lineStarts[middle + 1] : Number.POSITIVE_INFINITY;

    if (normalizedOffset < currentLineStart) {
      high = middle - 1;
      continue;
    }

    if (normalizedOffset >= nextLineStart) {
      low = middle + 1;
      continue;
    }

    return {
      offset: normalizedOffset,
      line: middle,
      character: normalizedOffset - currentLineStart,
    };
  }

  const lastLine = lineStarts.length - 1;

  return {
    offset: normalizedOffset,
    line: lastLine,
    character: normalizedOffset - lineStarts[lastLine],
  };
}

export function createLocatedRange(
  lineStarts: readonly number[],
  startOffset: number,
  endOffset: number,
): KpaLocatedRange {
  return {
    start: offsetToPosition(lineStarts, startOffset),
    end: offsetToPosition(lineStarts, endOffset),
  };
}
