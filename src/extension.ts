// src/extension.ts

import * as vscode from 'vscode';
import { registerBlockProvider } from './providers/blockProvider';
import { registerHtmlTagProvider } from './providers/htmlTagProvider';
import { registerHtmlAttributeProvider } from './providers/htmlAttributeProvider';
import { updateDiagnostics, kpaDiagnosticCollection } from './diagnostics';

/**
 * Diese Funktion wird aufgerufen, wenn die Extension aktiviert wird.
 * Hier registrieren wir unsere Provider und richten das Diagnostic-System ein.
 */
export function activate(context: vscode.ExtensionContext) {
  // 1) Registriere die verschiedenen Completion Provider
  registerBlockProvider(context);
  registerHtmlTagProvider(context);
  registerHtmlAttributeProvider(context);

  // 2) Collection leeren oder neu initialisieren, falls schon einmal vorhanden
  kpaDiagnosticCollection.clear();

  // 3) Diagnosen bei allen relevanten Editor-/Dokument-Events aktualisieren

  // Event: Wenn ein Dokument (z. B. eine .kpa-Datei) geöffnet wird
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === 'kpa') {
        updateDiagnostics(doc);
      }
    })
  );

  // Event: Wenn das Dokument sich ändert (Tastatureingaben, Einfügen, Löschen ...)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'kpa') {
        updateDiagnostics(event.document);
      }
    })
  );

  // Event: Wenn der User ein anderes Dokument aktiv in den Editor nimmt
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'kpa') {
        updateDiagnostics(editor.document);
      }
    })
  );

  // Optional könnte man auch onDidSaveTextDocument oder onDidCloseTextDocument nutzen,
  // falls man nur oder zusätzlich beim Speichern/Schließen prüfen möchte.

  console.log('Koppa Extension ist aktiviert.');
}

/**
 * Diese Funktion wird aufgerufen, wenn die Extension deaktiviert wird.
 * Hier können z. B. Ressourcen aufgeräumt werden.
 */
export function deactivate() {
  // Wir geben unsere DiagnosticCollection wieder frei,
  // damit keine veralteten Meldungen im Editor stehenbleiben.
  kpaDiagnosticCollection.dispose();
  console.log('Koppa Extension wurde deaktiviert.');
}
