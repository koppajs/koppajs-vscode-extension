import { supportedKpaBlocks } from './data/kpaBlocks';
import { collectKpaDiagnosticsFromText } from './language/core';
import type { KpaBlockDiagnostic } from './language/diagnosticsRules';

export type { KpaBlockDiagnostic as KpaDiagnostic };

export function collectKpaDiagnostics(
  text: string,
  knownBlocks: readonly string[] = supportedKpaBlocks,
  sourcePath?: string,
): KpaBlockDiagnostic[] {
  return [...collectKpaDiagnosticsFromText(text, knownBlocks, sourcePath).diagnostics];
}

export const collectBlockDiagnostics = collectKpaDiagnostics;
