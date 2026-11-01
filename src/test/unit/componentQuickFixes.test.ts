import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { toEnglishMessage } from '../../language/englishMessages.cjs';
import {
  collectCanonicalTemplateComponentDiagnostics,
  parseKpaDocument,
} from '@koppajs/koppajs-language-core';
import {
  createComponentQuickFix,
  type ComponentQuickFixDiagnostic,
} from '../../language/componentQuickFixes';

const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })),
);

function fixture(markup: string, slots = 'header: unknown; default?: unknown;') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-quick-fixes-'));
  directories.push(directory);
  const sourcePath = path.join(directory, 'Page.kpa');
  fs.writeFileSync(
    path.join(directory, 'Card.kpa'),
    `[template]\n<div></div>\n[/template]\n[ts]\ninterface Slots { ${slots} }\ntype Emits = { save: unknown; };\n[/ts]`,
  );
  const text = `[template]\n${markup}\n[/template]\n[ts]\nimport Card from './Card.kpa';\n[/ts]`;
  const diagnose = (value: string) =>
    collectCanonicalTemplateComponentDiagnostics(parseKpaDocument(value), sourcePath);
  const current = diagnose(text);
  const diagnostic = (code: string): ComponentQuickFixDiagnostic => ({
    ...current.find((entry) => entry.code === code)!,
    source: 'koppa-diagnostics',
  });
  const fix = (code: string) => createComponentQuickFix(text, diagnostic(code), current);
  const apply = (code: string) => {
    const edit = fix(code)!;
    expect(edit).toBeDefined();
    return text.slice(0, edit.startOffset) + edit.newText + text.slice(edit.endOffset);
  };
  return { text, sourcePath, current, diagnose, diagnostic, fix, apply };
}
const slotCode = 'kpa.missing-component-slot';
const emitCode = 'kpa.unknown-component-emit';

