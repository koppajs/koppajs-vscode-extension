import { describe, expect, it } from 'vitest';
import { collectBlockDiagnostics } from '../../diagnosticsEngine';

describe('collectBlockDiagnostics', () => {
  it('returns no diagnostics for a well-formed document', () => {
    const text = [
      '[template]',
      '  <div></div>',
      '[/template]',
      '',
      '[ts]',
      'const a = 1;',
      '[/ts]',
    ].join('\n');

    expect(collectBlockDiagnostics(text)).toEqual([]);
  });

  it('flags an unmatched closing block', () => {
    const text = '[/template]';
    const [diagnostic] = collectBlockDiagnostics(text);

    expect(diagnostic?.message).toContain('ohne dass er vorher geoeffnet wurde');
    expect(diagnostic?.range).toEqual({
      line: 0,
      startChar: 0,
      endChar: '[/template]'.length,
    });
  });

  it('flags a mismatched closing block', () => {
    const text = ['[template]', '[/css]'].join('\n');
    const [diagnostic] = collectBlockDiagnostics(text);

    expect(diagnostic?.message).toContain('Stattdessen [/css] verwendet');
  });

  it('flags unclosed blocks with the expected closing tag text', () => {
    const text = '[template]\n  <div>';
    const [diagnostic] = collectBlockDiagnostics(text);

    expect(diagnostic?.message).toBe(
      'Der Block [template] wurde nicht geschlossen. Erwartet [/template].',
    );
  });

  it('ignores unknown block names', () => {
    const text = ['[layout]', '[/layout]'].join('\n');

    expect(collectBlockDiagnostics(text)).toEqual([]);
  });

  it('ignores compatibility aliases until they are explicitly promoted to runtime diagnostics', () => {
    const text = ['[html]', '<div></div>', '[/html]'].join('\n');

    expect(collectBlockDiagnostics(text)).toEqual([]);
  });

  it('treats unknown open blocks as invisible to canonical closing diagnostics', () => {
    const text = ['[layout]', '[/template]'].join('\n');
    const [diagnostic] = collectBlockDiagnostics(text);

    expect(diagnostic?.message).toContain('ohne dass er vorher geoeffnet wurde');
  });
});
