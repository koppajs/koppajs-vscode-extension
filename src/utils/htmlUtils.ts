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

    if (text[index] === '<' && index > startTagOpenOffset + 1) {
      break;
    }
  }

  if (startTagCloseOffset === -1) {
    return true;
  }

  return offset <= startTagCloseOffset;
}

export function getOpeningHtmlTagNameAtOffset(text: string, offset: number): string | undefined {
  if (!isOffsetInsideOpeningHtmlTag(text, offset)) {
    return undefined;
  }

  let startTagOpenOffset = -1;

  for (let index = offset - 1; index >= 0; index--) {
    if (text[index] === '<' && text[index + 1] !== '/') {
      startTagOpenOffset = index;
      break;
    }
  }

  if (startTagOpenOffset === -1) {
    return undefined;
  }

  let cursor = startTagOpenOffset + 1;

  while (text[cursor] === ' ' || text[cursor] === '\t' || text[cursor] === '\n') {
    cursor++;
  }

  const nameStart = cursor;

  if (!isTagNameStart(text[cursor])) {
    return undefined;
  }

  cursor++;

  while (isTagNameCharacter(text[cursor])) {
    cursor++;
  }

  return text.slice(nameStart, cursor);
}

function isTagNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z]/.test(character);
}

function isTagNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9:_-]/.test(character);
}
