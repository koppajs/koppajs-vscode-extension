import * as vscode from 'vscode';
import { registerBlockProvider } from './providers/blockProvider';
import { registerHtmlTagProvider } from './providers/htmlTagProvider';
import { registerHtmlAttributeProvider } from './providers/htmlAttributeProvider';
import { updateDiagnostics, kpaDiagnosticCollection } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
  registerBlockProvider(context);
  registerHtmlTagProvider(context);
  registerHtmlAttributeProvider(context);

  kpaDiagnosticCollection.clear();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === 'kpa') {
        updateDiagnostics(doc);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'kpa') {
        updateDiagnostics(event.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'kpa') {
        updateDiagnostics(editor.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      kpaDiagnosticCollection.delete(document.uri);
    }),
  );

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument?.languageId === 'kpa') {
    updateDiagnostics(activeDocument);
  }

  console.log('Koppa Extension ist aktiviert.');
}

export function deactivate() {
  kpaDiagnosticCollection.dispose();
  console.log('Koppa Extension wurde deaktiviert.');
}
