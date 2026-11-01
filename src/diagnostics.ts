import * as vscode from 'vscode';
import { collectKpaDiagnostics } from './diagnosticsEngine';

export const kpaDiagnosticCollection =
  vscode.languages.createDiagnosticCollection('kpa-diagnostics');

const diagnosticSource = 'koppa-diagnostics';

export function updateDiagnostics(document: vscode.TextDocument): void {
  if (document.languageId !== 'kpa') {
    return;
  }

  const diagnostics = collectKpaDiagnostics(
    document.getText(),
    undefined,
    document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
  )
    .filter(
      ({ code, message }) => code === undefined && message.startsWith('Local template symbol ['),
    )
    .map(({ code, data, message, range }) => {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(range.line, range.startChar, range.line, range.endChar),
        message,
        vscode.DiagnosticSeverity.Warning,
      );
      const diagnosticWithData = diagnostic as vscode.Diagnostic & { data?: unknown };

      diagnostic.code = code;
      diagnosticWithData.data = data;
      return diagnostic;
    });

  diagnostics.forEach((diagnostic) => {
    diagnostic.source = diagnosticSource;
  });

  kpaDiagnosticCollection.set(document.uri, diagnostics);
}
