import { supportedKpaBlocks } from '../data/kpaBlocks';
import type { KpaDocument } from './ast';
import { collectBlockDiagnosticsFromDocument, type KpaBlockDiagnostic } from './diagnosticsRules';
import { parseKpaDocument } from './parser';
import { collectCanonicalTemplateComponentDiagnostics } from './templateComponents';
import { collectTemplateDiagnosticsFromDocument } from './templateDiagnosticsRules';

export {
  collectImportedKpaComponents,
  collectCanonicalTemplateComponentUsages,
  collectCanonicalTemplateTags,
  collectCanonicalTemplateTagsForComponent,
  collectWorkspaceTemplateComponentUsagesForResolvedFile,
  findImportedKpaComponentForSymbol,
  getImportedKpaComponentApi,
  getImportedKpaComponentLocalSymbols,
  normalizeComponentRenameTarget,
  resolveCanonicalTemplateComponentAtOffset,
  toKebabCase,
  type KpaWorkspaceTemplateComponentUsage,
} from './templateComponents';
export { resolveWorkspaceImportPath } from './projectConfig';
export { collectLocalScriptSymbols } from './symbols';
export {
  collectWorkspaceSymbolsFromKpaText,
  type KpaWorkspaceSymbolEntry,
} from './workspaceSymbols';
export {
  KpaWorkspaceIndex,
  type KpaWorkspaceFileDiagnostics,
  type KpaWorkspaceIndexOptions,
} from './workspaceIndex';
export { parseKpaDocument };

export function collectKpaDiagnosticsFromDocument(
  document: KpaDocument,
  knownBlocks: readonly string[] = supportedKpaBlocks,
  sourcePath?: string,
): readonly KpaBlockDiagnostic[] {
  return [
    ...collectBlockDiagnosticsFromDocument(document, knownBlocks),
    ...collectTemplateDiagnosticsFromDocument(document),
    ...collectCanonicalTemplateComponentDiagnostics(document, sourcePath),
  ];
}

export function collectKpaDiagnosticsFromText(
  text: string,
  knownBlocks: readonly string[] = supportedKpaBlocks,
  sourcePath?: string,
): {
  document: KpaDocument;
  diagnostics: readonly KpaBlockDiagnostic[];
} {
  const document = parseKpaDocument(text);

  return {
    document,
    diagnostics: collectKpaDiagnosticsFromDocument(document, knownBlocks, sourcePath),
  };
}
