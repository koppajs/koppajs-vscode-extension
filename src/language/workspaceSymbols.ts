import path from 'path';
import type { KpaLocatedRange } from './ast';
import { parseKpaDocument } from './parser';
import { createLocatedRange } from './sourcePositions';
import { collectLocalScriptSymbols, type KpaScriptSymbol } from './symbols';

export type KpaWorkspaceSymbolKind = 'component' | KpaScriptSymbol['kind'];

export interface KpaWorkspaceSymbolEntry {
  containerName?: string;
  filePath: string;
  kind: KpaWorkspaceSymbolKind;
  name: string;
  range: KpaLocatedRange;
}

export function collectWorkspaceSymbolsFromKpaText(
  text: string,
  filePath: string,
): readonly KpaWorkspaceSymbolEntry[] {
  const document = parseKpaDocument(text);
  const fileName = path.basename(filePath, path.extname(filePath));
  const componentRange =
    document.blocks.find((block) => block.name === 'template')?.openTag.range ??
    document.blocks[0]?.openTag.range ??
    createLocatedRange(document.lineStarts, 0, Math.min(text.length, fileName.length));
  const exportedSymbols = collectLocalScriptSymbols(document).exported;

  return [
    {
      containerName: path.dirname(filePath),
      filePath,
      kind: 'component',
      name: fileName,
      range: componentRange,
    },
    ...exportedSymbols.map((symbol) => ({
      containerName: fileName,
      filePath,
      kind: symbol.kind,
      name: symbol.name,
      range: symbol.range,
    })),
  ];
}
