import { describe, expect, it } from 'vitest';
import {
  canonicalTemplateBlock,
  structuralKpaBlocks,
  supportedKpaBlocks,
} from '../../data/kpaBlocks';
import { isOffsetInsideSpecificBlock } from '../../utils/blockUtils';

describe('isOffsetInsideSpecificBlock', () => {
  it('detects when the cursor is inside the canonical template block', () => {
    const text = '[template]\n  <div></div>\n[/template]';
    const offset = text.indexOf('<div');

    expect(isOffsetInsideSpecificBlock(text, offset, [canonicalTemplateBlock])).toBe(true);
  });

  it('returns false once the block has been closed', () => {
    const text = '[template]\n  <div></div>\n[/template]\n';
    const offset = text.length;

    expect(isOffsetInsideSpecificBlock(text, offset, [canonicalTemplateBlock])).toBe(false);
  });

  it('matches any supported block from the shared catalog', () => {
    const text = '[scss]\n.button { color: red; }\n[/scss]';
    const offset = text.indexOf('color');

    expect(isOffsetInsideSpecificBlock(text, offset, supportedKpaBlocks)).toBe(true);
  });

  it('treats compatibility aliases as structural blocks when suppressing top-level snippets', () => {
    const text = '[html]\n  <div></div>\n[/html]';
    const offset = text.indexOf('<div');

    expect(isOffsetInsideSpecificBlock(text, offset, structuralKpaBlocks)).toBe(true);
  });
});
