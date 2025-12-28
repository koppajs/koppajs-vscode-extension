// src/utils/blockUtils.ts

import * as vscode from 'vscode';

/**
 * Erkennt, ob sich der Cursor aktuell in einem der übergebenen Koppa-Blöcke befindet.
 */
export function isCursorInSpecificBlock(
  document: vscode.TextDocument,
  position: vscode.Position,
  koppaBlocks: string[]
): boolean {
  const textUntilPosition = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

  return koppaBlocks.some((block) => {
    const openTag = `[${block}]`;
    const closeTag = `[/${block}]`;
    const openIndex = textUntilPosition.lastIndexOf(openTag);
    const closeIndex = textUntilPosition.lastIndexOf(closeTag);
    return openIndex > closeIndex;
  });
}

/**
 * Optional: Prüft das gesamte Dokument auf unvollständige Blöcke.
 * Könntest du z. B. nutzen, um Warnungen anzuzeigen.
 */
export function findUnclosedBlocks(document: vscode.TextDocument, knownBlocks: string[]): string[] {
  // Primitive Variante: Wir schauen einfach, ob es pro blockName genau so viele Open- wie Close-Tags gibt
  // und sammeln die, die nicht übereinstimmen.

  const text = document.getText();

  const unclosed: string[] = [];

  for (const block of knownBlocks) {
    const openTag = `[${block}]`;
    const closeTag = `[/${block}]`;

    // Zähle, wie oft openTag und closeTag vorkommen
    const openCount = (text.match(new RegExp(`\\${openTag}`, 'g')) || []).length;
    const closeCount = (text.match(new RegExp(`\\${closeTag}`, 'g')) || []).length;

    if (openCount > closeCount) {
      unclosed.push(block);
    }
  }

  return unclosed;
}
