import * as vscode from 'vscode';
import { collectBlockDiagnostics } from './diagnosticsEngine';

export const kpaDiagnosticCollection =
  vscode.languages.createDiagnosticCollection('kpa-diagnostics');

const diagnosticSource = 'koppa-diagnostics';

export function updateDiagnostics(document: vscode.TextDocument): void {
  if (document.languageId !== 'kpa') {
    return;
  }

  const diagnostics = collectBlockDiagnostics(document.getText()).map(
    ({ message, range }) =>
      new vscode.Diagnostic(
        new vscode.Range(range.line, range.startChar, range.line, range.endChar),
        message,
        vscode.DiagnosticSeverity.Warning,
      ),
  );

  diagnostics.forEach((diagnostic) => {
    diagnostic.source = diagnosticSource;
  });

  kpaDiagnosticCollection.set(document.uri, diagnostics);
}
