export function isOffsetInsideOpeningHtmlTag(text: string, offset: number): boolean {
  let startTagOpenOffset = -1;
  let startTagCloseOffset = -1;

  for (let index = offset - 1; index >= 0; index--) {
    if (text[index] === '<' && text[index + 1] !== '/') {
      startTagOpenOffset = index;
      break;
    }
  }

  if (startTagOpenOffset === -1) {
    return false;
  }

  for (let index = startTagOpenOffset + 1; index < text.length; index++) {
    if (text[index] === '>') {
      startTagCloseOffset = index;
      break;
    }
  }

  return startTagCloseOffset !== -1 && offset <= startTagCloseOffset;
}
