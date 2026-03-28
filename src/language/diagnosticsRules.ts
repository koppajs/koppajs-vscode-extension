import { supportedKpaBlocks } from '../data/kpaBlocks';
import type { KpaDocument, KpaTagToken } from './ast';

export interface KpaBlockDiagnostic {
  code?: number | string;
  data?: unknown;
  message: string;
  range: {
    line: number;
    startChar: number;
    endChar: number;
  };
}

export function collectBlockDiagnosticsFromDocument(
  document: KpaDocument,
  knownBlocks: readonly string[] = supportedKpaBlocks,
): KpaBlockDiagnostic[] {
  const diagnostics: KpaBlockDiagnostic[] = [];
  const stack: KpaTagToken[] = [];
  const knownBlockSet = new Set(knownBlocks);

  for (const tag of document.tags) {
    if (!knownBlockSet.has(tag.name)) {
      continue;
    }

    if (!tag.isClosing) {
      stack.push(tag);
      continue;
    }

    const lastOpenTag = stack[stack.length - 1];

    if (!lastOpenTag) {
      diagnostics.push({
        range: {
          line: tag.range.start.line,
          startChar: tag.range.start.character,
          endChar: tag.range.end.character,
        },
        message: `Schliessender Block [/${tag.name}] gefunden, ohne dass er vorher geoeffnet wurde.`,
      });
      continue;
    }

    if (lastOpenTag.name !== tag.name) {
      diagnostics.push({
        range: {
          line: tag.range.start.line,
          startChar: tag.range.start.character,
          endChar: tag.range.end.character,
        },
        message: `Erwarteter schliessender Block [/${lastOpenTag.name}] wurde nicht gefunden. Stattdessen [/${tag.name}] verwendet.`,
      });
      continue;
    }

    stack.pop();
  }

  while (stack.length > 0) {
    const unclosedTag = stack.pop();

    if (!unclosedTag) {
      continue;
    }

    diagnostics.push({
      range: {
        line: unclosedTag.range.start.line,
        startChar: unclosedTag.range.start.character,
        endChar: unclosedTag.range.end.character,
      },
      message: `Der Block [${unclosedTag.name}] wurde nicht geschlossen. Erwartet [/${unclosedTag.name}].`,
    });
  }

  return diagnostics;
}
