import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBlockAtOffset } from '../../language/documentModel';
import { parseKpaDocument } from '../../language/parser';

function readFixture(name: string): string {
  return readFileSync(
    path.join(process.cwd(), 'src', 'test', 'fixtures', 'documents', name),
    'utf8',
  );
}

describe('parseKpaDocument', () => {
  it('parses canonical blocks from fixture documents', () => {
    const document = parseKpaDocument(readFixture('well-formed-component.kpa'));

    expect(document.tags.map((tag) => `${tag.isClosing ? '/' : ''}${tag.name}`)).toEqual([
      'template',
      '/template',
      'ts',
      '/ts',
      'css',
      '/css',
    ]);
    expect(document.blocks.map((block) => [block.name, block.kind, block.isClosed])).toEqual([
      ['template', 'template', true],
      ['ts', 'script-ts', true],
      ['css', 'style-css', true],
    ]);
  });

  it('keeps unclosed canonical blocks available for downstream diagnostics', () => {
    const document = parseKpaDocument(readFixture('mismatched-canonical-close.kpa'));

    expect(document.tags.map((tag) => `${tag.isClosing ? '/' : ''}${tag.name}`)).toEqual([
      'template',
      '/css',
    ]);
    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0]).toMatchObject({
      name: 'template',
      kind: 'template',
      isClosed: false,
    });
  });
});

describe('getBlockAtOffset', () => {
  it('returns the block that owns the current cursor context', () => {
    const text = readFixture('well-formed-component.kpa');
    const document = parseKpaDocument(text);
    const templateOffset = text.indexOf('<div');
    const scriptOffset = text.indexOf('const count');

    expect(getBlockAtOffset(document, templateOffset, ['template'])?.name).toBe('template');
    expect(getBlockAtOffset(document, scriptOffset, ['ts'])?.name).toBe('ts');
  });
});
