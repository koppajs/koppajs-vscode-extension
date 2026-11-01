import { parseKpaDocument } from './parser';
import { kpaDiagnosticCodes } from './diagnosticCodes';
import { toEnglishMessage } from './englishMessages.cjs';

export interface ComponentQuickFixDiagnostic {
  code?: string | number;
  source?: string;
  message: string;
  range: { line: number; startChar: number; endChar: number };
}

export interface ComponentQuickFix {
  title: string;
  startOffset: number;
  endOffset: number;
  newText: string;
}

interface Attribute {
  name: string;
  start: number;
  end: number;
}
interface Tag {
  name: string;
  nameStart: number;
  end: number;
  selfClosing: boolean;
  attributes: Attribute[];
  closeStart?: number;
}

/** Current diagnostics must be recomputed from the current text and component contracts. */
export function createComponentQuickFix(
  text: string,
  diagnostic: ComponentQuickFixDiagnostic,
  currentDiagnostics: readonly ComponentQuickFixDiagnostic[],
): ComponentQuickFix | undefined {
  if (
    diagnostic.source !== 'koppa-diagnostics' ||
    ![kpaDiagnosticCodes.missingComponentSlot, kpaDiagnosticCodes.unknownComponentEmit].some(
      (code) => code === diagnostic.code,
    ) ||
    !currentDiagnostics.some(
      (current) =>
        current.code === diagnostic.code &&
        toEnglishMessage(current.message) === toEnglishMessage(diagnostic.message) &&
        current.range.line === diagnostic.range.line &&
        current.range.startChar === diagnostic.range.startChar &&
        current.range.endChar === diagnostic.range.endChar,
    )
  ) {
    return undefined;
  }

  const document = parseKpaDocument(text);
  const { line, startChar, endChar } = diagnostic.range;
  if (
    ![line, startChar, endChar].every(Number.isInteger) ||
    line < 0 ||
    startChar < 0 ||
    endChar <= startChar ||
    line >= document.lineStarts.length
  ) {
    return undefined;
  }
  const start = document.lineStarts[line] + startChar;
  const end = document.lineStarts[line] + endChar;
  const lineEnd = text.indexOf('\n', document.lineStarts[line]);
  if (end > (lineEnd < 0 ? text.length : lineEnd)) {
    return undefined;
  }
  const blocks = document.blocks.filter(
    (block) =>
      block.kind === 'template' &&
      block.isClosed &&
      start >= block.contentRange.start.offset &&
      end <= block.contentRange.end.offset,
  );
  if (blocks.length !== 1) {
    return undefined;
  }
  const tags = readTags(
    text,
    blocks[0].contentRange.start.offset,
    blocks[0].contentRange.end.offset,
  );
  if (!tags) {
    return undefined;
  }

  if (diagnostic.code === kpaDiagnosticCodes.missingComponentSlot) {
    const match =
      /^Required slot \[([A-Za-z_$][\w$-]*)\] is missing on component \[([A-Za-z_$][\w$]*)\]\.$/.exec(
        toEnglishMessage(diagnostic.message),
      );
    const parents = tags.filter(
      (tag) => tag.nameStart === start && tag.nameStart + tag.name.length === end,
    );
    if (!match || parents.length !== 1) {
      return undefined;
    }
    const tag = parents[0];
    if (!tag.selfClosing && tag.closeStart === undefined) {
      return undefined;
    }
    const stub = match[1] === 'default' ? '<div></div>' : `<div slot="${match[1]}"></div>`;
    return {
      title: `Add slot [${match[1]}] for [${match[2]}]`,
      startOffset: tag.selfClosing ? tag.end - 2 : tag.end,
      endOffset: tag.end,
      newText: tag.selfClosing ? `>${stub}</${tag.name}>` : stub,
    };
  }

  const match =
    /^Event handler \[([^\]]+)\] references unknown emit \[[^\]]+\] of component \[([A-Za-z_$][\w$]*)\]\.$/.exec(
      toEnglishMessage(diagnostic.message),
    );
  if (!match || text.slice(start, end) !== match[1]) {
    return undefined;
  }
  const parents = tags.filter((tag) =>
    tag.attributes.some((attribute) => attribute.start === start && attribute.name === match[1]),
  );
  if (parents.length !== 1) {
    return undefined;
  }
  const parent = parents[0];
  if (
    parent.attributes.filter((attribute) => attribute.name.toLowerCase() === match[1].toLowerCase())
      .length !== 1
  ) {
    return undefined;
  }
  const attribute = parent.attributes.find((attribute) => attribute.start === start)!;
  return {
    title: `Remove event handler [${attribute.name}] from [${match[2]}]`,
    startOffset: attribute.start,
    endOffset: attribute.end,
    newText: '',
  };
}

