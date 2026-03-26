import { supportedKpaBlocks } from './data/kpaBlocks';
import {
  collectBlockDiagnosticsFromDocument,
  type KpaBlockDiagnostic,
} from './language/diagnosticsRules';
import { parseKpaDocument } from './language/parser';
import { collectTemplateDiagnosticsFromDocument } from './language/templateDiagnosticsRules';

export type { KpaBlockDiagnostic as KpaDiagnostic };

export function collectKpaDiagnostics(
  text: string,
  knownBlocks: readonly string[] = supportedKpaBlocks,
): KpaBlockDiagnostic[] {
  const document = parseKpaDocument(text);

  return [
    ...collectBlockDiagnosticsFromDocument(document, knownBlocks),
    ...collectTemplateDiagnosticsFromDocument(document),
  ];
}

export const collectBlockDiagnostics = collectKpaDiagnostics;
