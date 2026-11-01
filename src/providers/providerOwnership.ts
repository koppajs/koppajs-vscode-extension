import { resolveLocalSymbolOccurrenceAtOffset } from '../language/localSymbolReferences';
import { parseKpaDocument } from '../language/parser';
import { resolveCanonicalTemplateComponentAtOffset } from '../language/templateComponents';
import { getTemplateExpressionContext } from '../utils/templateContext';

export function isLegacyExpressionRequest(text: string, offset: number): boolean {
  const expression = getTemplateExpressionContext(text, offset);
  return Boolean(expression && !expression.isRuntimeExpression);
}

// Keep script-origin requests with the legacy adapter: its TS mapping includes
// single-brace usages that the runtime server deliberately does not recognize.
export function isLocalSymbolRequest(text: string, offset: number): boolean {
  const expression = getTemplateExpressionContext(text, offset);
  if (expression) {
    return !expression.isRuntimeExpression;
  }

  const document = parseKpaDocument(text);
  // Imported-component references/rename also include legacy uses of their
  // import bindings. Runtime-registered components have no local match and stay
  // with the server.
  if (resolveCanonicalTemplateComponentAtOffset(document, undefined, offset)) {
    return true;
  }

  const scriptBlock = document.blocks.some(
    (block) =>
      (block.kind === 'script-js' || block.kind === 'script-ts') &&
      offset >= block.contentRange.start.offset &&
      offset <= block.contentRange.end.offset,
  );
  return (
    scriptBlock && Boolean(resolveLocalSymbolOccurrenceAtOffset(document, offset)?.symbols.length)
  );
}
