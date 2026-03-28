import { describe, expect, it } from 'vitest';
import { collectWorkspaceSymbolsFromKpaText } from '../../language/workspaceSymbols';

describe('workspace symbols', () => {
  it('collects component symbols and exported script symbols from .kpa text', () => {
    const symbols = collectWorkspaceSymbolsFromKpaText(
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  export const buildUserCard = () => 1;',
        '[/ts]',
      ].join('\n'),
      '/tmp/UserCard.kpa',
    );

    expect(symbols.map((symbol) => symbol.name)).toContain('UserCard');
    expect(symbols.map((symbol) => symbol.name)).toContain('buildUserCard');
  });
});
