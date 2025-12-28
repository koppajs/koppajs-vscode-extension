// src/diagnostics.ts

import * as vscode from 'vscode';

/**
 * Sammlung für alle Diagnosen in .kpa-Dateien.
 * Wird in extension.ts genutzt, um Meldungen zu setzen oder zu leeren.
 */
export const kpaDiagnosticCollection = vscode.languages.createDiagnosticCollection('kpa-diagnostics');

/**
 * Definiert alle bekannten Koppa-Blöcke.
 * Falls du weitere Blöcke hast (z. B. [layout], [router]), hier ergänzen.
 */
const KNOWN_BLOCKS = ['template', 'ts', 'js', 'css', 'sass', 'scss'];

/**
 * Parse- und Diagnose-Funktion:
 * - Sucht in einem .kpa-Dokument nach öffnenden ([block]) und schließenden ([/block]) Tags.
 * - Erzeugt Warnungen, wenn:
 *   1) Ein schließender Block ohne zugehörigen öffnenden Block gefunden wird ([/js] ohne [js]).
 *   2) Ein schließender Block nicht zum zuletzt geöffneten Block passt (z. B. [template] ... [/css]).
 *   3) Am Ende ein geöffneter Block nicht geschlossen wurde (z. B. [template] ohne [/template]).
 */
export function updateDiagnostics(document: vscode.TextDocument): void {
  // Wir wollen nur in Dateien arbeiten, die als Sprache 'kpa' registriert sind.
  if (document.languageId !== 'kpa') {
    return;
  }

  // Lokaler Stack zum Nachverfolgen offener Blöcke
  type BlockStackItem = {
    blockName: string;
    line: number;
    startChar: number;
  };
  const stack: BlockStackItem[] = [];

  // Hier sammeln wir alle Diagnosen (Warnungen, Fehler usw.), 
  // die wir später in die Collection eintragen werden.
  const diagnostics: vscode.Diagnostic[] = [];

  // RegEx für öffnende und schließende Tags.
  // [blockName], z. B. [template], und [/blockName], z. B. [/template].
  // Du kannst hier (a-zA-Z0-9) erweitern, wenn du mehr erlauben willst.
  const openTagRegex = /\[([a-zA-Z0-9]+)\]/g;
  const closeTagRegex = /\[\/([a-zA-Z0-9]+)\]/g;

  // Dokument Zeile für Zeile durchgehen
  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const lineText = document.lineAt(lineIndex).text;

    // 1) Öffnende Tags ([block])
    let match: RegExpExecArray | null;
    while ((match = openTagRegex.exec(lineText)) !== null) {
      const blockName = match[1];
      // Nur berücksichtigen, wenn es ein bekannter Block ist
      if (KNOWN_BLOCKS.includes(blockName)) {
        stack.push({
          blockName,
          line: lineIndex,
          startChar: match.index
        });
      }
    }

    // 2) Schließende Tags ([/block])
    while ((match = closeTagRegex.exec(lineText)) !== null) {
      const blockName = match[1];
      // Schauen wir, ob das oberste Element auf dem Stack passt
      const last = stack[stack.length - 1];

      if (!KNOWN_BLOCKS.includes(blockName)) {
        // Falls ein unbekannter Block geschlossen wird, kannst du hier ggf. 
        // auch eine Diagnose ausgeben. Lassen wir hier aber weg.
        continue;
      }

      if (!last) {
        // Stack ist leer, aber wir haben [/block] gefunden -> passt nicht
        const range = new vscode.Range(
          lineIndex,
          match.index,
          lineIndex,
          match.index + match[0].length
        );
        diagnostics.push({
          severity: vscode.DiagnosticSeverity.Warning,
          range,
          message: `Schließender Block [/${blockName}] gefunden, ohne dass er vorher geöffnet wurde.`,
          source: 'koppa-diagnostics'
        });
      } else if (last.blockName !== blockName) {
        // Mismatch, z. B. [template] ... [/css]
        const range = new vscode.Range(
          lineIndex,
          match.index,
          lineIndex,
          match.index + match[0].length
        );
        diagnostics.push({
          severity: vscode.DiagnosticSeverity.Warning,
          range,
          message: `Erwarteter schließender Block [/${last.blockName}] wurde nicht gefunden. Stattdessen [/${blockName}] verwendet.`,
          source: 'koppa-diagnostics'
        });
      } else {
        // Alles gut, wir haben den passenden offenen Block -> Stack bereinigen
        stack.pop();
      }
    }
  }

  // 3) Am Ende: Alles, was noch auf dem Stack liegt, ist unvollständig
  while (stack.length > 0) {
    const unclosedBlock = stack.pop();
    if (!unclosedBlock) { 
      continue; 
    }

    const range = new vscode.Range(
      unclosedBlock.line,
      unclosedBlock.startChar,
      unclosedBlock.line,
      unclosedBlock.startChar + unclosedBlock.blockName.length + 2 // +2 für '[' und ']'
    );

    diagnostics.push({
      severity: vscode.DiagnosticSeverity.Warning,
      range,
      message: `Der Block [${unclosedBlock.blockName}] wurde nicht geschlossen. Erwartet [/ ${unclosedBlock.blockName}].`,
      source: 'koppa-diagnostics'
    });
  }

  // 4) Setze alle gesammelten Diagnosen in unsere DiagnosticCollection.
  kpaDiagnosticCollection.set(document.uri, diagnostics);
}
