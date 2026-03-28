import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import {
  collectCanonicalTemplateComponentDiagnostics,
  collectCanonicalTemplateComponentUsages,
  collectImportedKpaComponents,
  getImportedKpaComponentApi,
  normalizeComponentRenameTarget,
  resolveCanonicalTemplateComponentAtOffset,
} from '../../language/templateComponents';
import { kpaDiagnosticCodes } from '../../language/diagnosticCodes';

describe('template components', () => {
  it('collects imported .kpa components and exposes tag aliases', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');

    const text = [
      '[template]',
      '  <UserCard />',
      '  <user-card />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const components = collectImportedKpaComponents(document, sourcePath);
    const aliasOffset = text.indexOf('user-card') + 2;
    const resolvedAlias = resolveCanonicalTemplateComponentAtOffset(
      document,
      sourcePath,
      aliasOffset,
    );

    expect(components).toHaveLength(1);
    expect(components[0].name).toBe('UserCard');
    expect(components[0].tagNames).toEqual(['UserCard', 'user-card']);
    expect(components[0].resolvedFilePath).toBe(componentPath);
    expect(resolvedAlias?.component.name).toBe('UserCard');
    expect(resolvedAlias?.component.resolvedFilePath).toBe(componentPath);
  });

  it('warns about unresolved PascalCase component tags and broken .kpa imports', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const sourcePath = path.join(tempDirectory, 'Page.kpa');
    const text = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import MissingCard from './MissingCard.kpa';",
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const diagnostics = collectCanonicalTemplateComponentDiagnostics(document, sourcePath);

    expect(
      diagnostics.some((diagnostic) =>
        diagnostic.message.includes('Komponente [UserCard] wurde im [template]-Block verwendet'),
      ),
    ).toBe(true);
    expect(
      diagnostics.some((diagnostic) =>
        diagnostic.message.includes(
          'Komponenten-Import [MissingCard] verweist auf [./MissingCard.kpa]',
        ),
      ),
    ).toBe(true);
  });

  it('normalizes component rename targets from kebab-case to symbol and tag names', () => {
    expect(normalizeComponentRenameTarget('profile-card')).toEqual({
      symbolName: 'ProfileCard',
      kebabTagName: 'profile-card',
    });
    expect(normalizeComponentRenameTarget('ProfileCard')).toEqual({
      symbolName: 'ProfileCard',
      kebabTagName: 'profile-card',
    });
  });

  it('extracts props, emits, and slots from an imported .kpa component API', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '    count?: number;',
        '  }',
        '  type Emits = {',
        '    save: [id: number];',
        '  };',
        '  interface Slots {',
        '    default?: unknown;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );

    const pageText = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const document = parseKpaDocument(pageText);
    const component = collectImportedKpaComponents(document, sourcePath)[0];
    const api = getImportedKpaComponentApi(component);

    expect(api?.props.map((entry) => entry.name)).toEqual(['title', 'count']);
    expect(api?.props.find((entry) => entry.name === 'count')?.optional).toBe(true);
    expect(api?.emits.map((entry) => entry.name)).toEqual(['save']);
    expect(api?.slots.map((entry) => entry.name)).toEqual(['default']);
  });

  it('reports missing required props with quick-fix metadata', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );

    const text = [
      '[template]',
      '  <UserCard />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const diagnostics = collectCanonicalTemplateComponentDiagnostics(
      parseKpaDocument(text),
      sourcePath,
    );
    const missingPropDiagnostic = diagnostics.find(
      (diagnostic) => diagnostic.code === kpaDiagnosticCodes.missingComponentProp,
    );

    expect(missingPropDiagnostic?.message).toContain('Required Prop [title]');
    expect(missingPropDiagnostic?.data).toMatchObject({
      componentName: 'UserCard',
      propName: 'title',
    });
  });

  it('reports unknown props and simple prop type mismatches for imported components', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Props {',
        '    title: string;',
        '  }',
        '[/ts]',
      ].join('\n'),
    );

    const text = [
      '[template]',
      '  <UserCard title={1} extra="yes" />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const diagnostics = collectCanonicalTemplateComponentDiagnostics(
      parseKpaDocument(text),
      sourcePath,
    );

    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.code === kpaDiagnosticCodes.invalidComponentPropType,
      ),
    ).toBe(true);
    expect(
      diagnostics.some((diagnostic) => diagnostic.code === kpaDiagnosticCodes.unknownComponentProp),
    ).toBe(true);
  });

  it('collects canonical component usages with parsed attributes and insertion points', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');

    const text = [
      '[template]',
      '  <UserCard title="Ada" active />',
      '[/template]',
      '',
      '[ts]',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const usages = collectCanonicalTemplateComponentUsages(parseKpaDocument(text), sourcePath);

    expect(usages).toHaveLength(1);
    expect(usages[0].attributes.map((attribute) => attribute.name)).toEqual(['title', 'active']);
    expect(usages[0].insertOffset).toBeGreaterThan(text.indexOf('UserCard'));
  });

  it('reports missing required slots and unknown emit bindings for imported components', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-template-components-'));
    const componentPath = path.join(tempDirectory, 'UserCard.kpa');
    const sourcePath = path.join(tempDirectory, 'Page.kpa');

    fs.writeFileSync(
      componentPath,
      [
        '[template]',
        '  <div></div>',
        '[/template]',
        '',
        '[ts]',
        '  interface Slots {',
        '    header: unknown;',
        '  }',
        '  type Emits = {',
        '    save: [id: number];',
        '  };',
        '[/ts]',
      ].join('\n'),
    );

    const text = [
      '[template]',
      '  <UserCard @close={handleClose}>',
      '    <div>Body</div>',
      '  </UserCard>',
      '[/template]',
      '',
      '[ts]',
      '  const handleClose = () => {};',
      "  import UserCard from './UserCard';",
      '[/ts]',
    ].join('\n');
    const diagnostics = collectCanonicalTemplateComponentDiagnostics(
      parseKpaDocument(text),
      sourcePath,
    );

    expect(
      diagnostics.some((diagnostic) => diagnostic.code === kpaDiagnosticCodes.unknownComponentEmit),
    ).toBe(true);
    expect(
      diagnostics.some((diagnostic) => diagnostic.code === kpaDiagnosticCodes.missingComponentSlot),
    ).toBe(true);
  });
});