const voidTags = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' '),
);

/** Conservative lexer: reject malformed nesting and unsupported raw-text markup. */
function readTags(text: string, start: number, end: number): Tag[] | undefined {
  const tags: Tag[] = [];
  const stack: Tag[] = [];
  let cursor = start;
  const whitespace = () => {
    while (cursor < end && /\s/.test(text[cursor])) {
      cursor++;
    }
  };
  while (cursor < end) {
    if (text.startsWith('<!--', cursor)) {
      const close = text.indexOf('-->', cursor + 4);
      if (close < 0 || close >= end) {
        return undefined;
      }
      cursor = close + 3;
      continue;
    }
    if (text[cursor] === '{') {
      const next = readBraces(text, cursor, end);
      if (next === undefined) {
        return undefined;
      }
      cursor = next;
      continue;
    }
    if (text[cursor] !== '<') {
      cursor++;
      continue;
    }
    const tagStart = cursor++;
    const closing = text[cursor] === '/';
    if (closing) {
      cursor++;
    }
    const nameStart = cursor;
    const name = /^[A-Za-z][\w:.-]*/.exec(text.slice(cursor, end))?.[0];
    if (!name || /^(script|style|textarea|title)$/i.test(name)) {
      return undefined;
    }
    cursor += name.length;
    if (cursor < end && !/[\s/>]/.test(text[cursor])) {
      return undefined;
    }
    const tag: Tag = {
      name,
      nameStart,
      end: 0,
      selfClosing: false,
      attributes: [],
    };
    whitespace();
    while (!closing && cursor < end && text[cursor] !== '>' && !text.startsWith('/>', cursor)) {
      const attributeStart = cursor;
      const attributeName = /^[@:A-Za-z_$][\w$:.-]*/.exec(text.slice(cursor, end))?.[0];
      if (!attributeName) {
        return undefined;
      }
      cursor += attributeName.length;
      const nameEnd = cursor;
      if (!/[\s=/>]/.test(text[cursor] ?? '')) {
        return undefined;
      }
      whitespace();
      if (text[cursor] === '=') {
        cursor++;
        whitespace();
        if (text[cursor] === '"' || text[cursor] === "'") {
          const quote = text[cursor++];
          while (cursor < end && text[cursor] !== quote) {
            cursor++;
          }
          if (cursor >= end) {
            return undefined;
          }
          cursor++;
        } else if (text[cursor] === '{') {
          const next = readBraces(text, cursor, end);
          if (next === undefined) {
            return undefined;
          }
          cursor = next;
        } else {
          const value = /^[^\s<>"'`={}]+/.exec(text.slice(cursor, end))?.[0];
          if (!value) {
            return undefined;
          }
          cursor +=
            value.endsWith('/') && text[cursor + value.length] === '>'
              ? value.length - 1
              : value.length;
        }
        tag.attributes.push({ name: attributeName, start: attributeStart, end: cursor });
        if (!/[\s/>]/.test(text[cursor] ?? '')) {
          return undefined;
        }
      } else {
        tag.attributes.push({ name: attributeName, start: attributeStart, end: nameEnd });
      }
      whitespace();
    }
    if (
      new Set(tag.attributes.map((attribute) => attribute.name.toLowerCase())).size !==
      tag.attributes.length
    ) {
      return undefined;
    }
    tag.selfClosing = !closing && text.startsWith('/>', cursor);
    if (tag.selfClosing) {
      cursor++;
    }
    if (text[cursor] !== '>') {
      return undefined;
    }
    tag.end = ++cursor;
    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== name) {
        return undefined;
      }
      open.closeStart = tagStart;
    } else {
      tags.push(tag);
      if (!tag.selfClosing && !voidTags.has(name)) {
        stack.push(tag);
      }
    }
  }
  return stack.length === 0 ? tags : undefined;
}

function readBraces(text: string, start: number, end: number): number | undefined {
  let depth = 0;
  let quote: string | undefined;
  for (let cursor = start; cursor < end; cursor++) {
    const character = text[cursor];
    if (quote) {
      if (character === '\\') {
        cursor++;
      } else if (character === quote) {
        quote = undefined;
      }
    } else if (character === '"' || character === "'" || character === '`') {
      quote = character;
    }
    // Slash expressions (comments/regex) need a JS parser; do not guess their boundaries.
    else if (character === '/') {
      return undefined;
    } else if (character === '{') {
      depth++;
    } else if (character === '}' && --depth === 0) {
      return cursor + 1;
    }
  }
  return undefined;
}
