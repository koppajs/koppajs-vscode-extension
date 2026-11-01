import { describe, expect, it } from 'vitest';
import { parseKpaDocument } from '../../language/parser';
import {
  collectCanonicalTemplateExpressions,
  collectCanonicalTemplateIdentifierReferences,
  getCanonicalTemplateExpressionAtOffset,
  getCanonicalTemplateIdentifierReferenceAtOffset,
  getTemplateExpressionRootReference,
} from '../../language/templateExpressions';

describe('collectCanonicalTemplateExpressions', () => {
  it('collects text and attribute expressions from canonical template blocks', () => {
    const text = [
      '[template]',
      '  <div class={count}>{message}</div>',
      '[/template]',
      '',
      '[html]',
      '  <div>{ignored}</div>',
      '[/html]',
    ].join('\n');
    const document = parseKpaDocument(text);
    const expressions = collectCanonicalTemplateExpressions(document);

    expect(expressions.map((expression) => expression.text)).toEqual(['{count}', '{message}']);
  });

  it('keeps an unclosed canonical template expression available for downstream tooling', () => {
    const text = '[template]\n  <div>{count\n[/template]';
    const document = parseKpaDocument(text);
    const [expression] = collectCanonicalTemplateExpressions(document);

    expect(expression?.text).toBe('{count\n');
    expect(expression?.contentText).toBe('count\n');
  });
});

describe('getCanonicalTemplateExpressionAtOffset', () => {
  it('returns the expression that owns the current cursor context', () => {
    const text = '[template]\n  <div>{count}</div>\n[/template]';
    const document = parseKpaDocument(text);
    const offset = text.indexOf('{count}') + 2;

    expect(getCanonicalTemplateExpressionAtOffset(document, offset)?.text).toBe('{count}');
  });
});

describe('collectCanonicalTemplateIdentifierReferences', () => {
  it('collects top-level identifier references from canonical template expressions', () => {
    const text = '[template]\n  <div>{ user?.format(count) + suffix }</div>\n[/template]';
    const document = parseKpaDocument(text);

    expect(
      collectCanonicalTemplateIdentifierReferences(document).map((reference) => reference.name),
    ).toEqual(['user', 'count', 'suffix']);
  });

  it('ignores property names and nested function scopes in canonical template expressions', () => {
    const text = '[template]\n  <div>{items.map((item) => item.name)}</div>\n[/template]';
    const document = parseKpaDocument(text);

    expect(
      collectCanonicalTemplateIdentifierReferences(document).map((reference) => reference.name),
    ).toEqual(['items']);
  });
});

describe('getCanonicalTemplateIdentifierReferenceAtOffset', () => {
  it('returns the identifier reference at the current cursor offset', () => {
    const text = '[template]\n  <div>{count + other}</div>\n[/template]';
    const document = parseKpaDocument(text);
    const offset = text.indexOf('other') + 2;

    expect(getCanonicalTemplateIdentifierReferenceAtOffset(document, offset)?.name).toBe('other');
  });
});

describe('getTemplateExpressionRootReference', () => {
  it('extracts the leading root reference for simple member and call chains', () => {
    const text = '[template]\n  <div>{ user?.format() }</div>\n[/template]';
    const document = parseKpaDocument(text);
    const [expression] = collectCanonicalTemplateExpressions(document);
    const reference = expression
      ? getTemplateExpressionRootReference(document, expression)
      : undefined;

    expect(reference?.name).toBe('user');
    expect(text.slice(reference!.range.start.offset, reference!.range.end.offset)).toBe('user');
  });

  it('returns no root reference for compound expressions', () => {
    const text = '[template]\n  <div>{count + 1}</div>\n[/template]';
    const document = parseKpaDocument(text);
    const [expression] = collectCanonicalTemplateExpressions(document);

    expect(expression && getTemplateExpressionRootReference(document, expression)).toBeUndefined();
  });
});