describe('safe component quick fixes with installed shared diagnostics', () => {
  it('accepts displayed English diagnostics while preserving fresh-diagnostic validation', () => {
    const f = fixture('<Card @cancel="methods.cancel" />');
    for (const code of [slotCode, emitCode]) {
      const raw = f.diagnostic(code);
      const displayed = { ...raw, message: toEnglishMessage(raw.message) };
      expect(displayed.message).toBe(raw.message);
      expect(displayed.message).toMatch(/^(Required slot|Event handler) /);
      expect(createComponentQuickFix(f.text, displayed, f.current)).toEqual(f.fix(code));
      expect(createComponentQuickFix(f.text, displayed, [])).toBeUndefined();
    }
  });

  it('clears the same slot and emit warnings in the installed kpa-check CLI', () => {
    const f = fixture('<Card @cancel="methods.cancel" />');
    const cliPath = path.resolve('scripts/kpa-check.mjs');
    const run = (text: string) => {
      fs.writeFileSync(f.sourcePath, text);
      return spawnSync(process.execPath, [cliPath, f.sourcePath], { encoding: 'utf8' });
    };
    const before = run(f.text);
    expect(before.status).toBe(1);
    expect(before.stdout).toContain('Required slot [header]');
    expect(before.stdout).toContain('unknown emit [cancel]');
    let text = f.text;
    for (const code of [slotCode, emitCode]) {
      const diagnostics = f.diagnose(text);
      const diagnostic = diagnostics.find((entry) => entry.code === code)!;
      expect(diagnostic.data).toBeUndefined();
      const fix = createComponentQuickFix(
        text,
        { ...diagnostic, source: 'koppa-diagnostics' },
        diagnostics,
      )!;
      text = text.slice(0, fix.startOffset) + fix.newText + text.slice(fix.endOffset);
    }
    const after = run(text);
    expect(after.status, after.stdout + after.stderr).toBe(0);
    expect(after.stdout).toContain('no diagnostics found');
  });
  it.each(['<Card />', '<Card/>', '<Card :title="props.title" />'])(
    'expands self-closing named slots: %s',
    (markup) => {
      const f = fixture(markup);
      const updated = f.apply(slotCode);
      expect(f.fix(slotCode)?.title).toBe('Add slot [header] for [Card]');
      expect(updated).toContain('<div slot="header"></div>');
      expect(f.diagnose(updated).some((entry) => entry.code === slotCode)).toBe(false);
      expect(updated).toContain('</Card>');
      if (markup.includes(':title')) {
        expect(updated).toContain(':title="props.title"');
      }
    },
  );

  it('preserves existing content and inserts only the missing named slot', () => {
    const f = fixture('<Card><span>Keep me</span><div /></Card>');
    const updated = f.apply(slotCode);
    expect(updated).toContain('<span>Keep me</span><div />');
    expect(updated).toContain('<Card><div slot="header"></div>');
  });

  it('adds a default slot stub to a self-closing component', () => {
    const f = fixture('<Card/>', 'default: unknown;');
    const updated = f.apply(slotCode);
    expect(updated).toContain('<Card><div></div></Card>');
    expect(f.diagnose(updated).some((entry) => entry.code === slotCode)).toBe(false);
  });

  it.each([
    '@cancel="methods.cancel"',
    'on:cancel={methods.cancel}',
    'onCancel="methods.cancel"',
    '@cancel',
    '@cancel={{ methods.cancel }}',
  ])('removes the complete event attribute only: %s', (attribute) => {
    const f = fixture(`<Card :title="props.title" ${attribute} data-keep="x" />`);
    const updated = f.apply(emitCode);
    expect(updated).toContain('<Card :title="props.title"  data-keep="x" />');
    expect(f.diagnose(updated).some((entry) => entry.code === emitCode)).toBe(false);
  });

  it('handles multiline and CRLF attributes without removing adjacent text', () => {
    const f = fixture('<Card\r\n @cancel="methods.cancel"\r\n :title="props.title" />');
    expect(f.apply(emitCode)).toContain('<Card\r\n \r\n :title="props.title" />');
  });

  it('rejects stale ranges, messages, codes, foreign sources and missing current diagnostics', () => {
    const f = fixture('<Card @cancel="methods.cancel" />');
    const d = f.diagnostic(emitCode);
    for (const changed of [
      { ...d, source: 'other' },
      { ...d, message: 'invented' },
      { ...d, code: 'other' },
      { ...d, range: { ...d.range, startChar: d.range.startChar + 1 } },
    ]) {
      expect(createComponentQuickFix(f.text, changed, f.current)).toBeUndefined();
    }
    expect(createComponentQuickFix(f.text, d, [])).toBeUndefined();
    const updated = f.text.replace('@cancel', '@save');
    expect(createComponentQuickFix(updated, d, f.diagnose(updated))).toBeUndefined();
  });

  it.each([
    '<Card @cancel="methods.cancel" @cancel="methods.other" />',
    '<Card @cancel="methods.cancel"><div></Card>',
    '<Card @cancel="methods.cancel">',
    '<!-- <Card @cancel="methods.cancel" /> -->',
    '<Card @cancel="methods.cancel" broken="unterminated />',
    '<Card @cancel@save />',
    '<Card @cancel="methods.cancel"><script>const x = "<Card/>";</script></Card>',
    '<Card @cancel={/x/.test(value)} />',
  ])('refuses ambiguous or malformed parents: %s', (markup) => {
    const f = fixture(markup);
    expect(f.fix(emitCode)).toBeUndefined();
    expect(f.fix(slotCode)).toBeUndefined();
  });

  it('does not treat markup inside interpolation or comments as a parent', () => {
    const f = fixture('{{ "<Card @cancel=\'methods.cancel\' />" }}<!-- <Card /> --><Card />');
    const fake = f.current.find((entry) => entry.code === emitCode);
    if (fake) {
      expect(
        createComponentQuickFix(f.text, { ...fake, source: 'koppa-diagnostics' }, f.current),
      ).toBeUndefined();
    }
  });
});
