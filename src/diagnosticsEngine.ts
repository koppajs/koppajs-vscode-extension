import { supportedKpaBlocks } from './data/kpaBlocks';
import {
  collectBlockDiagnosticsFromDocument,
  type KpaBlockDiagnostic as BlockDiagnostic,
} from './language/diagnosticsRules';
import { parseKpaDocument } from './language/parser';

export type { BlockDiagnostic };

export function collectBlockDiagnostics(
  text: string,
  knownBlocks: readonly string[] = supportedKpaBlocks,
): BlockDiagnostic[] {
  return collectBlockDiagnosticsFromDocument(parseKpaDocument(text), knownBlocks);
}
