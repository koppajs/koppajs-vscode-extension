import { describe, expect, it } from 'vitest';
import { isOffsetInsideOpeningHtmlTag } from '../../utils/htmlUtils';

describe('isOffsetInsideOpeningHtmlTag', () => {
  it('returns true while editing an opening tag', () => {
    const text = '<button class="cta">';
    const offset = text.indexOf('class');

    expect(isOffsetInsideOpeningHtmlTag(text, offset)).toBe(true);
  });

  it('returns false after the opening tag has been closed', () => {
    const text = '<button class="cta">Click</button>';
    const offset = text.indexOf('Click');

    expect(isOffsetInsideOpeningHtmlTag(text, offset)).toBe(false);
  });

  it('returns false inside a closing tag', () => {
    const text = '<button>Click</button>';
    const offset = text.indexOf('/button') + 1;

    expect(isOffsetInsideOpeningHtmlTag(text, offset)).toBe(false);
  });
});
