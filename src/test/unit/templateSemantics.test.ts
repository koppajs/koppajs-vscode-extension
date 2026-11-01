import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import {
  getTemplateSemanticCompletions,
  getTemplateSemanticDefinitions,
  getTemplateSemanticHover,
  getTemplateSemanticReferences,
  getTemplateSemanticRenameInfo,
  getTemplateSemanticRenameRanges,
} from '../../language/templateSemantics';

describe('getTemplateSemanticCompletions', () => {
  it('returns typed member completions inside canonical template expressions', () => {
    const text = [
      '[template]',
      '  <div>{user.}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const user = { name: "Ada", age: 32 };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('user.') + 'user.'.length;

    const completions = getTemplateSemanticCompletions(document, '/tmp/example.kpa', offset);

    expect(completions?.some((completion) => completion.name === 'name')).toBe(true);
    expect(completions?.some((completion) => completion.name === 'age')).toBe(true);
  });

  it('filters root completions to template-visible local names', () => {
    const text = [
      '[template]',
      '  <div>{co}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const count = 1;',
      '  function increment() {}',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('{co}') + 3;

    const completions = getTemplateSemanticCompletions(document, '/tmp/example.kpa', offset);
    const names = completions?.map((completion) => completion.name) ?? [];

    expect(names).toContain('count');
    expect(names).toContain('increment');
    expect(names).not.toContain('Array');
  });
});

describe('getTemplateSemanticHover', () => {
  it('returns typed hover information for template member access', () => {
    const text = [
      '[template]',
      '  <div>{user.name}</div>',
      '[/template]',
      '',
      '[ts]',
      '  const user = { name: "Ada", age: 32 };',
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('name') + 1;

    const hover = getTemplateSemanticHover(document, '/tmp/example.kpa', offset);

    expect(hover?.displayText).toContain('name');
    expect(hover?.displayText).toContain('string');
  });
});

describe('workspace-aware semantic mapping', () => {
  it('resolves definitions, references, and rename ranges across imported files', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-semantics-'));
    const depPath = path.join(tempDirectory, 'dep.ts');
    const sourcePath = path.join(tempDirectory, 'component.kpa');

    fs.writeFileSync(depPath, 'export const externalCount = 123;\n');

    const text = [
      '[template]',
      '  <div>{externalCount}</div>',
      '[/template]',
      '',
      '[ts]',
      "  import { externalCount } from './dep';",
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const offset = text.indexOf('externalCount') + 1;

    const definitions = getTemplateSemanticDefinitions(document, sourcePath, offset);
    const references = getTemplateSemanticReferences(document, sourcePath, offset);
    const renameInfo = getTemplateSemanticRenameInfo(document, sourcePath, offset);
    const renameRanges = getTemplateSemanticRenameRanges(document, sourcePath, offset);

    expect(definitions?.some((definition) => definition.fileName === depPath)).toBe(true);
    expect(references?.some((reference) => reference.fileName === depPath)).toBe(true);
    expect(references?.some((reference) => reference.fileName.endsWith('.template.ts'))).toBe(true);
    expect(renameInfo?.placeholder).toBe('externalCount');
    expect(renameRanges?.every((range) => range.fileName.endsWith('.template.ts'))).toBe(true);
  });
});
