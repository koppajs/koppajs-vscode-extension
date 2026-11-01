import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';
import type * as vscode from 'vscode';
import { describe, expect, it } from 'vitest';
import {
  KpaLanguageService,
  collectCanonicalTemplateComponentDiagnostics,
  parseKpaDocument,
} from '@koppajs/koppajs-language-core';
import { htmlTags } from '../../data/htmlTags';
import { htmlAttributes } from '../../data/htmlAttributes';
import { toEnglishMessage } from '../../language/englishMessages.cjs';
import {
  toEnglishCompletionItem,
  toEnglishDiagnostic,
  withEnglishErrors,
} from '../../providers/englishPresentation';

const germanMissing = 'Lokales Template-Symbol [missing] wurde nicht gefunden.';

describe('English presentation of shared language results', () => {
  it('uses the same English core instance for the editor server and CLI', () => {
    const require = createRequire(path.resolve('package.json'));
    const serverRequire = createRequire(require.resolve('@koppajs/koppajs-language-server'));
    const cliRequire = createRequire(require.resolve('@koppajs/koppajs-kpa-check'));
    expect(serverRequire.resolve('@koppajs/koppajs-language-core')).toBe(
      require.resolve('@koppajs/koppajs-language-core'),
    );
    expect(cliRequire.resolve('@koppajs/koppajs-language-core')).toBe(
      require.resolve('@koppajs/koppajs-language-core'),
    );
  });

  it('uses English message templates in the installed core service and diagnostic rules', () => {
    const resolve = createRequire(path.resolve('package.json')).resolve;
    const root = path.dirname(resolve('@koppajs/koppajs-language-core'));
    const files = [
      'service.js',
      'language/diagnosticsRules.js',
      'language/templateDiagnosticsRules.js',
      'language/templateComponents.js',
    ];
    let checked = 0;
    for (const file of files) {
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(path.join(root, file), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      const visit = (node: ts.Node) => {
        if (ts.isTemplateExpression(node)) {
          const values = node.templateSpans.map((_, index) => 'value' + index);
          const message =
            node.head.text +
            node.templateSpans.map((span, index) => values[index] + span.literal.text).join('');
          expect(message, file).not.toMatch(
            /\b(wurde|nicht|Komponente|fehlt|fuer|ergaenzen|ungueltig|mehrdeutig)\b/,
          );
          expect(toEnglishMessage(message), file).toBe(message);
          checked++;
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(checked).toBeGreaterThanOrEqual(16);
  });

  it('preserves English installed server diagnostics and their metadata', () => {
    const service = new KpaLanguageService();
    const uri = 'untitled:english.kpa';
    service.openDocument(uri, '[template]\n<UserCard/>\n[/css]');
    const diagnostics = service.getDiagnostics(uri);
    expect(diagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of diagnostics) {
      const displayed = {
        ...diagnostic,
        source: 'koppa-diagnostics',
      } as unknown as vscode.Diagnostic;
      const before = { ...displayed };
      expect(toEnglishDiagnostic(displayed)).toBe(displayed);
      expect(displayed.message).toBe(before.message);
      expect(displayed.message).not.toMatch(/\b(wurde|nicht|Komponente|fehlt)\b/);
      expect(displayed).toEqual({ ...before, message: toEnglishMessage(before.message) });
    }
  });

  it('uses English HTML descriptions while preserving snippets and semantic documentation', () => {
    for (const [snippet, documentation] of [
      ...htmlTags.map((tag) => [tag.pattern, tag.description]),
      ...htmlAttributes.map((attribute) => [attribute.snippet, attribute.documentation]),
    ]) {
      const item = {
        label: 'item',
        insertText: { value: snippet },
        documentation: 'old description',
      } as vscode.CompletionItem;
      expect(toEnglishCompletionItem(item)).toBe(item);
      expect(item.documentation).toBe(documentation);
      expect(item.insertText).toEqual({ value: snippet });
    }
    const semantic = {
      label: 'title',
      detail: 'Component prop',
      insertText: 'title="$1"',
      documentation: 'User-authored text',
    };
    expect(toEnglishCompletionItem(semantic)).toEqual(semantic);
    const unknown = { label: 'custom', documentation: 'User-authored text' };
    expect(toEnglishCompletionItem(unknown)).toEqual(unknown);
  });

  it('retains compatibility for legacy shared diagnostics', () => {
    const diagnostic = {
      source: 'koppa-diagnostics',
      message: germanMissing,
      code: 'kpa.missing-template-symbol',
    } as vscode.Diagnostic;
    expect(toEnglishDiagnostic(diagnostic)).toBe(diagnostic);
    expect(diagnostic.message).toBe('Local template symbol [missing] was not found.');
    expect(diagnostic.code).toBe('kpa.missing-template-symbol');
  });

  it('leaves foreign diagnostics, unknown text, and user values unchanged', () => {
    const foreign = { source: 'other', message: germanMissing } as vscode.Diagnostic;
    expect(toEnglishDiagnostic(foreign).message).toBe(germanMissing);
    expect(toEnglishMessage('User-authored text: ' + germanMissing)).toBe(
      'User-authored text: ' + germanMissing,
    );
    expect(
      toEnglishMessage(
        'Prop [title] an Komponente [Card] erwartet [string], erhalten wurde [größe].',
      ),
    ).toBe('Prop [title] on component [Card] expects [string], received [größe].');
  });

  it('preserves delimiter-like text in actual shared prop-expression diagnostics', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kpa-english-prop-'));
    try {
      fs.writeFileSync(
        path.join(root, 'Card.kpa'),
        '[template]<div/>[/template]\n[ts]\ninterface Props { value: number; }\n[/ts]',
      );
      const text =
        '[template]<Card :value={\'x], erhalten wurde [y\'} />[/template]\n[ts]\nimport Card from "./Card.kpa";\n[/ts]';
      const diagnostic = collectCanonicalTemplateComponentDiagnostics(
        parseKpaDocument(text),
        path.join(root, 'Page.kpa'),
      ).find((entry) => entry.code === 'kpa.invalid-component-prop-type');
      expect(diagnostic).toBeDefined();
      expect(toEnglishMessage(diagnostic!.message)).toBe(
        "Prop [value] on component [Card] expects [number], received ['x], erhalten wurde [y'].",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    'number[]',
    "'x], erhalten wurde [y' | number",
    '{ value: [string, number] }',
    'number /* ] */',
  ])('preserves brackets and quoted delimiters in type %s', (type) => {
    const value = "'x], erhalten wurde [y'";
    const message =
      'Prop [value] an Komponente [Card] erwartet [' + type + '], erhalten wurde [' + value + '].';
    expect(toEnglishMessage(message)).toBe(
      'Prop [value] on component [Card] expects [' + type + '], received [' + value + '].',
    );
  });

  it('preserves request error identity and codes, and does not translate cancellation', async () => {
    const error = Object.assign(
      new Error('Template symbol [count] ist mehrdeutig und kann nicht sicher umbenannt werden.'),
      { code: -32803, data: { name: 'count' } },
    );
    await expect(
      withEnglishErrors(() => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(error.message).toBe(
      'Template symbol [count] is ambiguous and cannot be renamed safely.',
    );
    expect(error.code).toBe(-32803);
    expect(error.data).toEqual({ name: 'count' });
    const cancellation = new Error('Canceled');
    await expect(withEnglishErrors(() => Promise.reject(cancellation))).rejects.toBe(cancellation);
    expect(await withEnglishErrors(() => null)).toBeNull();
  });
});
