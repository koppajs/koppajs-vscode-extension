import type { KpaDocument } from './ast';
import type { KpaBlockDiagnostic } from './diagnosticsRules';
import { collectLocalScriptSymbols } from './symbols';
import {
  collectCanonicalTemplateExpressions,
  getTemplateExpressionRootReference,
} from './templateExpressions';

const knownGlobalTemplateNames = new Set([
  'Array',
  'Boolean',
  'Date',
  'Infinity',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'URL',
  'URLSearchParams',
  'console',
  'decodeURIComponent',
  'encodeURIComponent',
  'false',
  'isFinite',
  'isNaN',
  'null',
  'parseFloat',
  'parseInt',
  'this',
  'true',
  'undefined',
]);

export function collectTemplateDiagnosticsFromDocument(
  document: KpaDocument,
): KpaBlockDiagnostic[] {
  const templateVisibleNames = new Set(
    collectLocalScriptSymbols(document).templateVisible.map((symbol) => symbol.name),
  );

  return collectCanonicalTemplateExpressions(document).flatMap((expression) => {
    const rootReference = getTemplateExpressionRootReference(document, expression);

    if (!rootReference) {
      return [];
    }

    if (
      templateVisibleNames.has(rootReference.name) ||
      knownGlobalTemplateNames.has(rootReference.name)
    ) {
      return [];
    }

    return [
      {
        range: {
          line: rootReference.range.start.line,
          startChar: rootReference.range.start.character,
          endChar: rootReference.range.end.character,
        },
        message: `Lokales Template-Symbol [${rootReference.name}] wurde nicht gefunden.`,
      },
    ];
  });
}
