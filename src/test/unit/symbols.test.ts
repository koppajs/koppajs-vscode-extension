import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import { collectLocalScriptSymbols } from '../../language/symbols';

describe('collectLocalScriptSymbols', () => {
  it('collects top-level bindings from ts blocks and distinguishes template visibility', () => {
    const text = [
      '[ts]',
      "import Foo, { bar as baz, type TypeOnly } from './dep';",
      "import type { OnlyType } from './types';",
      'const count = 1;',
      'const { first, second: renamedSecond } = source;',
      'function increment() {}',
      'class Counter {}',
      'enum State { Idle }',
      'interface Props {}',
      "type Size = 's' | 'm';",
      'function outer() { const hidden = 1; }',
      '[/ts]',
    ].join('\n');

    const symbols = collectLocalScriptSymbols(parseKpaDocument(text));

    expect(
      symbols.all.map((symbol) => [symbol.name, symbol.kind, symbol.isTemplateVisible]),
    ).toEqual([
      ['Foo', 'import', true],
      ['baz', 'import', true],
      ['TypeOnly', 'import-type', false],
      ['OnlyType', 'import-type', false],
      ['count', 'variable', true],
      ['first', 'variable', true],
      ['renamedSecond', 'variable', true],
      ['increment', 'function', true],
      ['Counter', 'class', true],
      ['State', 'enum', true],
      ['Props', 'interface', false],
      ['Size', 'type-alias', false],
      ['outer', 'function', true],
    ]);

    expect(symbols.all.some((symbol) => symbol.name === 'hidden')).toBe(false);
    expect(symbols.templateVisible.map((symbol) => symbol.name)).toEqual([
      'Foo',
      'baz',
      'count',
      'first',
      'renamedSecond',
      'increment',
      'Counter',
      'State',
      'outer',
    ]);

    const countSymbol = symbols.all.find((symbol) => symbol.name === 'count');
    expect(countSymbol).toBeDefined();
    expect(text.slice(countSymbol!.range.start.offset, countSymbol!.range.end.offset)).toBe(
      'count',
    );
  });

  it('marks exported symbols from direct exports, export lists, and default export assignments', () => {
    const text = [
      '[ts]',
      'const local = 1;',
      'const fromDefault = 2;',
      'export { local };',
      'export default fromDefault;',
      'export function useThing() {}',
      'export interface Props {}',
      '[/ts]',
    ].join('\n');

    const symbols = collectLocalScriptSymbols(parseKpaDocument(text));

    expect(symbols.exported.map((symbol) => symbol.name)).toEqual([
      'local',
      'fromDefault',
      'useThing',
      'Props',
    ]);
  });

  it('collects symbols from js and ts blocks while preserving the originating block kind', () => {
    const text = [
      '[js]',
      "import { createApp } from './app';",
      'const count = 1;',
      '[/js]',
      '',
      '[ts]',
      'export type Props = { count: number };',
      '[/ts]',
    ].join('\n');

    const symbols = collectLocalScriptSymbols(parseKpaDocument(text));

    expect(symbols.all.map((symbol) => [symbol.name, symbol.blockKind])).toEqual([
      ['createApp', 'script-js'],
      ['count', 'script-js'],
      ['Props', 'script-ts'],
    ]);
  });
});
