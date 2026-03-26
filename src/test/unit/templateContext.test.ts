import { describe, expect, it } from 'vitest';
import {
  getCanonicalTemplateContext,
  getTemplateExpressionContext,
  isOffsetInsideTemplateExpression,
} from '../../utils/templateContext';

describe('getCanonicalTemplateContext', () => {
  it('returns the canonical template block context at the cursor offset', () => {
    const text = '[template]\n  <div>{count}</div>\n[/template]';
    const offset = text.indexOf('{count}') + 2;
    const context = getCanonicalTemplateContext(text, offset);

    expect(context?.block.name).toBe('template');
  });
});

describe('getTemplateExpressionContext', () => {
  it('returns an expression context inside a text interpolation', () => {
    const text = '[template]\n  <div>{count}</div>\n[/template]';
    const offset = text.indexOf('{count}') + 2;
    const context = getTemplateExpressionContext(text, offset);

    expect(context).toBeDefined();
    expect(
      text.slice(context!.expressionRange.startOffset, context!.expressionRange.endOffset),
    ).toBe('{count}');
  });

  it('returns an expression context inside an unquoted attribute interpolation', () => {
    const text = '[template]\n  <div class={count}></div>\n[/template]';
    const offset = text.indexOf('{count}') + 2;

    expect(isOffsetInsideTemplateExpression(text, offset)).toBe(true);
  });

  it('returns false inside quoted HTML attribute values', () => {
    const text = '[template]\n  <div class="count"></div>\n[/template]';
    const offset = text.indexOf('count') + 2;

    expect(isOffsetInsideTemplateExpression(text, offset)).toBe(false);
  });

  it('returns false inside compatibility alias blocks', () => {
    const text = '[html]\n  <div>{count}</div>\n[/html]';
    const offset = text.indexOf('{count}') + 2;

    expect(getTemplateExpressionContext(text, offset)).toBeUndefined();
  });

  it('keeps an unclosed template expression available while the user is still typing', () => {
    const text = '[template]\n  <div>{count\n[/template]';
    const offset = text.indexOf('{count') + '{count'.length;
    const context = getTemplateExpressionContext(text, offset);

    expect(context).toBeDefined();
    expect(
      text.slice(context!.expressionRange.startOffset, context!.expressionRange.endOffset),
    ).toBe('{count\n');
  });
});
